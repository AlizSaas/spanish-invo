import { Hono } from 'hono'
import { createOpenAI } from '@ai-sdk/openai'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from 'ai'
import { and, eq, gt, sql } from 'drizzle-orm'
import { buildInstructions } from '../ai/instructions'
import { createInvoiceTools } from '../ai/tools'
import type { UIMessage } from 'ai'
import type { WorkerEnv } from '../types'
import type { Database } from '@/db'
import type { JsonValue } from '@/db/schema'
import { getDb } from '@/db'
import { aiConversations, aiMessages, settings } from '@/db/schema'
import { refreshOverdue } from '@/data/documents/helpers'
import { AI_MESSAGES_PER_HOUR } from '@/lib/constants'
import { FREE_LIMITS, getActivePlan } from '@/lib/plan'
import { reindexUserDocuments } from '@/services/vectors'

const MAX_HISTORY = 30
/** Per message, text parts only. Tool results are produced server-side. */
const MAX_MESSAGE_CHARS = 4000
const DEFAULT_MODEL = 'gpt-5-mini'
const CONVERSATION_ID = /^[A-Za-z0-9_-]{8,64}$/

interface ChatBody {
  id?: string
  messages: Array<UIMessage>
  locale?: 'es' | 'en'
}

export const chatRoute = new Hono<WorkerEnv>()

function textLength(message: UIMessage): number {
  return message.parts.reduce(
    (n, p) => n + (p.type === 'text' ? p.text.length : 0),
    0,
  )
}

function titleFrom(message: UIMessage | undefined): string | null {
  const text = message?.parts
    .flatMap((p) => (p.type === 'text' ? [p.text] : []))
    .join(' ')
    .trim()
  return text ? text.slice(0, 80) : null
}

async function saveMessage(
  db: Database,
  conversationId: string,
  message: UIMessage,
) {
  const parts = message.parts as unknown as Array<JsonValue>
  // Message ids come from the client: only store user/assistant turns, and only
  // update an existing row when it belongs to this same conversation.
  const role = message.role === 'assistant' ? 'assistant' : 'user'
  await db
    .insert(aiMessages)
    .values({ id: message.id, conversationId, role, parts })
    .onConflictDoUpdate({
      target: aiMessages.id,
      set: { parts },
      setWhere: eq(aiMessages.conversationId, conversationId),
    })
  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId))
}

chatRoute.post('/chat', async (c) => {
  const env = c.env
  const apiKey = env.OPENAIAPIKEY
  if (!apiKey) {
    return c.json(
      { error: 'NOT_CONFIGURED', message: 'OPENAIAPIKEY is not set' },
      503,
    )
  }

  const user = c.get('user')
  const db = getDb()
  const body = await c.req.json<ChatBody>()
  const locale = body.locale === 'en' ? 'en' : 'es'
  // Clients may only replay user/assistant turns: a "system" turn would
  // override the server instructions. Cap text so one request can't carry a novel.
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_HISTORY)
  if (history.some((m) => textLength(m) > MAX_MESSAGE_CHARS)) {
    return c.json({ error: 'MESSAGE_TOO_LONG' }, 413)
  }
  const lastUser = [...history].reverse().find((m) => m.role === 'user')

  // Every chat belongs to a conversation (the client always sends an id). That
  // keeps history server-side and lets the hourly budget count real turns.
  const conversationId =
    body.id && CONVERSATION_ID.test(body.id) ? body.id : null
  if (!conversationId) return c.json({ error: 'BAD_REQUEST' }, 400)

  const existing = await db.query.aiConversations.findFirst({
    where: eq(aiConversations.id, conversationId),
    columns: { userId: true },
  })
  if (existing && existing.userId !== user.id) {
    return c.json({ error: 'FORBIDDEN' }, 403)
  }

  // Per-account budget: the assistant runs on our OpenAI key.
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const usedThisHour = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiMessages)
    .innerJoin(
      aiConversations,
      eq(aiMessages.conversationId, aiConversations.id),
    )
    .where(
      and(
        eq(aiConversations.userId, user.id),
        eq(aiMessages.role, 'user'),
        gt(aiMessages.createdAt, since),
      ),
    )
    .then((rows) => rows.reduce((n, r) => n + r.n, 0))
  if (usedThisHour >= AI_MESSAGES_PER_HOUR) {
    return c.json({ error: 'RATE_LIMITED' }, 429)
  }

  // Free plan: a small monthly allowance; Pro is unlimited (within the hourly cap).
  const { plan } = await getActivePlan(db, user.id)
  if (plan === 'free') {
    const usedThisMonth = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(aiMessages)
      .innerJoin(
        aiConversations,
        eq(aiMessages.conversationId, aiConversations.id),
      )
      .where(
        and(
          eq(aiConversations.userId, user.id),
          eq(aiMessages.role, 'user'),
          sql`${aiMessages.createdAt} >= date_trunc('month', now())`,
        ),
      )
      .then((rows) => rows.reduce((n, r) => n + r.n, 0))
    if (usedThisMonth >= FREE_LIMITS.aiQuestionsPerMonth) {
      return c.json({ error: 'PLAN_LIMIT' }, 402)
    }
  }

  if (!existing) {
    await db
      .insert(aiConversations)
      .values({
        id: conversationId,
        userId: user.id,
        title: titleFrom(lastUser),
      })
      .onConflictDoNothing()
  }
  if (lastUser) await saveMessage(db, conversationId, lastUser)

  // Keep statuses honest before the model reads them.
  await refreshOverdue(db, user.id)
  const s = await db.query.settings.findFirst({
    where: eq(settings.userId, user.id),
  })

  const openai = createOpenAI({ apiKey })
  const modelId = (env.OPENAI_MODEL as string | undefined) || DEFAULT_MODEL
  const isReasoningModel = /^(gpt-5|o\d)/.test(modelId)

  const result = streamText({
    model: openai(modelId),
    instructions: buildInstructions({
      settings: s,
      ownerName: user.name,
      locale,
    }),
    messages: await convertToModelMessages(history),
    tools: createInvoiceTools({
      db,
      env,
      userId: user.id,
      settings: s,
      baseUrl: env.BETTER_AUTH_URL.replace(/\/$/, ''),
    }),
    stopWhen: isStepCount(6),
    // Fast first token for the chat use case; reasoning models default to "medium".
    providerOptions: isReasoningModel
      ? { openai: { reasoningEffort: 'low', reasoningSummary: null } }
      : undefined,
    onError: ({ error }) => {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'ai chat',
          error: String(error),
        }),
      )
    },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: history,
      generateMessageId: () => crypto.randomUUID(),
      onFinish: ({ responseMessage }) => {
        // The client may disconnect right after the last chunk; keep the write alive.
        c.executionCtx.waitUntil(
          saveMessage(db, conversationId, responseMessage).catch(
            (err: unknown) => {
              console.error(
                JSON.stringify({
                  level: 'error',
                  msg: 'ai persist',
                  error: err instanceof Error ? err.message : String(err),
                }),
              )
            },
          ),
        )
      },
    }),
  })
})

/** Backfill / repair the semantic index for the signed-in owner. */
chatRoute.post('/reindex', async (c) => {
  const user = c.get('user')
  // Re-embedding every document costs Workers AI neurons: once per 10 minutes.
  const key = `reindex:${user.id}`
  if (await c.env.KV.get(key)) return c.json({ error: 'RATE_LIMITED' }, 429)
  await c.env.KV.put(key, '1', { expirationTtl: 600 })
  const indexed = await reindexUserDocuments(c.env, getDb(), user.id)
  return c.json({ indexed })
})

/** Delete one conversation (also available as a server function). */
chatRoute.delete('/conversations/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  await getDb()
    .delete(aiConversations)
    .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, user.id)))
  return c.json({ ok: true })
})

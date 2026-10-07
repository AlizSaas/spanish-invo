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
import { canCreateDocument, createInvoiceTools } from '../ai/tools'
import type { UIMessage } from 'ai'
import type { SQL } from 'drizzle-orm'
import type { WorkerEnv } from '../types'
import type { Database } from '@/db'
import type { JsonValue } from '@/db/schema'
import { getDb } from '@/db'
import { aiConversations, aiMessages, aiUsage, settings } from '@/db/schema'
import { refreshOverdue } from '@/data/documents/helpers'
import { AI_MESSAGES_PER_HOUR } from '@/lib/constants'
import { errorForLog } from '@/lib/log'
import { FREE_LIMITS, getActivePlan } from '@/lib/plan'
import { allowUser } from '@/lib/rate-limit'
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

/**
 * Per-account budget (the assistant runs on our OpenAI key): an hourly cap for
 * everyone, plus a small monthly allowance on Free. Counts rows in ai_usage,
 * which chat deletes and message-id replays can't touch.
 *
 * A new question needs room in the budget. Finishing an approved write doesn't,
 * so nobody is stopped halfway through an invoice, but every model run counts
 * toward a hard ceiling of twice the budget.
 */
async function checkQuota(
  db: Database,
  userId: string,
  continuation: boolean,
): Promise<'hour' | 'month' | null> {
  const runs = (since: SQL) =>
    db
      .select({
        questions: sql<number>`(count(*) filter (where not ${aiUsage.continuation}))::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), since))
      // An aggregate without GROUP BY always returns exactly one row.
      .then(([row]) => row)
  const fits = (used: { questions: number; total: number }, limit: number) =>
    continuation ? used.total < limit * 2 : used.questions < limit

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (!fits(await runs(gt(aiUsage.createdAt, hourAgo)), AI_MESSAGES_PER_HOUR)) {
    return 'hour'
  }
  const { plan } = await getActivePlan(db, userId)
  if (
    plan === 'free' &&
    !fits(
      await runs(sql`${aiUsage.createdAt} >= date_trunc('month', now())`),
      FREE_LIMITS.aiQuestionsPerMonth,
    )
  ) {
    return 'month'
  }
  return null
}

/**
 * What the model may see from the client. People send text only: a file part
 * would make OpenAI (or this Worker) fetch whatever URL the client names. The
 * assistant's own turns keep their text and tool parts.
 */
function clientMessage(message: UIMessage): UIMessage {
  const parts = message.parts.filter((p) =>
    message.role === 'user'
      ? p.type === 'text' && typeof p.text === 'string'
      : p.type !== 'file' && !p.type.startsWith('source-'),
  )
  return { ...message, parts }
}

chatRoute.post('/chat', async (c) => {
  const env = c.env
  const apiKey = env.OPENAIAPIKEY
  if (!apiKey) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'ai chat: OPENAIAPIKEY is not set',
      }),
    )
    return c.json({ error: 'NOT_CONFIGURED' }, 503)
  }

  const user = c.get('user')
  // Burst cap per account; ai_usage below is the real budget.
  if (!(await allowUser(env, 'ai', user.id))) {
    return c.json({ error: 'RATE_LIMITED' }, 429)
  }
  const db = getDb()
  const body = await c.req.json<ChatBody>()
  const locale = body.locale === 'en' ? 'en' : 'es'
  // Clients may only replay user/assistant turns: a "system" turn would
  // override the server instructions. Cap text so one request can't carry a novel.
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.id === 'string' &&
        Array.isArray(m.parts),
    )
    .slice(-MAX_HISTORY)
    .map(clientMessage)
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

  // Approving or cancelling a confirmation card resubmits the conversation to
  // finish the same turn. It isn't a new question if we really asked for
  // approval and this request carries the answer; it still counts as a run.
  const lastMessage = history.at(-1)
  const isApprovalContinuation =
    existing !== undefined &&
    lastMessage?.role === 'assistant' &&
    lastMessage.parts.some(
      (p) => 'state' in p && p.state === 'approval-responded',
    ) &&
    (await db.query.aiMessages.findFirst({
      where: and(
        eq(aiMessages.id, lastMessage.id),
        eq(aiMessages.conversationId, conversationId),
        eq(aiMessages.role, 'assistant'),
        sql`${aiMessages.parts} @> '[{"state":"approval-requested"}]'::jsonb`,
      ),
      columns: { id: true },
    })) !== undefined

  const limited = await checkQuota(db, user.id, isApprovalContinuation)
  if (limited === 'hour') return c.json({ error: 'RATE_LIMITED' }, 429)
  if (limited === 'month') return c.json({ error: 'PLAN_LIMIT' }, 402)
  await db
    .insert(aiUsage)
    .values({ userId: user.id, continuation: isApprovalContinuation })

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
    // Writes wait for the owner's OK on a confirmation card. Over the Free
    // allowance there is nothing to approve: the tool answers "plan_limit"
    // straight away and the card offers the upgrade instead.
    toolApproval: {
      createClient: 'user-approval',
      createDocument: async ({ type }) =>
        (await canCreateDocument({ db, userId: user.id }, type))
          ? 'user-approval'
          : 'not-applicable',
    },
    // Signs each approval request so a client can't forge or edit an approval.
    experimental_toolApprovalSecret: `ai-tool-approval:${env.BETTER_AUTH_SECRET}`,
    stopWhen: isStepCount(6),
    // Per step, reasoning included: bounds what one run can cost.
    maxOutputTokens: 4000,
    // Fast first token for the chat use case; reasoning models default to "medium".
    providerOptions: isReasoningModel
      ? { openai: { reasoningEffort: 'low', reasoningSummary: null } }
      : undefined,
    onError: ({ error }) => {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'ai chat',
          // Tool errors can be DB errors whose values are client/invoice data.
          ...errorForLog(error),
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
                  ...errorForLog(err),
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

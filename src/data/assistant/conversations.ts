import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { aiConversations, aiMessages } from '@/db/schema'
import { authMiddleware } from '@/middlewares/dependencies'

const idSchema = z.object({ id: z.string().min(8).max(64) })

export const listConversationsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context
    return db.query.aiConversations.findMany({
      where: eq(aiConversations.userId, user.id),
      orderBy: desc(aiConversations.updatedAt),
      limit: 30,
      columns: { id: true, title: true, updatedAt: true },
    })
  })

export const getConversationFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(idSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const conversation = await db.query.aiConversations.findFirst({
      where: and(
        eq(aiConversations.id, data.id),
        eq(aiConversations.userId, user.id),
      ),
      with: {
        messages: {
          orderBy: asc(aiMessages.createdAt),
          columns: { id: true, role: true, parts: true },
        },
      },
    })
    if (!conversation) throw new Error('NOT_FOUND')
    return conversation
  })

export const deleteConversationFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(idSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    await db
      .delete(aiConversations)
      .where(
        and(
          eq(aiConversations.id, data.id),
          eq(aiConversations.userId, user.id),
        ),
      )
    return { ok: true }
  })

export const conversationKeys = {
  all: ['ai-conversations'] as const,
  detail: (id: string) => ['ai-conversations', id] as const,
}

export const conversationsQuery = () =>
  queryOptions({
    queryKey: conversationKeys.all,
    queryFn: () => listConversationsFn(),
    staleTime: 10_000,
  })

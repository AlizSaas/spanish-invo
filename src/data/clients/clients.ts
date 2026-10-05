import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm'
import { clients, invoices } from '@/db/schema'
import { authMiddleware } from '@/middlewares/dependencies'
import {
  clientIdSchema,
  clientInputSchema,
  listClientsSchema,
  setClientArchivedSchema,
  updateClientSchema,
} from '@/lib/validators/clients'

export const listClientsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listClientsSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const pattern = data.q ? `%${data.q}%` : null

    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
        company: clients.company,
        preferredLanguage: clients.preferredLanguage,
        archived: clients.archived,
        createdAt: clients.createdAt,
        documentCount: count(invoices.id),
      })
      .from(clients)
      .leftJoin(invoices, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(clients.userId, user.id),
          data.includeArchived ? undefined : eq(clients.archived, false),
          pattern
            ? or(
                ilike(clients.name, pattern),
                ilike(clients.company, pattern),
                ilike(clients.phone, pattern),
                ilike(clients.email, pattern),
              )
            : undefined,
        ),
      )
      .groupBy(clients.id)
      .orderBy(asc(clients.archived), asc(clients.name))
      .limit(500)

    return rows
  })

export const getClientFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(clientIdSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, data.id), eq(clients.userId, user.id)),
      with: {
        invoices: {
          orderBy: desc(invoices.createdAt),
          limit: 100,
          columns: {
            id: true,
            type: true,
            invoiceNumber: true,
            status: true,
            total: true,
            currency: true,
            issueDate: true,
            dueDate: true,
          },
        },
      },
    })
    if (!client) throw new Error('NOT_FOUND')
    return client
  })

export const createClientFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(clientInputSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const [created] = await db
      .insert(clients)
      .values({ ...data, userId: user.id })
      .returning()
    return created
  })

export const updateClientFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(updateClientSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const updated = (
      await db
        .update(clients)
        .set(data.data)
        .where(and(eq(clients.id, data.id), eq(clients.userId, user.id)))
        .returning()
    ).at(0)
    if (!updated) throw new Error('NOT_FOUND')
    return updated
  })

export const setClientArchivedFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(setClientArchivedSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const updated = (
      await db
        .update(clients)
        .set({ archived: data.archived })
        .where(and(eq(clients.id, data.id), eq(clients.userId, user.id)))
        .returning()
    ).at(0)
    if (!updated) throw new Error('NOT_FOUND')
    return updated
  })

export const deleteClientFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(clientIdSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const [{ n }] = await db
      .select({ n: count() })
      .from(invoices)
      .where(and(eq(invoices.clientId, data.id), eq(invoices.userId, user.id)))
    if (n > 0) throw new Error('CLIENT_HAS_DOCUMENTS')

    const deleted = await db
      .delete(clients)
      .where(and(eq(clients.id, data.id), eq(clients.userId, user.id)))
      .returning({ id: clients.id })
    if (deleted.length === 0) throw new Error('NOT_FOUND')
    return { ok: true }
  })

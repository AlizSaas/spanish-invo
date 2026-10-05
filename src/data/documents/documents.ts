import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gt, ilike, inArray, or, sql } from 'drizzle-orm'
import {
  getOrCreatePublicToken,
  insertDocument,
  logEvent,
  refreshOverdue,
} from './helpers'
import {
  clients,
  invoiceEvents,
  invoiceItems,
  invoicePublicTokens,
  invoices,
  settings,
} from '@/db/schema'
import { authMiddleware } from '@/middlewares/dependencies'
import { SMS_DAILY_LIMIT, SMS_MAX_CHARS } from '@/lib/constants'
import {
  addDays,
  dateOnlyToDb,
  dbToDateOnly,
  isPastDue,
  todayDateOnly,
} from '@/lib/dates'
import { computeTotals, money } from '@/lib/invoice-math'
import { fill, getDictionary } from '@/lib/i18n'
import { formatCurrency, formatDate, toWhatsAppNumber } from '@/lib/utils'
import {
  documentIdSchema,
  documentInputSchema,
  listDocumentsSchema,
  markPaidSchema,
  prepareShareSchema,
  recordShareSchema,
  updateDocumentSchema,
} from '@/lib/validators/documents'
import { isSmsConfigured, sendSms } from '@/services/sms'
import { tryIndexDocument, tryRemoveDocumentVector } from '@/services/vectors'

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const listDocumentsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(listDocumentsSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    if (data.type === 'invoice') await refreshOverdue(db, user.id)

    const pattern = data.q ? `%${data.q}%` : null
    const matchingClients = pattern
      ? db
          .select({ id: clients.id })
          .from(clients)
          .where(and(eq(clients.userId, user.id), ilike(clients.name, pattern)))
      : null

    return db.query.invoices.findMany({
      where: and(
        eq(invoices.userId, user.id),
        eq(invoices.type, data.type),
        data.status ? eq(invoices.status, data.status) : undefined,
        data.clientId ? eq(invoices.clientId, data.clientId) : undefined,
        pattern && matchingClients
          ? or(
              ilike(invoices.invoiceNumber, pattern),
              inArray(invoices.clientId, matchingClients),
            )
          : undefined,
      ),
      with: {
        client: {
          columns: { id: true, name: true, company: true, phone: true },
        },
      },
      orderBy: desc(invoices.createdAt),
      limit: data.limit ?? 200,
    })
  })

export const getDocumentFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(documentIdSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const doc = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, data.id), eq(invoices.userId, user.id)),
      with: {
        client: true,
        items: { orderBy: invoiceItems.sortOrder },
        events: { orderBy: desc(invoiceEvents.createdAt), limit: 50 },
        estimate: { columns: { id: true, invoiceNumber: true } },
        convertedInvoices: {
          columns: { id: true, invoiceNumber: true, status: true },
        },
      },
    })
    if (!doc) throw new Error('NOT_FOUND')

    // Loaded separately: a document has no public token until it is first shared,
    // and a relation keyed on the non-null invoice id would type it as always present.
    const publicToken =
      (await db.query.invoicePublicTokens.findFirst({
        where: eq(invoicePublicTokens.invoiceId, doc.id),
        columns: { token: true, createdAt: true },
      })) ?? null

    return { ...doc, publicToken }
  })

export type DocumentDetail = Awaited<ReturnType<typeof getDocumentFn>>
export type DocumentListItem = Awaited<
  ReturnType<typeof listDocumentsFn>
>[number]

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

async function assertOwnClient(
  db: Parameters<typeof refreshOverdue>[0],
  userId: string,
  clientId: string,
) {
  const c = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.userId, userId)),
    columns: { id: true },
  })
  if (!c) throw new Error('CLIENT_NOT_FOUND')
}

export const createDocumentFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(documentInputSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    await assertOwnClient(db, user.id, data.clientId)
    const doc = await db.transaction((tx) => insertDocument(tx, user.id, data))
    await tryIndexDocument(context.env, db, doc.id)
    return doc
  })

export const updateDocumentFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(updateDocumentSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const existing = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, data.id), eq(invoices.userId, user.id)),
      columns: { id: true, status: true, type: true },
    })
    if (!existing) throw new Error('NOT_FOUND')
    if (existing.status === 'paid' || existing.status === 'void')
      throw new Error('LOCKED')
    await assertOwnClient(db, user.id, data.data.clientId)

    const input = data.data
    const totals = computeTotals(
      input.items,
      input.discountType,
      input.discountValue,
    )

    const updated = await db.transaction(async (tx) => {
      const [doc] = await tx
        .update(invoices)
        .set({
          clientId: input.clientId,
          language: input.language,
          issueDate: dateOnlyToDb(input.issueDate),
          dueDate: dateOnlyToDb(input.dueDate),
          currency: input.currency,
          subtotal: money(totals.subtotal),
          taxTotal: money(totals.taxTotal),
          discountType: input.discountType ?? null,
          discountValue:
            input.discountValue != null ? money(input.discountValue) : null,
          discountAmount: money(totals.discountAmount),
          total: money(totals.total),
          depositAmount:
            existing.type === 'estimate' && input.depositAmount
              ? money(input.depositAmount)
              : null,
          notes: input.notes || null,
          paymentInstructionsOverride:
            input.paymentInstructionsOverride || null,
        })
        .where(eq(invoices.id, data.id))
        .returning()

      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, data.id))
      await tx.insert(invoiceItems).values(
        input.items.map((it, i) => ({
          invoiceId: data.id,
          description: it.description,
          quantity: money(it.quantity),
          unitPrice: money(it.unitPrice),
          taxRate: it.taxRate != null ? money(it.taxRate) : null,
          amount: money(totals.itemAmounts[i]),
          sortOrder: i,
        })),
      )
      await logEvent(tx, data.id, 'updated')
      return doc
    })
    await tryIndexDocument(context.env, db, data.id)
    return updated
  })

export const deleteDraftFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(documentIdSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const deleted = await db
      .delete(invoices)
      .where(
        and(
          eq(invoices.id, data.id),
          eq(invoices.userId, user.id),
          eq(invoices.status, 'draft'),
        ),
      )
      .returning({ id: invoices.id, type: invoices.type })
    if (deleted.length === 0) throw new Error('NOT_DRAFT')
    await tryRemoveDocumentVector(context.env, deleted[0].id)
    return deleted[0]
  })

export const voidDocumentFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(documentIdSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    return db.transaction(async (tx) => {
      const doc = (
        await tx
          .update(invoices)
          .set({ status: 'void' })
          .where(
            and(
              eq(invoices.id, data.id),
              eq(invoices.userId, user.id),
              inArray(invoices.status, ['draft', 'sent', 'viewed', 'overdue']),
            ),
          )
          .returning()
      ).at(0)
      if (!doc) throw new Error('CANNOT_VOID')
      await logEvent(tx, doc.id, 'voided')
      return doc
    })
  })

export const markPaidFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(markPaidSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const paidAt = data.paidAt ? dateOnlyToDb(data.paidAt) : new Date()
    return db.transaction(async (tx) => {
      const doc = (
        await tx
          .update(invoices)
          .set({ status: 'paid', paidAt, paymentMethod: data.paymentMethod })
          .where(
            and(
              eq(invoices.id, data.id),
              eq(invoices.userId, user.id),
              inArray(invoices.status, ['draft', 'sent', 'viewed', 'overdue']),
            ),
          )
          .returning()
      ).at(0)
      if (!doc) throw new Error('CANNOT_PAY')
      await logEvent(tx, doc.id, 'marked_paid', {
        paymentMethod: data.paymentMethod,
      })
      return doc
    })
  })

export const undoPaidFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(documentIdSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const existing = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, data.id),
        eq(invoices.userId, user.id),
        eq(invoices.status, 'paid'),
      ),
      columns: { id: true, dueDate: true, sentAt: true, type: true },
    })
    if (!existing) throw new Error('NOT_PAID')
    const status = !existing.sentAt
      ? 'draft'
      : existing.type === 'invoice' && isPastDue(existing.dueDate)
        ? 'overdue'
        : 'sent'
    return db.transaction(async (tx) => {
      const [doc] = await tx
        .update(invoices)
        .set({ status, paidAt: null, paymentMethod: null })
        .where(eq(invoices.id, data.id))
        .returning()
      await logEvent(tx, doc.id, 'updated', { undoPaid: true })
      return doc
    })
  })

/** Estimate → new draft invoice with the same items. The estimate is kept. */
export const convertEstimateFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(documentIdSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const est = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, data.id),
        eq(invoices.userId, user.id),
        eq(invoices.type, 'estimate'),
      ),
      with: { items: { orderBy: invoiceItems.sortOrder } },
    })
    if (!est) throw new Error('NOT_FOUND')
    const s = await db.query.settings.findFirst({
      where: eq(settings.userId, user.id),
    })
    const today = todayDateOnly()

    const created = await db.transaction(async (tx) => {
      const inv = await insertDocument(
        tx,
        user.id,
        {
          type: 'invoice',
          clientId: est.clientId,
          language: est.language,
          issueDate: today,
          dueDate: addDays(today, s?.defaultDueDays ?? 15),
          currency: est.currency as 'USD' | 'MXN',
          items: est.items.map((it) => ({
            description: it.description,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxRate: it.taxRate != null ? Number(it.taxRate) : null,
          })),
          discountType: est.discountType,
          discountValue:
            est.discountValue != null ? Number(est.discountValue) : null,
          notes: est.notes,
          paymentInstructionsOverride: est.paymentInstructionsOverride,
        },
        { estimateId: est.id },
      )
      await logEvent(tx, est.id, 'converted_to_invoice', { invoiceId: inv.id })
      return inv
    })
    await tryIndexDocument(context.env, db, created.id)
    return created
  })

/** Copy any document into a fresh draft of the same type (today's dates). */
export const duplicateDocumentFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(documentIdSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    const src = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, data.id), eq(invoices.userId, user.id)),
      with: { items: { orderBy: invoiceItems.sortOrder } },
    })
    if (!src) throw new Error('NOT_FOUND')
    const s = await db.query.settings.findFirst({
      where: eq(settings.userId, user.id),
    })
    const today = todayDateOnly()
    const copy = await db.transaction((tx) =>
      insertDocument(tx, user.id, {
        type: src.type,
        clientId: src.clientId,
        language: src.language,
        issueDate: today,
        dueDate: addDays(today, s?.defaultDueDays ?? 15),
        currency: src.currency as 'USD' | 'MXN',
        items: src.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          taxRate: it.taxRate != null ? Number(it.taxRate) : null,
        })),
        discountType: src.discountType,
        discountValue:
          src.discountValue != null ? Number(src.discountValue) : null,
        depositAmount:
          src.depositAmount != null ? Number(src.depositAmount) : null,
        notes: src.notes,
        paymentInstructionsOverride: src.paymentInstructionsOverride,
      }),
    )
    await tryIndexDocument(context.env, db, copy.id)
    return copy
  })

// ---------------------------------------------------------------------------
// Share (WhatsApp deep link / Twilio SMS / copy link)
// ---------------------------------------------------------------------------

/** Ensures the public link exists and returns everything the share dialog needs. */
export const prepareShareFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(prepareShareSchema)
  .handler(async ({ context, data }) => {
    const { db, user, env } = context
    const doc = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, data.id), eq(invoices.userId, user.id)),
      with: {
        client: {
          columns: { name: true, phone: true, preferredLanguage: true },
        },
      },
    })
    if (!doc) throw new Error('NOT_FOUND')
    const s = await db.query.settings.findFirst({
      where: eq(settings.userId, user.id),
    })

    const token = await getOrCreatePublicToken(db, doc.id)
    const publicUrl = `${env.BETTER_AUTH_URL.replace(/\/$/, '')}/i/${token}`

    // The customer-facing text follows the document's language, not the
    // owner's UI language; the dialog lets the owner override it per send.
    const language = data.language ?? doc.language
    const dict = getDictionary(language)
    const message = fill(dict.message[doc.type], {
      number: doc.invoiceNumber,
      business: s?.businessName ?? user.name,
      total: formatCurrency(doc.total, doc.currency, language),
      link: publicUrl,
      due: formatDate(doc.dueDate, {
        language,
        timezone: s?.timezone,
      }),
    })

    return {
      publicUrl,
      message,
      language,
      clientPhone: doc.client.phone,
      clientName: doc.client.name,
      smsConfigured: isSmsConfigured(env),
    }
  })

/** Records the share, moves draft → sent, and for SMS actually sends via Twilio. */
export const recordShareFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(recordShareSchema)
  .handler(async ({ context, data }) => {
    const { db, user, env } = context
    const doc = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, data.id), eq(invoices.userId, user.id)),
      with: { client: { columns: { phone: true } } },
    })
    if (!doc) throw new Error('NOT_FOUND')
    if (doc.status === 'void') throw new Error('CANNOT_SHARE_VOID')

    const token = await getOrCreatePublicToken(db, doc.id)
    const publicUrl = `${env.BETTER_AUTH_URL.replace(/\/$/, '')}/i/${token}`
    const message = data.message?.trim() || publicUrl

    let whatsappUrl: string | null = null
    if (data.channel === 'whatsapp') {
      if (!doc.client.phone) throw new Error('CLIENT_NO_PHONE')
      whatsappUrl = `https://wa.me/${toWhatsAppNumber(doc.client.phone)}?text=${encodeURIComponent(message)}`
    }
    if (data.channel === 'sms') {
      if (!doc.client.phone) throw new Error('CLIENT_NO_PHONE')
      // SMS leaves through our Twilio account, so every message must carry the
      // invoice link, stay short, and fit the account's daily budget.
      const body = message.includes(publicUrl)
        ? message
        : `${message}\n${publicUrl}`
      if (body.length > SMS_MAX_CHARS) throw new Error('SMS_TOO_LONG')
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const sentToday = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(invoiceEvents)
        .innerJoin(invoices, eq(invoiceEvents.invoiceId, invoices.id))
        .where(
          and(
            eq(invoices.userId, user.id),
            eq(invoiceEvents.eventType, 'sent_sms'),
            gt(invoiceEvents.createdAt, since),
          ),
        )
        .then((rows) => rows.reduce((n, r) => n + r.n, 0))
      if (sentToday >= SMS_DAILY_LIMIT) throw new Error('SMS_DAILY_LIMIT')
      await sendSms(env, { to: doc.client.phone, body })
    }

    await db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({
          status: doc.status === 'draft' ? 'sent' : doc.status,
          sentAt: doc.sentAt ?? new Date(),
        })
        .where(and(eq(invoices.id, doc.id), eq(invoices.userId, user.id)))
      const eventType =
        data.channel === 'whatsapp'
          ? 'sent_whatsapp'
          : data.channel === 'sms'
            ? 'sent_sms'
            : 'link_copied'
      await logEvent(tx, doc.id, eventType, { to: doc.client.phone ?? null })
    })

    return {
      publicUrl,
      whatsappUrl,
      message,
      dueDate: dbToDateOnly(doc.dueDate),
    }
  })

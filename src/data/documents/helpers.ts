import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import type { Database } from '@/db'
import type { EventMetadata } from '@/db/schema'
import type { DocumentType, InvoiceEventType } from '@/lib/constants'
import type { DocumentInput } from '@/lib/validators/documents'
import {
  invoiceEvents,
  invoiceItems,
  invoicePublicTokens,
  invoices,
  settings,
} from '@/db/schema'
import { dateOnlyToDb } from '@/lib/dates'
import { computeTotals, money } from '@/lib/invoice-math'
import { formatDocumentNumber, generateToken } from '@/lib/utils'

/** Transaction handle type for drizzle postgres-js */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
type DbOrTx = Database | Tx

/** Atomically reserve the next number for this document type. */
export async function nextDocumentNumber(
  tx: DbOrTx,
  userId: string,
  type: DocumentType,
) {
  const row = await tx
    .update(settings)
    .set(
      type === 'invoice'
        ? { nextInvoiceNumber: sql`${settings.nextInvoiceNumber} + 1` }
        : { nextEstimateNumber: sql`${settings.nextEstimateNumber} + 1` },
    )
    .where(eq(settings.userId, userId))
    .returning({
      invoicePrefix: settings.invoicePrefix,
      nextInvoiceNumber: settings.nextInvoiceNumber,
      estimatePrefix: settings.estimatePrefix,
      nextEstimateNumber: settings.nextEstimateNumber,
    })
    .then((rows) => rows.at(0))
  if (!row) throw new Error('SETTINGS_MISSING')
  return type === 'invoice'
    ? formatDocumentNumber(row.invoicePrefix, row.nextInvoiceNumber - 1)
    : formatDocumentNumber(row.estimatePrefix, row.nextEstimateNumber - 1)
}

/** Insert a document + items + "created" event. Totals are recomputed server-side. */
export async function insertDocument(
  tx: DbOrTx,
  userId: string,
  input: DocumentInput,
  extra: { estimateId?: string | null } = {},
) {
  const invoiceNumber = await nextDocumentNumber(tx, userId, input.type)
  const totals = computeTotals(
    input.items,
    input.discountType,
    input.discountValue,
  )

  const [doc] = await tx
    .insert(invoices)
    .values({
      userId,
      clientId: input.clientId,
      type: input.type,
      invoiceNumber,
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
        input.type === 'estimate' && input.depositAmount
          ? money(input.depositAmount)
          : null,
      notes: input.notes || null,
      paymentInstructionsOverride: input.paymentInstructionsOverride || null,
      estimateId: extra.estimateId ?? null,
    })
    .returning()

  await tx.insert(invoiceItems).values(
    input.items.map((it, i) => ({
      invoiceId: doc.id,
      description: it.description,
      quantity: money(it.quantity),
      unitPrice: money(it.unitPrice),
      taxRate: it.taxRate != null ? money(it.taxRate) : null,
      amount: money(totals.itemAmounts[i]),
      sortOrder: i,
    })),
  )

  await logEvent(
    tx,
    doc.id,
    'created',
    extra.estimateId ? { fromEstimateId: extra.estimateId } : undefined,
  )
  return doc
}

export async function logEvent(
  tx: DbOrTx,
  invoiceId: string,
  eventType: InvoiceEventType,
  metadata?: EventMetadata,
) {
  await tx
    .insert(invoiceEvents)
    .values({ invoiceId, eventType, metadata: metadata ?? null })
}

export async function getOrCreatePublicToken(tx: DbOrTx, invoiceId: string) {
  const existing = await tx.query.invoicePublicTokens.findFirst({
    where: eq(invoicePublicTokens.invoiceId, invoiceId),
  })
  if (existing) return existing.token
  const created = (
    await tx
      .insert(invoicePublicTokens)
      .values({ invoiceId, token: generateToken(24) })
      .onConflictDoNothing({ target: invoicePublicTokens.invoiceId })
      .returning()
  ).at(0)
  if (created) return created.token
  const row = await tx.query.invoicePublicTokens.findFirst({
    where: eq(invoicePublicTokens.invoiceId, invoiceId),
  })
  if (!row) throw new Error('TOKEN_MISSING')
  return row.token
}

/**
 * Flip this owner's sent/viewed invoices that are past due to `overdue`.
 * The daily cron does this globally; calling it on dashboard/list loads keeps
 * the UI honest between cron runs.
 */
export async function refreshOverdue(db: DbOrTx, userId: string) {
  await db
    .update(invoices)
    .set({ status: 'overdue' })
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.type, 'invoice'),
        inArray(invoices.status, ['sent', 'viewed']),
        lt(invoices.dueDate, sql`now() - interval '1 day'`),
      ),
    )
}

import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import type { Database } from '@/db'
import type { PublicDocument } from '@/lib/types'
import {
  invoiceItems,
  invoicePublicTokens,
  invoices,
  settings,
} from '@/db/schema'
import { publicMiddleware } from '@/middlewares/dependencies'
import { publicTokenSchema } from '@/lib/validators/documents'
import { logEvent } from '@/data/documents/helpers'

/** Shared by the public page server function and the PDF route. */
export async function loadPublicDocument(
  db: Database,
  token: string,
  opts: { recordView?: boolean; recordPdf?: boolean } = {},
): Promise<PublicDocument | null> {
  const t = await db.query.invoicePublicTokens.findFirst({
    where: and(
      eq(invoicePublicTokens.token, token),
      or(
        isNull(invoicePublicTokens.expiresAt),
        gt(invoicePublicTokens.expiresAt, new Date()),
      ),
    ),
    with: {
      invoice: {
        with: {
          client: true,
          items: { orderBy: invoiceItems.sortOrder },
        },
      },
    },
  })
  if (!t) return null
  const doc = t.invoice
  const s = await db.query.settings.findFirst({
    where: eq(settings.userId, doc.userId),
  })

  if (opts.recordView) {
    // First open flips sent → viewed; every open leaves a trace for the owner.
    if (doc.status === 'sent') {
      await db
        .update(invoices)
        .set({ status: 'viewed', viewedAt: doc.viewedAt ?? new Date() })
        .where(eq(invoices.id, doc.id))
      doc.status = 'viewed'
    } else if (!doc.viewedAt) {
      await db
        .update(invoices)
        .set({ viewedAt: new Date() })
        .where(eq(invoices.id, doc.id))
    }
    await logEvent(db, doc.id, 'viewed')
  }
  if (opts.recordPdf) {
    await logEvent(db, doc.id, 'pdf_downloaded')
  }

  return {
    id: doc.id,
    ownerId: doc.userId,
    updatedAt: doc.updatedAt.toISOString(),
    type: doc.type,
    number: doc.invoiceNumber,
    status: doc.status,
    language: doc.language,
    issueDate: doc.issueDate.toISOString(),
    dueDate: doc.dueDate.toISOString(),
    currency: doc.currency,
    subtotal: Number(doc.subtotal),
    taxTotal: Number(doc.taxTotal),
    discountType: doc.discountType,
    discountValue: doc.discountValue != null ? Number(doc.discountValue) : null,
    discountAmount: Number(doc.discountAmount),
    total: Number(doc.total),
    depositAmount: doc.depositAmount != null ? Number(doc.depositAmount) : null,
    notes: doc.notes,
    paymentInstructions:
      doc.paymentInstructionsOverride ?? s?.paymentInstructions ?? null,
    paidAt: doc.paidAt?.toISOString() ?? null,
    paymentMethod: doc.paymentMethod,
    items: doc.items.map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      taxRate: it.taxRate != null ? Number(it.taxRate) : null,
      amount: Number(it.amount),
    })),
    client: {
      name: doc.client.name,
      company: doc.client.company,
      address: doc.client.address,
      phone: doc.client.phone,
      email: doc.client.email,
    },
    business: {
      name: s?.businessName ?? null,
      phone: s?.businessPhone ?? null,
      email: s?.businessEmail ?? null,
      address: s?.businessAddress ?? null,
      logoUrl: s?.logoUrl ?? null,
      timezone: s?.timezone ?? 'America/Chicago',
    },
  }
}

export const getPublicDocumentFn = createServerFn({ method: 'GET' })
  .middleware([publicMiddleware])
  .validator(publicTokenSchema)
  .handler(async ({ context, data }) => {
    return loadPublicDocument(context.db, data.token, {
      recordView: !data.preview,
    })
  })

export const publicDocumentQuery = (token: string, preview = false) =>
  queryOptions({
    queryKey: ['public-document', token, preview] as const,
    queryFn: () => getPublicDocumentFn({ data: { token, preview } }),
    staleTime: 60_000,
  })

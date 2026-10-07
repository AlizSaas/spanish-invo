import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { queryOptions } from '@tanstack/react-query'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import type { Database } from '@/db'
import type { PublicDocument } from '@/lib/types'
import {
  invoiceEvents,
  invoiceItems,
  invoicePublicTokens,
  invoices,
  settings,
} from '@/db/schema'
import { publicMiddleware } from '@/middlewares/dependencies'
import { getActivePlan } from '@/lib/plan'
import { publicTokenSchema } from '@/lib/validators/documents'
import { logEvent } from '@/data/documents/helpers'

/**
 * Public links can be reloaded endlessly: keep at most one event of a kind per
 * document per hour, so the owner's activity feed (and the table) stay readable.
 */
async function logPublicEvent(
  db: Database,
  invoiceId: string,
  eventType: 'viewed' | 'pdf_downloaded',
) {
  const recent = await db.query.invoiceEvents.findFirst({
    where: and(
      eq(invoiceEvents.invoiceId, invoiceId),
      eq(invoiceEvents.eventType, eventType),
      gt(invoiceEvents.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
    ),
    columns: { id: true },
  })
  if (!recent) await logEvent(db, invoiceId, eventType)
}

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
  // Free-plan owners show the "Made with Factura Fácil" badge; Pro removes it.
  const { plan } = await getActivePlan(db, doc.userId)

  if (opts.recordView) {
    // First open flips sent → viewed; later opens leave a trace for the owner.
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
    await logPublicEvent(db, doc.id, 'viewed')
  }
  if (opts.recordPdf) {
    await logPublicEvent(db, doc.id, 'pdf_downloaded')
  }

  return {
    id: doc.id,
    ownerId: doc.userId,
    showBranding: plan === 'free',
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

/**
 * Link-preview fetchers and crawlers. Messenger, WhatsApp, iMessage, Slack…
 * load the page to build the card in the chat, which must not count as the
 * customer opening the invoice. Messenger's in-app browser (FBAN/FBAV/FB_IAB)
 * is a real person and deliberately doesn't match.
 */
const PREVIEW_BOT =
  /facebookexternalhit|facebot|meta-externalagent|whatsapp|twitterbot|slackbot|telegrambot|discordbot|linkedinbot|skypeuripreview|pinterestbot|redditbot|applebot|googlebot|bingbot|duckduckbot|yandexbot|baiduspider|embedly|iframely|vkshare|google-inspectiontool|gptbot|claudebot|perplexitybot|bytespider/i

export const getPublicDocumentFn = createServerFn({ method: 'GET' })
  .middleware([publicMiddleware])
  .validator(publicTokenSchema)
  .handler(async ({ context, data }) => {
    const userAgent = getRequestHeader('user-agent') ?? ''
    const doc = await loadPublicDocument(context.db, data.token, {
      recordView: !data.preview && !PREVIEW_BOT.test(userAgent),
    })
    // Absolute origin for the link-preview tags (og:url, og:image).
    return (
      doc && { ...doc, origin: context.env.BETTER_AUTH_URL.replace(/\/$/, '') }
    )
  })

export const publicDocumentQuery = (token: string, preview = false) =>
  queryOptions({
    queryKey: ['public-document', token, preview] as const,
    queryFn: () => getPublicDocumentFn({ data: { token, preview } }),
    staleTime: 60_000,
  })

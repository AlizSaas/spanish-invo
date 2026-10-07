// Plan resolution and free-tier limits. Server-only: imported by server
// functions, the public page loader and the AI worker.
//
// The Better Auth Stripe plugin owns the `subscription` table (written from
// Stripe webhooks). We only read it: an active, trialing or past-due row for
// the user means Pro; anything else is the free plan.

import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '@/db'
import type { DocumentType } from '@/lib/constants'
import { invoices, settings, subscription } from '@/db/schema'
import { DEFAULT_TIMEZONE } from '@/lib/constants'

export type PlanName = 'free' | 'pro'

export const FREE_LIMITS = {
  /** Per document type (3 invoices and 3 estimates), per calendar month. */
  documentsPerMonth: 3,
  aiQuestionsPerMonth: 10,
} as const

/** past_due keeps Pro while Stripe retries the card; Stripe moves it to canceled/unpaid on failure. */
const PRO_STATUSES = ['active', 'trialing', 'past_due']

export async function getActivePlan(db: Database, userId: string) {
  const row = await db.query.subscription.findFirst({
    where: and(
      eq(subscription.referenceId, userId),
      inArray(subscription.status, PRO_STATUSES),
    ),
    orderBy: desc(subscription.periodEnd),
  })
  const plan: PlanName = row ? 'pro' : 'free'
  return { plan, subscription: row ?? null }
}

/** Documents created this calendar month in the owner's time zone, by type. */
export async function countDocumentsThisMonth(
  db: Database,
  userId: string,
  tz: string,
) {
  const rows = await db
    .select({ type: invoices.type, n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        sql`${invoices.createdAt} >= timezone(${tz}, date_trunc('month', timezone(${tz}, now())))`,
      ),
    )
    .groupBy(invoices.type)
  const by = (type: DocumentType) => rows.find((r) => r.type === type)?.n ?? 0
  return { invoices: by('invoice'), estimates: by('estimate') }
}

/** Throws PLAN_LIMIT when a free account has used its monthly quota for this type. */
export async function assertCanCreateDocument(
  db: Database,
  userId: string,
  type: DocumentType,
) {
  const { plan } = await getActivePlan(db, userId)
  if (plan === 'pro') return
  const s = await db.query.settings.findFirst({
    where: eq(settings.userId, userId),
    columns: { timezone: true },
  })
  const used = await countDocumentsThisMonth(
    db,
    userId,
    s?.timezone ?? DEFAULT_TIMEZONE,
  )
  const n = type === 'invoice' ? used.invoices : used.estimates
  if (n >= FREE_LIMITS.documentsPerMonth) throw new Error('PLAN_LIMIT')
}

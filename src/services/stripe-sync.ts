// Mirrors the user's Stripe subscription into the `subscription` row owned by
// the Better Auth Stripe plugin. Webhooks normally do this; this covers a late
// or missed webhook right after checkout (or a dev machine without the CLI).

import Stripe from 'stripe'
import { desc, eq } from 'drizzle-orm'
import type { Database } from '@/db'
import { subscription } from '@/db/schema'

const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

export async function syncSubscriptionFromStripe(
  db: Database,
  env: { STRIPE_SECRET_KEY: string },
  userId: string,
) {
  if (!env.STRIPE_SECRET_KEY) return null
  const row = await db.query.subscription.findFirst({
    where: eq(subscription.referenceId, userId),
    orderBy: desc(subscription.updatedAt),
  })
  if (!row?.stripeCustomerId) return null

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  })
  const list = await stripe.subscriptions.list({
    customer: row.stripeCustomerId,
    status: 'all',
    limit: 5,
  })
  const live =
    list.data.find((s) => LIVE_STATUSES.has(s.status)) ?? list.data.at(0)
  if (!live) return row

  // Current-period dates live on the subscription item in recent API versions.
  const item = live.items.data.at(0)
  const toDate = (secs: number | null | undefined) =>
    secs ? new Date(secs * 1000) : null

  const [updated] = await db
    .update(subscription)
    .set({
      stripeSubscriptionId: live.id,
      status: live.status,
      periodStart: toDate(item?.current_period_start),
      periodEnd: toDate(item?.current_period_end),
      trialStart: toDate(live.trial_start),
      trialEnd: toDate(live.trial_end),
      cancelAtPeriodEnd: live.cancel_at_period_end,
      cancelAt: toDate(live.cancel_at),
      canceledAt: toDate(live.canceled_at),
      endedAt: toDate(live.ended_at),
    })
    .where(eq(subscription.id, row.id))
    .returning()
  return updated
}

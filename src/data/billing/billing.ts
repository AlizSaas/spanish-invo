import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { and, eq, gt } from 'drizzle-orm'
import { settings, subscription } from '@/db/schema'
import { authMiddleware } from '@/middlewares/dependencies'
import { DEFAULT_TIMEZONE } from '@/lib/constants'
import { FREE_LIMITS, countDocumentsThisMonth, getActivePlan } from '@/lib/plan'
import { syncSubscriptionFromStripe } from '@/services/stripe-sync'

/** Current plan, subscription dates and this month's usage for the billing card. */
export const getBillingFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user, env } = context
    const s = await db.query.settings.findFirst({
      where: eq(settings.userId, user.id),
      columns: { timezone: true },
    })

    let current = await getActivePlan(db, user.id)

    // Self-heal: a checkout whose webhook hasn't landed yet leaves an
    // "incomplete" row. Ask Stripe directly, but only for recent attempts so an
    // abandoned checkout from months ago doesn't cost an API call per page view.
    if (current.plan === 'free') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const pending = await db.query.subscription.findFirst({
        where: and(
          eq(subscription.referenceId, user.id),
          eq(subscription.status, 'incomplete'),
          gt(subscription.updatedAt, since),
        ),
        columns: { stripeCustomerId: true },
      })
      if (pending?.stripeCustomerId) {
        await syncSubscriptionFromStripe(db, env, user.id)
        current = await getActivePlan(db, user.id)
      }
    }

    const usage = await countDocumentsThisMonth(
      db,
      user.id,
      s?.timezone ?? DEFAULT_TIMEZONE,
    )
    const sub = current.subscription
    return {
      plan: current.plan,
      status: sub?.status ?? null,
      periodEnd: sub?.periodEnd?.toISOString() ?? null,
      trialEnd: sub?.trialEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      usage,
      limits: FREE_LIMITS,
      /** False in environments without a Stripe key: hide upgrade buttons. */
      stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
    }
  })

export const BILLING_QUERY_KEY = ['billing'] as const

export const billingQueryOptions = () =>
  queryOptions({
    queryKey: BILLING_QUERY_KEY,
    queryFn: () => getBillingFn(),
    staleTime: 30_000,
  })

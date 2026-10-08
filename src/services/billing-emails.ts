// The "thank you for going Pro" email, sent from the Better Auth Stripe
// plugin's onSubscriptionComplete hook (checkout.session.completed webhook).

import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import type { Database } from '@/db'
import { settings, user } from '@/db/schema'
import { DEFAULT_LANGUAGE, SUPPORT_EMAIL } from '@/lib/constants'
import { sendEmail } from '@/lib/email'
import { subscriptionThankYouEmail } from '@/lib/email-templates'

export async function sendProThankYouEmail(
  db: Database,
  env: Env,
  userId: string,
  stripeSubscription: Stripe.Subscription,
) {
  const [owner, prefs] = await Promise.all([
    db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { email: true, name: true },
    }),
    db.query.settings.findFirst({
      where: eq(settings.userId, userId),
      columns: { locale: true, timezone: true },
    }),
  ])
  const item = stripeSubscription.items.data.at(0)
  if (!owner || !item) return

  const toDate = (secs: number) => new Date(secs * 1000)
  const trialEnd = stripeSubscription.trial_end
    ? toDate(stripeSubscription.trial_end)
    : null
  const mail = subscriptionThankYouEmail({
    appName: env.APP_NAME,
    name: owner.name,
    appUrl: env.BETTER_AUTH_URL.replace(/\/$/, ''),
    language: prefs?.locale ?? DEFAULT_LANGUAGE,
    interval: item.price.recurring?.interval === 'year' ? 'year' : 'month',
    amount: (item.price.unit_amount ?? 0) / 100,
    currency: item.price.currency,
    trialEnd,
    // Current-period dates live on the subscription item in recent API versions.
    nextChargeAt: trialEnd ?? toDate(item.current_period_end),
    timezone: prefs?.timezone ?? env.DEFAULT_TIMEZONE,
  })
  await sendEmail(env, { to: owner.email, replyTo: SUPPORT_EMAIL, ...mail })
}

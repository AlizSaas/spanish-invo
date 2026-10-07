import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { stripe } from '@better-auth/stripe'
import Stripe from 'stripe'
import type { Database } from '@/db'
import type { Language } from '@/lib/constants'
import { account, session, subscription, user, verification } from '@/db/schema'
import { languageFromHeaders } from '@/lib/email'
import { getRequestContext } from '@/lib/request-context'

export type StripeConfig = {
  secretKey: string
  webhookSecret: string
  proMonthlyPriceId: string
  /** Optional until the yearly price exists in Stripe. */
  proYearlyPriceId?: string
  /** Only true once Stripe Tax is activated on the account; Checkout errors otherwise. */
  automaticTax: boolean
}

export type AuthConfig = {
  db: Database
  secret: string
  baseURL: string
  stripe: StripeConfig
  sendResetPassword: (data: {
    email: string
    name: string
    url: string
    language: Language
  }) => Promise<void>
  /**
   * Fired after a new account is created (starts the welcome Workflow).
   * Must not block: hand slow work to ctx.waitUntil so signup responds fast.
   */
  onUserCreated?: (user: {
    id: string
    email: string
    name: string
    /** UI language at signup, for the welcome emails. */
    language: Language
  }) => void | Promise<void>
  /**
   * Fired when Stripe Checkout completes for a plan (sends the thank-you).
   * Runs inside the webhook request: hand slow work to ctx.waitUntil.
   */
  onSubscriptionComplete?: (data: {
    userId: string
    stripeSubscription: Stripe.Subscription
  }) => void | Promise<void>
}

/** Built once per request in server.ts (stateless; cost is object creation). */
export function createAuth(config: AuthConfig) {
  // Workers have no Node http module; Stripe's fetch client works everywhere.
  const stripeClient = new Stripe(
    config.stripe.secretKey || 'sk_test_not_configured',
    { httpClient: Stripe.createFetchHttpClient() },
  )

  return betterAuth({
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: [config.baseURL],
    database: drizzleAdapter(config.db, {
      provider: 'pg',
      schema: { user, session, account, verification, subscription },
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (created, ctx) => {
            await config.onUserCreated?.({
              id: created.id,
              email: created.email,
              name: created.name,
              language: languageFromHeaders(
                ctx?.headers ?? ctx?.request?.headers,
              ),
            })
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user: u, url }, request) => {
        await config.sendResetPassword({
          email: u.email,
          name: u.name,
          url,
          language: languageFromHeaders(request?.headers),
        })
      },
    },
    session: {
      // Avoid a DB round-trip on every request; re-validated every 5 minutes.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: {
      // Explicit so it also applies when NODE_ENV isn't "production" at runtime.
      // Memory storage is per Worker isolate: it blunts bursts but is not a
      // substitute for a Cloudflare WAF rate-limiting rule on /api/auth/*.
      enabled: true,
      window: 60,
      max: 60,
    },
    advanced: {
      // Cloudflare puts the real client IP here; used to key the rate limiter.
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] },
    },
    plugins: [
      stripe({
        stripeClient,
        stripeWebhookSecret: config.stripe.webhookSecret,
        // The customer is created lazily at first checkout: a Stripe call
        // inside the signup request would slow every signup for nothing.
        createCustomerOnSignUp: false,
        subscription: {
          enabled: true,
          plans: [
            {
              name: 'pro',
              priceId: config.stripe.proMonthlyPriceId,
              annualDiscountPriceId:
                config.stripe.proYearlyPriceId || undefined,
              freeTrial: { days: 14 },
            },
          ],
          onSubscriptionComplete: async ({
            subscription: s,
            stripeSubscription,
          }) => {
            await config.onSubscriptionComplete?.({
              userId: s.referenceId,
              stripeSubscription,
            })
          },
          getCheckoutSessionParams: () => ({
            params: {
              allow_promotion_codes: true,
              ...(config.stripe.automaticTax
                ? {
                    automatic_tax: { enabled: true },
                    billing_address_collection: 'required' as const,
                    customer_update: { address: 'auto' as const },
                  }
                : {}),
            },
          }),
        },
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>

/** The current request's Better Auth instance. */
export function getAuth(): Auth {
  return getRequestContext().auth
}

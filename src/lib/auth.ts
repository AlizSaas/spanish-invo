import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { stripe } from '@better-auth/stripe'
import { and, eq } from 'drizzle-orm'
import Stripe from 'stripe'
import type { Database } from '@/db'
import type { Language } from '@/lib/constants'
import { account, session, subscription, user, verification } from '@/db/schema'
import { languageFromHeaders } from '@/lib/email'
import { errorForLog, scrubQueryParams, withoutQueryParams } from '@/lib/log'
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
  /** "Continue with Google" is offered only when both are set. */
  google?: { clientId: string; clientSecret: string }
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
          before: (u) =>
            Promise.resolve({ data: { ...u, name: cleanName(u.name) } }),
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
        update: {
          before: (u) =>
            Promise.resolve(
              typeof u.name === 'string'
                ? { data: { ...u, name: cleanName(u.name) } }
                : undefined,
            ),
        },
      },
      account: {
        create: {
          // Google links to an existing account with the same (Google-verified)
          // email. Signup never verifies email, so that account may have been
          // registered by someone else who only knew the address: drop its
          // password and sessions so the Google owner is the only way in. A
          // real owner who wants a password back can use "Forgot password".
          after: async (created) => {
            if (created.providerId === 'credential') return
            const owner = await config.db
              .select({ emailVerified: user.emailVerified })
              .from(user)
              .where(eq(user.id, created.userId))
            if (!owner.some((u) => !u.emailVerified)) return
            await config.db
              .delete(account)
              .where(
                and(
                  eq(account.userId, created.userId),
                  eq(account.providerId, 'credential'),
                ),
              )
            // Runs before the Google session is created, so only older ones go.
            await config.db
              .delete(session)
              .where(eq(session.userId, created.userId))
          },
        },
      },
    },
    socialProviders: config.google
      ? {
          google: {
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
            // Always show the account chooser: people often share a family laptop.
            prompt: 'select_account',
          },
        }
      : undefined,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Signup doesn't verify email, so someone may have registered an address
      // before its owner: when the owner resets the password, sign everyone out.
      revokeSessionsOnPasswordReset: true,
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
    logger: {
      // Local dev also shows warnings (e.g. "account not linked").
      level: import.meta.env.DEV ? 'warn' : 'error',
      log: logAuthEvent,
    },
    onAPIError: {
      // Logging only: the response (redirect, 4xx JSON, 500) is built the same
      // way after this returns.
      onError: logAuthApiError,
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

/**
 * Account names end up in email greetings and the assistant's instructions:
 * one line, no control characters, bounded.
 */
function cleanName(name: string): string {
  return name
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

/**
 * Better Auth's internal logger. Its arguments can be whole user, session or
 * DB error objects, so production keeps only the message and sanitized errors;
 * local dev prints everything for debugging.
 */
function logAuthEvent(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  ...args: Array<unknown>
) {
  const print =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log
  if (import.meta.env.DEV) {
    print(`[auth] ${message}`, ...args)
    return
  }
  print(
    JSON.stringify({
      level,
      msg: `auth: ${withoutQueryParams(message)}`,
      errors: args.filter((a) => a instanceof Error).map(errorForLog),
    }),
  )
}

/**
 * Errors thrown by auth endpoints (sign-in, sign-up, OAuth callback, Stripe
 * webhook...). Replaces Better Auth's default, which prints the whole error.
 */
function logAuthApiError(err: unknown) {
  const api =
    err instanceof Error && err.name === 'APIError'
      ? (err as Error & { statusCode: number; body?: { code?: string } })
      : null
  // Redirects (the Google callback's 302 to /dashboard) travel as a "FOUND"
  // error. Better Auth means to skip them, but its instanceof check misses
  // because pnpm installs two copies of better-call (split by zod version).
  // Not a failure, and the object holds the response's Set-Cookie session
  // token, so it must not be printed.
  if (api && api.statusCode >= 300 && api.statusCode < 400) return
  // Expected rejections: wrong password, email taken, missing session...
  // The code is enough to spot a spike; the body can echo user input.
  if (api && api.statusCode < 500) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'auth rejected',
        status: api.statusCode,
        code: api.body?.code,
      }),
    )
    return
  }
  // Real failures (database down, email binding error...). better-call prints
  // non-API errors again after this, so scrub the object, not just our copy.
  scrubQueryParams(err)
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'auth',
      ...errorForLog(err),
      ...(import.meta.env.DEV && err instanceof Error
        ? { stack: err.stack }
        : {}),
    }),
  )
}

/** The current request's Better Auth instance. */
export function getAuth(): Auth {
  return getRequestContext().auth
}

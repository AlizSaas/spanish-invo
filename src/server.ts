import handler from '@tanstack/react-start/server-entry'
import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import { createDb } from './db'
import { aiUsage, invoices } from './db/schema'
import { createAuth } from './lib/auth'
import { sendEmail } from './lib/email'
import { passwordResetEmail } from './lib/email-templates'
import { errorForLog } from './lib/log'
import { rateLimit } from './lib/rate-limit'
import { runWithRequestContext } from './lib/request-context'
import { checkTurnstile } from './lib/turnstile'
import { sendProThankYouEmail } from './services/billing-emails'
import { WORKER_PREFIX, worker } from './worker'
import type { RequestContext } from './lib/request-context'

// Workflow classes must be exported from the main module so Cloudflare can find them.
export { WelcomeEmailWorkflow } from './workflows/welcome-email'

/** Hex SHA-256: keeps email addresses out of KV key names. */
async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Build the per-request services. Never cache these in module scope: Workers
 * reject I/O objects shared across requests (see lib/request-context.ts).
 */
function createContext(env: Env, ctx: ExecutionContext): RequestContext {
  const db = createDb(env.HYPERDRIVE.connectionString)
  const auth = createAuth({
    db,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      proMonthlyPriceId: env.STRIPE_PRICE_PRO_MONTHLY,
      proYearlyPriceId: env.STRIPE_PRICE_PRO_YEARLY,
      // Typed as the literal from wrangler.jsonc; compare as a plain string.
      automaticTax: (env.STRIPE_AUTOMATIC_TAX as string) === 'true',
    },
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }
        : undefined,
    sendResetPassword: async ({ email, name, url, language }) => {
      // One reset email per address every two minutes, whoever asks: the form
      // can't be used to flood someone's inbox. The response looks the same.
      const key = `reset-mail:${await sha256(email.toLowerCase())}`
      if (await env.KV.get(key)) return
      await env.KV.put(key, '1', { expirationTtl: 120 })
      const mail = passwordResetEmail({
        appName: env.APP_NAME,
        appUrl: env.BETTER_AUTH_URL.replace(/\/$/, ''),
        name,
        url,
        language,
      })
      await sendEmail(env, { to: email, ...mail })
    },
    onUserCreated: (u) => {
      // Durable welcome + onboarding-reminder sequence. Queued with waitUntil so
      // the signup response goes out first; the Workflow itself retries the sends.
      ctx.waitUntil(
        env.WELCOME_EMAIL_WORKFLOW.create({
          id: `welcome-${u.id}`,
          params: {
            userId: u.id,
            email: u.email,
            name: u.name,
            language: u.language,
          },
        }).catch((err: unknown) => {
          console.error(
            JSON.stringify({
              level: 'error',
              msg: 'welcome workflow',
              ...errorForLog(err),
            }),
          )
        }),
      )
    },
    onSubscriptionComplete: ({ userId, stripeSubscription }) => {
      // After the webhook responds: Stripe only waits a few seconds for a 200.
      ctx.waitUntil(
        sendProThankYouEmail(db, env, userId, stripeSubscription).catch(
          (err: unknown) => {
            console.error(
              JSON.stringify({
                level: 'error',
                msg: 'pro thank-you email',
                ...errorForLog(err),
              }),
            )
          },
        ),
      )
    },
  })
  return { env, db, auth }
}

/**
 * Daily cron (see "triggers" in wrangler.jsonc): flip sent/viewed invoices that
 * are a full day past due to `overdue`. Estimates are excluded — their dueDate
 * is a "valid until", not a payment deadline.
 */
async function sweepOverdue(ctx: RequestContext) {
  const result = await ctx.db
    .update(invoices)
    .set({ status: 'overdue' })
    .where(
      and(
        eq(invoices.type, 'invoice'),
        inArray(invoices.status, ['sent', 'viewed']),
        lt(invoices.dueDate, sql`now() - interval '1 day'`),
      ),
    )
    .returning({ id: invoices.id })
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'overdue sweep',
      count: result.length,
    }),
  )
}

/** The AI budget only looks back one calendar month; drop older runs. */
async function pruneAiUsage(ctx: RequestContext) {
  await ctx.db
    .delete(aiUsage)
    .where(lt(aiUsage.createdAt, sql`now() - interval '40 days'`))
}

/**
 * 301 www.<domain> → <domain> so sessions, trusted origins and SEO all see a
 * single origin. The canonical host is whatever BETTER_AUTH_URL points at.
 */
function canonicalHostRedirect(request: Request, env: Env): Response | null {
  const url = new URL(request.url)
  const canonical = new URL(env.BETTER_AUTH_URL)
  if (url.hostname !== `www.${canonical.hostname}`) return null
  url.protocol = canonical.protocol
  url.hostname = canonical.hostname
  url.port = canonical.port
  return Response.redirect(url.toString(), 301)
}

/** Baseline security headers for every response (HTML, JSON, PDF, assets). */
function withSecurityHeaders(res: Response, pathname: string): Response {
  const out = new Response(res.body, res)
  const h = out.headers
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('X-Frame-Options', 'SAMEORIGIN')
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  h.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  )
  if (!h.has('Content-Security-Policy')) {
    h.set(
      'Content-Security-Policy',
      "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
    )
  }
  // Shared invoice pages and API responses must never show up in search results.
  if (pathname.startsWith('/i/') || pathname.startsWith('/api/')) {
    h.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return out
}

export default {
  async fetch(request, env, ctx) {
    const redirect = canonicalHostRedirect(request, env)
    if (redirect) return redirect

    const { pathname } = new URL(request.url)
    // Before any DB or auth work, so floods are turned away cheaply.
    const limited = await rateLimit(request, env, pathname)
    if (limited) return withSecurityHeaders(limited, pathname)
    const challenged = await checkTurnstile(request, env, pathname)
    if (challenged) return withSecurityHeaders(challenged, pathname)

    const context = createContext(env, ctx)
    return runWithRequestContext(context, async () => {
      // External-service endpoints (AI chat) live in the Hono app under /api/ai/*.
      const res = pathname.startsWith(WORKER_PREFIX)
        ? await worker.fetch(request, env, ctx)
        : await handler.fetch(request)
      return withSecurityHeaders(res, pathname)
    })
  },
  scheduled(_controller, env, ctx) {
    const context = createContext(env, ctx)
    return runWithRequestContext(context, async () => {
      await sweepOverdue(context)
      await pruneAiUsage(context)
    })
  },
} satisfies ExportedHandler<Env>

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { Database } from '@/db'
import { account, session, user, verification } from '@/db/schema'
import { getRequestContext } from '@/lib/request-context'

export type AuthConfig = {
  db: Database
  secret: string
  baseURL: string
  sendResetPassword: (data: {
    email: string
    name: string
    url: string
  }) => Promise<void>
  /**
   * Fired after a new account is created (starts the welcome Workflow).
   * Must not block: hand slow work to ctx.waitUntil so signup responds fast.
   */
  onUserCreated?: (user: {
    id: string
    email: string
    name: string
  }) => void | Promise<void>
}

/** Built once per request in server.ts (stateless; cost is object creation). */
export function createAuth(config: AuthConfig) {
  return betterAuth({
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: [config.baseURL],
    database: drizzleAdapter(config.db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (created) => {
            await config.onUserCreated?.({
              id: created.id,
              email: created.email,
              name: created.name,
            })
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user: u, url }) => {
        await config.sendResetPassword({ email: u.email, name: u.name, url })
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
  })
}

export type Auth = ReturnType<typeof createAuth>

/** The current request's Better Auth instance. */
export function getAuth(): Auth {
  return getRequestContext().auth
}

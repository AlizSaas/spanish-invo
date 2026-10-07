import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import type { Auth } from '@/lib/auth'
import { dependencyMiddleware } from '@/middlewares/dependencies'

/**
 * Page guards confirm the session in the database instead of trusting the
 * 5-minute cookie cache. The cached cookie keeps vouching for an account that
 * was deleted or a session that was revoked, which let a signed-out browser
 * into the app (and into a failing settings insert) instead of /login.
 * Without a session cookie Better Auth returns early, so visitors cost no query.
 */
function readSession(auth: Auth) {
  return auth.api.getSession({
    headers: getRequestHeaders(),
    query: { disableCookieCache: true },
  })
}

/** Throws a redirect to /login when there is no session. Use in protected route guards. */
export const getSessionFn = createServerFn({ method: 'GET' })
  .middleware([dependencyMiddleware])
  .handler(async ({ context }) => {
    const session = await readSession(context.auth)
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return session
  })

/** Returns the session or null. Use on auth pages to bounce signed-in users. */
export const checkSessionFn = createServerFn({ method: 'GET' })
  .middleware([dependencyMiddleware])
  .handler(async ({ context }) => readSession(context.auth))

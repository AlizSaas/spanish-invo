import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { getDb } from '@/db'
import { getAuth } from '@/lib/auth'
import { getEnv } from '@/lib/env'

/** Injects the per-request env, db and auth instances created in server.ts. */
export const dependencyMiddleware = createMiddleware().server(
  async ({ next }) => {
    return next({
      context: {
        env: getEnv(),
        db: getDb(),
        auth: getAuth(),
      },
    })
  },
)

/** Requires a signed-in user; redirects to /login otherwise. */
export const authMiddleware = createMiddleware()
  .middleware([dependencyMiddleware])
  .server(async ({ next, context }) => {
    const headers = getRequestHeaders()
    const session = await context.auth.api.getSession({ headers })

    if (!session) {
      throw redirect({ to: '/login' })
    }

    return next({
      context: {
        session,
        user: session.user,
      },
    })
  })

/** For unauthenticated server functions (public invoice page, auth forms). */
export const publicMiddleware = createMiddleware()
  .middleware([dependencyMiddleware])
  .server(async ({ next }) => next())

import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { dependencyMiddleware } from '@/middlewares/dependencies'

/** Throws a redirect to /login when there is no session. Use in protected route loaders. */
export const getSessionFn = createServerFn({ method: 'GET' })
  .middleware([dependencyMiddleware])
  .handler(async ({ context }) => {
    const session = await context.auth.api.getSession({
      headers: getRequestHeaders(),
    })
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return session
  })

/** Returns the session or null. Use on auth pages to bounce signed-in users. */
export const checkSessionFn = createServerFn({ method: 'GET' })
  .middleware([dependencyMiddleware])
  .handler(async ({ context }) => {
    return context.auth.api.getSession({ headers: getRequestHeaders() })
  })

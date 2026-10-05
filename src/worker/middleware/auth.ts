import { createMiddleware } from 'hono/factory'
import type { WorkerEnv } from '../types'
import { getAuth } from '@/lib/auth'

/** Same Better Auth session cookie the app uses; rejects anonymous calls with 401. */
export const requireUser = createMiddleware<WorkerEnv>(async (c, next) => {
  const session = await getAuth().api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }
  c.set('user', {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  })
  await next()
})

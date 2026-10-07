import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { requireUser } from './middleware/auth'
import { chatRoute } from './routes/chat'
import type { WorkerEnv } from './types'
import { errorForLog } from '@/lib/log'

/**
 * Hono app for endpoints that talk to external services (OpenAI today; room
 * for Twilio webhooks etc.). server.ts forwards every /api/ai/* request here
 * before TanStack Start sees it. env/db/auth singletons are already
 * bootstrapped by server.ts.
 */
export const worker = new Hono<WorkerEnv>().basePath('/api/ai')

worker.get('/health', (c) => c.json({ ok: true, service: 'ai' }))

// Same-origin check for state-changing requests. TanStack's CSRF middleware
// only covers server functions, and this app runs before it (see server.ts).
worker.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const site = c.req.header('sec-fetch-site')
    const origin = c.req.header('origin')
    const sameOrigin =
      site === 'same-origin' || origin === new URL(c.req.url).origin
    if (!sameOrigin) return c.json({ error: 'FORBIDDEN' }, 403)
  }
  await next()
})
// 30 chat turns with tool output fit comfortably; anything bigger is abuse.
worker.use('*', bodyLimit({ maxSize: 256 * 1024 }))
worker.use('*', requireUser)
worker.route('/', chatRoute)

worker.notFound((c) => c.json({ error: 'NOT_FOUND' }, 404))
worker.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(
    JSON.stringify({ level: 'error', msg: 'worker', ...errorForLog(err) }),
  )
  // Never echo internal error text to the client.
  return c.json({ error: 'INTERNAL' }, 500)
})

export const WORKER_PREFIX = '/api/ai/'

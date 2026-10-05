import { AsyncLocalStorage } from 'node:async_hooks'
import type { Database } from '@/db'
import type { Auth } from '@/lib/auth'

/**
 * Per-request services. Cloudflare Workers forbid using I/O objects (such as a
 * Postgres socket) created by one request from another request's handler, so
 * db/auth must never live in module scope. AsyncLocalStorage carries them
 * through every await started inside the handler: server functions, Hono
 * routes, SSR streaming and AI tool calls all see their own request's instances.
 */
export interface RequestContext {
  env: Env
  db: Database
  auth: Auth
}

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn)
}

export function getRequestContext(): RequestContext {
  const ctx = storage.getStore()
  if (!ctx) {
    throw new Error(
      'No request context. server.ts must wrap the handler in runWithRequestContext().',
    )
  }
  return ctx
}

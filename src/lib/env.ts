import { getRequestContext } from '@/lib/request-context'

/**
 * Worker bindings/vars for the current request. Server functions reach them
 * through the dependency middleware; server routes and the Hono app call this.
 */
export function getEnv(): Env {
  return getRequestContext().env
}

export interface WorkerUser {
  id: string
  name: string
  email: string
}

/** Hono generics: Cloudflare bindings + per-request variables set by middleware. */
export type WorkerEnv = {
  Bindings: Env
  Variables: {
    user: WorkerUser
  }
}

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as tables from './schema'
import * as relations from './relations'
import { getRequestContext } from '@/lib/request-context'

export const schema = { ...tables, ...relations }
export type Database = ReturnType<typeof createDb>

/**
 * Called once per request in server.ts with env.HYPERDRIVE.connectionString.
 * Hyperdrive owns the real connection pool, so a fresh postgres.js client per
 * request is cheap and is what Cloudflare recommends. The instance lives in
 * the request context (never module scope — see lib/request-context.ts).
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 5, // Workers cap concurrent outbound connections
    fetch_types: false, // we don't use Postgres array types; skips a round-trip
    prepare: true, // keep prepared statements so Hyperdrive can cache them
  })
  return drizzle(client, { schema })
}

/** The current request's database. */
export function getDb(): Database {
  return getRequestContext().db
}

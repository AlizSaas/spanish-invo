// Error details that are safe to write to Workers Logs. Logs are kept by
// Cloudflare and visible to anyone with dashboard access, so they must never
// carry session tokens, cookies, password hashes, emails or invoice content.

/**
 * Drizzle's query errors put every bound value in the message
 * ("Failed query: ...\nparams: <token>,<email>,..."). Keep the SQL text, which
 * is code, and drop the values.
 */
export function withoutQueryParams(text: string): string {
  return text.replace(/\nparams: [\s\S]*$/, '')
}

/** `name` and `message` (plus the driver's reason for DB errors), values stripped. */
export function errorForLog(err: unknown): { name: string; message: string } {
  if (!(err instanceof Error)) return { name: 'Error', message: String(err) }
  const cause =
    err.cause instanceof Error ? ` (cause: ${err.cause.message})` : ''
  return { name: err.name, message: withoutQueryParams(err.message) + cause }
}

/**
 * The same scrub, applied to the error object itself, for errors a library
 * prints in full after our hook has seen them (better-call console.errors
 * unknown auth errors once Better Auth's onError returns).
 */
export function scrubQueryParams(err: unknown): void {
  if (!(err instanceof Error) || !('params' in err)) return
  err.message = withoutQueryParams(err.message)
  if (err.stack) {
    // The stack starts with "Name: message"; keep the frames after it.
    const frames = err.stack.indexOf('\n    at ')
    err.stack =
      frames === -1
        ? withoutQueryParams(err.stack)
        : withoutQueryParams(err.stack.slice(0, frames)) +
          err.stack.slice(frames)
  }
  ;(err as { params?: unknown }).params = undefined
}

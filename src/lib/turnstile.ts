// Cloudflare Turnstile on the auth forms bots go for. The widget runs in the
// browser (components/auth/turnstile.tsx) and sends its one-time token in a
// header; this checks it with Cloudflare before Better Auth sees the request.

import { TURNSTILE_HEADER } from './constants'
import { errorForLog } from './log'

/** Gated endpoint → the action its form's widget signs tokens with. */
const ACTIONS: Record<string, string | undefined> = {
  '/api/auth/sign-in/email': 'login',
  '/api/auth/sign-up/email': 'signup',
  '/api/auth/request-password-reset': 'reset',
}

/** Cloudflare's always-pass test secret, for .dev.vars only. */
const TEST_SECRET = '1x0000000000000000000000000000000AA'

interface SiteverifyResult {
  success: boolean
  action?: string
  hostname?: string
  'error-codes'?: Array<string>
}

function rejected(status: 403 | 503): Response {
  return Response.json(
    { code: 'CAPTCHA_FAILED', message: 'Human verification failed' },
    { status, headers: { 'cache-control': 'no-store' } },
  )
}

/** 403/503 for the request, or null to let it through. */
export async function checkTurnstile(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  const action = request.method === 'POST' ? ACTIONS[pathname] : undefined
  if (!action) return null

  const secret = env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Not configured yet: keep sign-in working rather than lock everyone out.
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'turnstile: TURNSTILE_SECRET_KEY is not set',
      }),
    )
    return null
  }

  const token = request.headers.get(TURNSTILE_HEADER)
  if (!token || token.length > 2048) return rejected(403)

  const body = new URLSearchParams({ secret, response: token })
  const ip = request.headers.get('cf-connecting-ip')
  if (ip) body.set('remoteip', ip)
  let result: SiteverifyResult
  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body, signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) throw new Error(`siteverify answered ${res.status}`)
    result = await res.json<SiteverifyResult>()
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'turnstile siteverify',
        ...errorForLog(err),
      }),
    )
    return rejected(503)
  }

  if (!result.success) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'turnstile rejected',
        action,
        codes: result['error-codes'],
      }),
    )
    return rejected(403)
  }
  // A token is only good for the form and the site it was issued on. Test
  // tokens carry neither, so local dev skips this.
  if (
    secret !== TEST_SECRET &&
    (result.action !== action ||
      result.hostname !== new URL(env.BETTER_AUTH_URL).hostname)
  ) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'turnstile mismatch',
        action,
        got: result.action,
        hostname: result.hostname,
      }),
    )
    return rejected(403)
  }
  return null
}

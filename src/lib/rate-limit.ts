// Abuse limits on Cloudflare's Workers Rate Limiting (bindings RL_STRICT and
// RL_GENERAL in wrangler.jsonc). Counters are per Cloudflare location and
// approximate, which is right for stopping floods and brute force; budgets that
// must be exact (AI questions, documents per month) are counted in Postgres.
// Better Auth's own in-memory limiter still runs behind this as a second layer.

/** Auth endpoints that check a password, send an email or open a Stripe session. */
const STRICT_AUTH_PREFIXES = [
  '/api/auth/sign-in/',
  '/api/auth/sign-up/',
  '/api/auth/request-password-reset',
  '/api/auth/reset-password',
  '/api/auth/change-password',
  '/api/auth/change-email',
  '/api/auth/send-verification-email',
  '/api/auth/subscription/',
]

/** Signed by Stripe and sent from a handful of Stripe IPs: never throttle it. */
const STRIPE_WEBHOOK = '/api/auth/stripe/webhook'

/**
 * Who to count. IPv4: the address. IPv6: its /64, since one subscriber usually
 * owns a whole /64 and could otherwise rotate addresses to dodge the limit.
 */
export function clientKey(request: Request): string | null {
  const ip = request.headers.get('cf-connecting-ip')
  if (!ip) return null
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip)
  if (v4) return v4[1]
  const halves = ip.toLowerCase().split('::')
  const left = halves[0] ? halves[0].split(':') : []
  const right = halves[1] ? halves[1].split(':') : []
  const groups =
    halves.length === 1
      ? left
      : [
          ...left,
          ...Array<string>(Math.max(0, 8 - left.length - right.length)).fill(
            '0',
          ),
          ...right,
        ]
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ''))
    .join(':')}::/64`
}

async function allowed(limiter: RateLimit, key: string): Promise<boolean> {
  try {
    return (await limiter.limit({ key })).success
  } catch {
    // Fail open: a limiter outage must not take the whole app down with it.
    return true
  }
}

/** Per-account check for routes that already know the user (AI chat). */
export function allowUser(env: Env, bucket: string, userId: string) {
  return allowed(env.RL_STRICT, `${bucket}:${userId}`)
}

/** Every [limiter, key] this request counts against, strict buckets first. */
function keysFor(
  env: Env,
  method: string,
  pathname: string,
  ip: string,
): Array<[RateLimit, string]> {
  const keys: Array<[RateLimit, string]> = []
  if (
    method === 'POST' &&
    STRICT_AUTH_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    keys.push([env.RL_STRICT, `auth:${ip}`])
  }
  if (method === 'POST' && pathname === '/api/settings/logo') {
    keys.push([env.RL_STRICT, `logo:${ip}`])
  }
  if (pathname.startsWith('/api/pdf/')) {
    // Per IP, and per link so a botnet can't hammer one document's renders.
    keys.push([env.RL_STRICT, `pdf:${ip}`])
    keys.push([env.RL_STRICT, `pdf:${pathname.slice('/api/pdf/'.length)}`])
  }
  keys.push([env.RL_GENERAL, ip])
  return keys
}

/** 429 for the request, or null to let it through. */
export async function rateLimit(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  if (pathname === STRIPE_WEBHOOK) return null
  const ip = clientKey(request)
  if (!ip) return null
  for (const [limiter, key] of keysFor(env, request.method, pathname, ip)) {
    if (!(await allowed(limiter, key))) return tooManyRequests(pathname)
  }
  return null
}

export function tooManyRequests(pathname: string): Response {
  const headers = { 'retry-after': '60', 'cache-control': 'no-store' }
  // JSON for API callers (Better Auth's client reads `code`), text for pages.
  if (pathname.startsWith('/api/') || pathname.startsWith('/_serverFn')) {
    return Response.json(
      { code: 'RATE_LIMITED', message: 'Too many requests' },
      { status: 429, headers },
    )
  }
  return new Response(
    'Demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.\nToo many requests. Please wait a minute and try again.',
    {
      status: 429,
      headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' },
    },
  )
}

// Twilio Programmable SMS via REST (no SDK: keeps the Worker bundle small).
// Used as the fallback channel for customers who don't have WhatsApp.

interface SmsEnv {
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  TWILIO_FROM_NUMBER?: string
}

/** True only with real Twilio credentials, not the .dev.vars.example placeholders. */
export function isSmsConfigured(env: SmsEnv): boolean {
  const sid = env.TWILIO_ACCOUNT_SID
  return Boolean(
    sid &&
    env.TWILIO_AUTH_TOKEN &&
    env.TWILIO_FROM_NUMBER &&
    !sid.startsWith('ACxxx') &&
    env.TWILIO_AUTH_TOKEN !== 'xxx',
  )
}

export async function sendSms(
  env: SmsEnv,
  input: { to: string; body: string },
) {
  if (!isSmsConfigured(env)) {
    throw new Error('SMS_NOT_CONFIGURED')
  }
  const sid = env.TWILIO_ACCOUNT_SID!
  const token = env.TWILIO_AUTH_TOKEN!
  const from = env.TWILIO_FROM_NUMBER!

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: input.to, From: from, Body: input.body }),
    },
  )

  if (!res.ok) {
    // Twilio's error body repeats the destination number; keep only the codes.
    const detail = (await res.json().catch(() => null)) as {
      code?: number
    } | null
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'twilio',
        status: res.status,
        code: detail?.code ?? null,
      }),
    )
    throw new Error('SMS_FAILED')
  }
  return res.json<{ sid: string }>()
}

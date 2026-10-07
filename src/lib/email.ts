// Transactional email via the Cloudflare Email binding (env.SEND_EMAIL): password
// resets, the welcome sequence and the Pro thank-you. Copy lives in
// email-templates.ts. Invoices go out via WhatsApp/SMS, not email.
//
// Setup: the sending domain of EMAIL_FROM must be verified for Email Sending in the
// Cloudflare dashboard, and wrangler.jsonc declares `send_email: [{ name: "SEND_EMAIL" }]`.

import type { Language } from '@/lib/constants'
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LOCALE_COOKIE,
  LOCALE_HEADER,
} from '@/lib/constants'

interface SendEmailInput {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail(
  env: { SEND_EMAIL: SendEmail; EMAIL_FROM: string; APP_NAME: string },
  input: SendEmailInput,
): Promise<{ messageId: string }> {
  return env.SEND_EMAIL.send({
    from: { name: env.APP_NAME, email: env.EMAIL_FROM.trim() },
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })
}

/** UI language of the request that triggered an email; Spanish when unknown. */
export function languageFromHeaders(headers: Headers | undefined): Language {
  const value =
    headers?.get(LOCALE_HEADER) ??
    headers
      ?.get('cookie')
      ?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=(\\w+)`))?.[1]
  return LANGUAGES.find((l) => l === value) ?? DEFAULT_LANGUAGE
}

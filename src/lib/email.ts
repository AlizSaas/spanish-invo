// Transactional email via the Cloudflare Email binding (env.SEND_EMAIL).
// In v1 this is ONLY used for Better Auth password resets. Invoices go out via WhatsApp/SMS.
//
// Setup: the sending domain of EMAIL_FROM must be verified for Email Sending in the
// Cloudflare dashboard, and wrangler.jsonc declares `send_email: [{ name: "SEND_EMAIL" }]`.

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

export function passwordResetEmail(opts: {
  appName: string
  name: string
  url: string
}) {
  const firstName = opts.name.split(' ')[0] || ''
  return {
    subject: `Restablece tu contraseña de ${opts.appName}`,
    text: [
      `Hola ${firstName},`,
      '',
      `Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${opts.appName}.`,
      'Abre este enlace para crear una nueva contraseña (válido por 1 hora):',
      opts.url,
      '',
      'Si no fuiste tú, puedes ignorar este mensaje.',
      '',
      '—',
      `If you didn't request this, you can ignore this email. Reset link: ${opts.url}`,
    ].join('\n'),
  }
}

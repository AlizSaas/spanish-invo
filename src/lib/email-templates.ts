/**
 * Transactional email copy, one full version per app language. Each email is
 * a list of blocks that email-layout.ts renders as branded HTML plus a
 * plain-text fallback.
 *
 * Language comes from the UI at signup / password reset (the `x-locale`
 * header) and from settings.locale once the business is set up.
 */

import type { Language } from '@/lib/constants'
import type { EmailBlock, RenderedEmail } from '@/lib/email-layout'
import { renderEmail } from '@/lib/email-layout'
import { formatCurrency, formatDate } from '@/lib/utils'

/**
 * Greeting name. Signup doesn't verify the address, so whoever registers an
 * email picks the name its owner is greeted with: keep one short word, and
 * strip control characters, what mail clients would turn into a link, and
 * the layout's inline markup characters.
 */
const firstName = (name: string) =>
  (name.trim().split(/\s+/)[0] ?? '')
    .replace(/[\p{Cc}\p{Cf}./:@\\*[\]()]/gu, '')
    .slice(0, 30)

interface BaseOpts {
  appName: string
  name: string
  appUrl: string
  language: Language
}

export function welcomeEmail(opts: BaseOpts): RenderedEmail {
  const first = firstName(opts.name)
  const link = `${opts.appUrl}/onboarding`
  if (opts.language === 'en') {
    return renderEmail({
      ...opts,
      subject: `Welcome to ${opts.appName}, ${first}`,
      title: `Welcome to ${opts.appName}`,
      preheader: 'Two quick steps and you can send your first invoice.',
      blocks: [
        { type: 'p', text: `Hi ${first},` },
        {
          type: 'p',
          text: `Thanks for creating your ${opts.appName} account. Two quick steps and you can send your first invoice over WhatsApp or Messenger:`,
        },
        {
          type: 'steps',
          items: [
            '**Set up your business:** name, logo and how you get paid (Zelle, Cash App, cash…).',
            '**Add a client and create an invoice.** Share it with one tap.',
          ],
        },
        { type: 'button', label: 'Set up my business', url: link },
        { type: 'p', text: 'Questions? Just reply to this email.' },
      ],
    })
  }
  return renderEmail({
    ...opts,
    subject: `Bienvenido a ${opts.appName}, ${first}`,
    title: `Bienvenido a ${opts.appName}`,
    preheader: 'En dos pasos puedes mandar tu primera factura.',
    blocks: [
      { type: 'p', text: `Hola ${first},` },
      {
        type: 'p',
        text: `Gracias por crear tu cuenta en ${opts.appName}. En dos pasos puedes mandar tu primera factura por WhatsApp o Messenger:`,
      },
      {
        type: 'steps',
        items: [
          '**Configura tu negocio:** nombre, logo y cómo te pagan (Zelle, Cash App, efectivo…).',
          '**Agrega un cliente y crea una factura.** Compártela con un toque.',
        ],
      },
      { type: 'button', label: 'Configurar mi negocio', url: link },
      { type: 'p', text: 'Si tienes dudas, responde a este correo.' },
    ],
  })
}

export function onboardingReminderEmail(opts: BaseOpts): RenderedEmail {
  const first = firstName(opts.name)
  const link = `${opts.appUrl}/onboarding`
  if (opts.language === 'en') {
    return renderEmail({
      ...opts,
      subject: `${first}, your business isn't set up on ${opts.appName} yet`,
      title: 'Your business is almost ready',
      preheader: 'It takes under two minutes to finish.',
      blocks: [
        { type: 'p', text: `Hi ${first},` },
        {
          type: 'p',
          text: "You created your account yesterday but haven't set up your business yet. It takes **under two minutes**: your business name and how you get paid, and you're done.",
        },
        { type: 'button', label: 'Finish setting up', url: link },
        { type: 'p', text: 'Questions? Just reply to this email.' },
      ],
    })
  }
  return renderEmail({
    ...opts,
    subject: `${first}, tu negocio aún no está configurado en ${opts.appName}`,
    title: 'Tu negocio está casi listo',
    preheader: 'Terminar toma menos de dos minutos.',
    blocks: [
      { type: 'p', text: `Hola ${first},` },
      {
        type: 'p',
        text: 'Ayer creaste tu cuenta pero todavía no has configurado tu negocio. Toma **menos de dos minutos**: nombre del negocio e instrucciones de pago, y listo.',
      },
      { type: 'button', label: 'Terminar la configuración', url: link },
      { type: 'p', text: 'Si tienes dudas, responde a este correo.' },
    ],
  })
}

export function passwordResetEmail(
  opts: BaseOpts & { url: string },
): RenderedEmail {
  const first = firstName(opts.name)
  if (opts.language === 'en') {
    return renderEmail({
      ...opts,
      subject: `Reset your ${opts.appName} password`,
      title: 'Reset your password',
      preheader: 'This link works for 1 hour.',
      blocks: [
        { type: 'p', text: `Hi ${first},` },
        {
          type: 'p',
          text: `We received a request to reset the password for your ${opts.appName} account. The link below works for **1 hour**.`,
        },
        {
          type: 'button',
          label: 'Choose a new password',
          url: opts.url,
          fallback: 'Button not working? Copy this link into your browser:',
        },
        {
          type: 'p',
          text: "If this wasn't you, you can ignore this email. Your password won't change.",
        },
      ],
    })
  }
  return renderEmail({
    ...opts,
    subject: `Restablece tu contraseña de ${opts.appName}`,
    title: 'Restablece tu contraseña',
    preheader: 'Este enlace es válido por 1 hora.',
    blocks: [
      { type: 'p', text: `Hola ${first},` },
      {
        type: 'p',
        text: `Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${opts.appName}. El enlace es válido por **1 hora**.`,
      },
      {
        type: 'button',
        label: 'Crear nueva contraseña',
        url: opts.url,
        fallback: '¿El botón no funciona? Copia este enlace en tu navegador:',
      },
      {
        type: 'p',
        text: 'Si no fuiste tú, puedes ignorar este mensaje. Tu contraseña no cambiará.',
      },
    ],
  })
}

/** Sent once Stripe Checkout completes for Pro (trial or paid). */
export function subscriptionThankYouEmail(
  opts: BaseOpts & {
    interval: 'month' | 'year'
    /** Price in major units (19.99), from the Stripe price. */
    amount: number
    currency: string
    /** Set when the subscription starts with a free trial. */
    trialEnd: Date | null
    /** First (or next) charge date. */
    nextChargeAt: Date
    timezone: string
  },
): RenderedEmail {
  const first = firstName(opts.name)
  const lang = opts.language
  const price = formatCurrency(opts.amount, opts.currency.toUpperCase(), lang)
  const date = (d: Date) =>
    formatDate(d, { language: lang, timezone: opts.timezone })
  const settingsUrl = `${opts.appUrl}/settings`
  const dashboardUrl = `${opts.appUrl}/dashboard`

  if (lang === 'en') {
    const plan =
      opts.interval === 'year'
        ? `Pro yearly, ${price}/year`
        : `Pro monthly, ${price}/month`
    const rows: Array<[string, string]> = opts.trialEnd
      ? [
          ['Plan', plan],
          ['Free trial until', date(opts.trialEnd)],
          ['First charge', `${price} on ${date(opts.nextChargeAt)}`],
        ]
      : [
          ['Plan', plan],
          ['Next charge', date(opts.nextChargeAt)],
        ]
    const trialNote: Array<EmailBlock> = opts.trialEnd
      ? [
          {
            type: 'p',
            text: "You won't be charged before your trial ends, and you can cancel anytime before then.",
          },
        ]
      : []
    return renderEmail({
      ...opts,
      subject: `Thank you for choosing ${opts.appName} Pro`,
      title: "You're on Pro",
      preheader: opts.trialEnd
        ? `Your free trial runs until ${date(opts.trialEnd)}. No charge before then.`
        : `Thanks for upgrading to ${opts.appName} Pro.`,
      blocks: [
        { type: 'p', text: `Hi ${first},` },
        {
          type: 'p',
          text: `Thank you for upgrading to ${opts.appName} Pro! You're helping a small team build tools for small businesses, and we really appreciate it.`,
        },
        { type: 'summary', rows },
        ...trialNote,
        { type: 'heading', text: 'What you get with Pro' },
        {
          type: 'checklist',
          items: [
            '**Unlimited** invoices and estimates',
            `No "Made with ${opts.appName}" badge on your invoices`,
            '**Unlimited AI assistant:** ask about revenue, balances and unpaid invoices',
            'Priority support on WhatsApp',
          ],
        },
        { type: 'button', label: 'Go to my dashboard', url: dashboardUrl },
        {
          type: 'p',
          text: `Change plan, update your card, see receipts or cancel anytime in [Settings](${settingsUrl}).`,
        },
        {
          type: 'p',
          text: 'Questions or ideas? Just reply to this email. A real person reads every one.',
        },
        { type: 'p', text: `The ${opts.appName} team` },
      ],
    })
  }

  const plan =
    opts.interval === 'year'
      ? `Pro anual, ${price}/año`
      : `Pro mensual, ${price}/mes`
  const rows: Array<[string, string]> = opts.trialEnd
    ? [
        ['Plan', plan],
        ['Prueba gratis hasta', date(opts.trialEnd)],
        ['Primer cobro', `${price} el ${date(opts.nextChargeAt)}`],
      ]
    : [
        ['Plan', plan],
        ['Próximo cobro', date(opts.nextChargeAt)],
      ]
  const trialNote: Array<EmailBlock> = opts.trialEnd
    ? [
        {
          type: 'p',
          text: 'No se te cobrará nada antes de que termine la prueba, y puedes cancelar cuando quieras antes de esa fecha.',
        },
      ]
    : []
  return renderEmail({
    ...opts,
    subject: `Gracias por elegir ${opts.appName} Pro`,
    title: 'Ya tienes Pro',
    preheader: opts.trialEnd
      ? `Tu prueba gratis dura hasta el ${date(opts.trialEnd)}. No se te cobra nada antes.`
      : `Gracias por pasarte a ${opts.appName} Pro.`,
    blocks: [
      { type: 'p', text: `Hola ${first},` },
      {
        type: 'p',
        text: `¡Gracias por pasarte a ${opts.appName} Pro! Nos ayudas a seguir creando herramientas para pequeños negocios, y te lo agradecemos de verdad.`,
      },
      { type: 'summary', rows },
      ...trialNote,
      { type: 'heading', text: 'Lo que incluye Pro' },
      {
        type: 'checklist',
        items: [
          'Facturas y presupuestos **ilimitados**',
          `Sin la marca "Hecho con ${opts.appName}" en tus facturas`,
          '**Asistente IA ilimitado:** pregunta por ingresos, saldos y facturas pendientes',
          'Soporte prioritario por WhatsApp',
        ],
      },
      { type: 'button', label: 'Ir a mi panel', url: dashboardUrl },
      {
        type: 'p',
        text: `Cambia de plan, actualiza tu tarjeta, consulta tus recibos o cancela cuando quieras en [Ajustes](${settingsUrl}).`,
      },
      {
        type: 'p',
        text: '¿Dudas o ideas? Responde a este correo. Una persona real lee cada mensaje.',
      },
      { type: 'p', text: `El equipo de ${opts.appName}` },
    ],
  })
}

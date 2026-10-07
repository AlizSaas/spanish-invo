/**
 * Transactional email copy, one full version per app language. Plain text
 * keeps deliverability high for a small-business audience and renders
 * everywhere.
 *
 * Language comes from the UI at signup / password reset (the `x-locale`
 * header) and from settings.locale once the business is set up.
 */

import type { Language } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'

interface EmailCopy {
  subject: string
  text: string
}

const firstName = (name: string) => name.split(' ')[0] || ''

export function welcomeEmail(opts: {
  appName: string
  name: string
  appUrl: string
  language: Language
}): EmailCopy {
  const first = firstName(opts.name)
  const link = `${opts.appUrl}/onboarding`
  if (opts.language === 'en') {
    return {
      subject: `Welcome to ${opts.appName}, ${first}`,
      text: [
        `Hi ${first},`,
        '',
        `Thanks for creating your ${opts.appName} account.`,
        'Two quick steps and you can send your first invoice over WhatsApp or Messenger:',
        '',
        '1. Set up your business: name, logo and how you get paid (Zelle, Cash App, cash…).',
        '2. Add a client and create an invoice. Share it with one tap.',
        '',
        `Get started here: ${link}`,
        '',
        'Questions? Just reply to this email.',
      ].join('\n'),
    }
  }
  return {
    subject: `Bienvenido a ${opts.appName}, ${first}`,
    text: [
      `Hola ${first},`,
      '',
      `Gracias por crear tu cuenta en ${opts.appName}.`,
      'En dos pasos puedes mandar tu primera factura por WhatsApp o Messenger:',
      '',
      '1. Configura tu negocio: nombre, logo y cómo te pagan (Zelle, Cash App, efectivo…).',
      '2. Agrega un cliente y crea una factura. Compártela con un toque.',
      '',
      `Entra aquí: ${link}`,
      '',
      'Si tienes dudas, responde a este correo.',
    ].join('\n'),
  }
}

export function onboardingReminderEmail(opts: {
  appName: string
  name: string
  appUrl: string
  language: Language
}): EmailCopy {
  const first = firstName(opts.name)
  const link = `${opts.appUrl}/onboarding`
  if (opts.language === 'en') {
    return {
      subject: `${first}, your business isn't set up on ${opts.appName} yet`,
      text: [
        `Hi ${first},`,
        '',
        "You created your account yesterday but haven't set up your business yet.",
        'It takes under two minutes: your business name and how you get paid, and you are done.',
        '',
        `Finish setting up: ${link}`,
        '',
        'Questions? Just reply to this email.',
      ].join('\n'),
    }
  }
  return {
    subject: `${first}, tu negocio aún no está configurado en ${opts.appName}`,
    text: [
      `Hola ${first},`,
      '',
      'Ayer creaste tu cuenta pero todavía no has configurado tu negocio.',
      'Toma menos de dos minutos: nombre del negocio e instrucciones de pago, y listo.',
      '',
      `Terminar la configuración: ${link}`,
      '',
      'Si tienes dudas, responde a este correo.',
    ].join('\n'),
  }
}

export function passwordResetEmail(opts: {
  appName: string
  name: string
  url: string
  language: Language
}): EmailCopy {
  const first = firstName(opts.name)
  if (opts.language === 'en') {
    return {
      subject: `Reset your ${opts.appName} password`,
      text: [
        `Hi ${first},`,
        '',
        `We received a request to reset the password for your ${opts.appName} account.`,
        'Open this link to choose a new password (valid for 1 hour):',
        opts.url,
        '',
        "If this wasn't you, you can ignore this email. Your password won't change.",
      ].join('\n'),
    }
  }
  return {
    subject: `Restablece tu contraseña de ${opts.appName}`,
    text: [
      `Hola ${first},`,
      '',
      `Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${opts.appName}.`,
      'Abre este enlace para crear una nueva contraseña (válido por 1 hora):',
      opts.url,
      '',
      'Si no fuiste tú, puedes ignorar este mensaje. Tu contraseña no cambiará.',
    ].join('\n'),
  }
}

/** Sent once Stripe Checkout completes for Pro (trial or paid). */
export function subscriptionThankYouEmail(opts: {
  appName: string
  name: string
  appUrl: string
  language: Language
  interval: 'month' | 'year'
  /** Price in major units (19.99), from the Stripe price. */
  amount: number
  currency: string
  /** Set when the subscription starts with a free trial. */
  trialEnd: Date | null
  /** First (or next) charge date. */
  nextChargeAt: Date
  timezone: string
}): EmailCopy {
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
        ? `Pro yearly: ${price} a year`
        : `Pro monthly: ${price} a month`
    return {
      subject: `Thank you for choosing ${opts.appName} Pro`,
      text: [
        `Hi ${first},`,
        '',
        `Thank you for upgrading to ${opts.appName} Pro! You're helping a small team build tools for small businesses, and we really appreciate it.`,
        '',
        'YOUR PLAN',
        `- ${plan}`,
        ...(opts.trialEnd
          ? [
              `- Free trial until ${date(opts.trialEnd)}. You won't be charged before then.`,
              `- First charge: ${price} on ${date(opts.nextChargeAt)}, unless you cancel before.`,
            ]
          : [`- Next charge: ${date(opts.nextChargeAt)}`]),
        '',
        'WHAT YOU GET WITH PRO',
        '- Unlimited invoices and estimates',
        `- No "Made with ${opts.appName}" badge on your invoices`,
        '- Unlimited AI assistant: ask about revenue, balances and unpaid invoices',
        '- Priority support on WhatsApp',
        '',
        'MANAGE YOUR SUBSCRIPTION',
        `Change plan, update your card, see invoices or cancel anytime from Settings: ${settingsUrl}`,
        '',
        `Ready to send your next invoice? ${dashboardUrl}`,
        '',
        'Questions or ideas? Just reply to this email. A real person reads every one.',
        '',
        `The ${opts.appName} team`,
      ].join('\n'),
    }
  }

  const plan =
    opts.interval === 'year'
      ? `Pro anual: ${price} al año`
      : `Pro mensual: ${price} al mes`
  return {
    subject: `Gracias por elegir ${opts.appName} Pro`,
    text: [
      `Hola ${first},`,
      '',
      `¡Gracias por pasarte a ${opts.appName} Pro! Nos ayudas a seguir creando herramientas para pequeños negocios, y te lo agradecemos de verdad.`,
      '',
      'TU PLAN',
      `- ${plan}`,
      ...(opts.trialEnd
        ? [
            `- Prueba gratis hasta el ${date(opts.trialEnd)}. No se te cobrará nada antes.`,
            `- Primer cobro: ${price} el ${date(opts.nextChargeAt)}, salvo que canceles antes.`,
          ]
        : [`- Próximo cobro: ${date(opts.nextChargeAt)}`]),
      '',
      'LO QUE INCLUYE PRO',
      '- Facturas y presupuestos ilimitados',
      `- Sin la marca "Hecho con ${opts.appName}" en tus facturas`,
      '- Asistente IA ilimitado: pregunta por ingresos, saldos y facturas pendientes',
      '- Soporte prioritario por WhatsApp',
      '',
      'ADMINISTRA TU SUSCRIPCIÓN',
      `Cambia de plan, actualiza tu tarjeta, consulta tus recibos o cancela cuando quieras desde Ajustes: ${settingsUrl}`,
      '',
      `¿Listo para mandar tu próxima factura? ${dashboardUrl}`,
      '',
      '¿Dudas o ideas? Responde a este correo. Una persona real lee cada mensaje.',
      '',
      `El equipo de ${opts.appName}`,
    ].join('\n'),
  }
}

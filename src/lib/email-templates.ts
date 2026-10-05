/**
 * Bilingual (Spanish first, English below) lifecycle emails sent by the
 * spanish-invo-welcome-email Workflow. Plain text keeps deliverability high
 * for a small-business audience and renders everywhere.
 */

interface EmailCopy {
  subject: string
  text: string
}

export function welcomeEmail(opts: {
  appName: string
  name: string
  appUrl: string
}): EmailCopy {
  const first = opts.name.split(' ')[0] || ''
  return {
    subject: `Bienvenido a ${opts.appName}, ${first}`,
    text: [
      `Hola ${first},`,
      '',
      `Gracias por crear tu cuenta en ${opts.appName}.`,
      'En dos pasos puedes mandar tu primera factura por WhatsApp:',
      '',
      '1. Configura tu negocio: nombre, logo y cómo te pagan (Zelle, Cash App, efectivo…).',
      '2. Agrega un cliente y crea una factura. Compártela con un toque.',
      '',
      `Entra aquí: ${opts.appUrl}/onboarding`,
      '',
      'Si tienes dudas, responde a este correo.',
      '',
      '—',
      `Welcome to ${opts.appName}! Set up your business and send your first invoice over WhatsApp: ${opts.appUrl}/onboarding`,
    ].join('\n'),
  }
}

export function onboardingReminderEmail(opts: {
  appName: string
  name: string
  appUrl: string
}): EmailCopy {
  const first = opts.name.split(' ')[0] || ''
  return {
    subject: `${first}, tu negocio aún no está configurado en ${opts.appName}`,
    text: [
      `Hola ${first},`,
      '',
      'Ayer creaste tu cuenta pero todavía no has configurado tu negocio.',
      'Toma menos de dos minutos: nombre del negocio e instrucciones de pago, y listo.',
      '',
      `Terminar la configuración: ${opts.appUrl}/onboarding`,
      '',
      '—',
      `Your business is not set up yet. It takes under two minutes: ${opts.appUrl}/onboarding`,
    ].join('\n'),
  }
}

import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/legal-page'

/** Public SMS opt-in disclosure. Linked from Twilio registration and the footer. */
export const Route = createFileRoute('/sms-consent')({
  head: () => ({
    meta: [
      { title: 'Consentimiento SMS — Factura Fácil' },
      {
        name: 'description',
        content:
          'Qué mensajes SMS envían los negocios que usan Factura Fácil, cómo se obtiene el consentimiento y cómo darse de baja (STOP).',
      },
    ],
  }),
  component: SmsConsentPage,
})

function SmsConsentPage() {
  return <LegalPage doc="smsConsent" />
}

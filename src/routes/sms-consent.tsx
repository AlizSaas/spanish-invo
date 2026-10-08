import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/legal-page'
import { pageUrl } from '@/lib/constants'

/** Public SMS opt-in disclosure. Linked from Twilio registration and the footer. */
export const Route = createFileRoute('/sms-consent')({
  head: () => ({
    meta: [
      { title: 'SMS Consent — Factura Fácil' },
      {
        name: 'description',
        content:
          'Which SMS messages businesses using Factura Fácil send, how consent is collected and how to opt out (STOP).',
      },
      { property: 'og:url', content: pageUrl('/sms-consent') },
    ],
    links: [{ rel: 'canonical', href: pageUrl('/sms-consent') }],
  }),
  component: SmsConsentPage,
})

function SmsConsentPage() {
  return <LegalPage doc="smsConsent" />
}

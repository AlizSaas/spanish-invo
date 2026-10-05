import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/legal-page'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Política de privacidad — Factura Fácil' },
      {
        name: 'description',
        content:
          'Qué datos recopila Factura Fácil, para qué los usa y cómo puedes ejercer tus derechos.',
      },
    ],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return <LegalPage doc="privacy" />
}

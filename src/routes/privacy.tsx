import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/legal-page'
import { pageUrl } from '@/lib/constants'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Política de privacidad — Factura Fácil' },
      {
        name: 'description',
        content:
          'Qué datos recopila Factura Fácil, con quién los comparte (incluidos los pagos con Stripe) y cómo puedes ejercer tus derechos.',
      },
      { property: 'og:url', content: pageUrl('/privacy') },
    ],
    links: [{ rel: 'canonical', href: pageUrl('/privacy') }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return <LegalPage doc="privacy" />
}

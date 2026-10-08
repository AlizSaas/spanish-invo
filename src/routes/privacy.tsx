import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/legal-page'
import { pageUrl } from '@/lib/constants'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy — Factura Fácil' },
      {
        name: 'description',
        content:
          'What data Factura Fácil collects, who it is shared with (including Stripe payments) and how to exercise your rights.',
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

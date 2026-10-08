import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/legal-page'
import { pageUrl } from '@/lib/constants'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Service — Factura Fácil' },
      {
        name: 'description',
        content:
          'Factura Fácil terms of use: Free and Pro plans, free trial, renewal, cancellation and refunds, documents and messages to clients.',
      },
      { property: 'og:url', content: pageUrl('/terms') },
    ],
    links: [{ rel: 'canonical', href: pageUrl('/terms') }],
  }),
  component: TermsPage,
})

function TermsPage() {
  return <LegalPage doc="terms" />
}

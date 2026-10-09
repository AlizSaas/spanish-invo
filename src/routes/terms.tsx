import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/legal-page'
import { pageUrl } from '@/lib/constants'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Términos de servicio — Factura Fácil' },
      {
        name: 'description',
        content:
          'Condiciones de uso de Factura Fácil: planes Free y Pro, prueba gratis, renovación, cancelación y reembolsos, documentos y mensajes a clientes.',
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

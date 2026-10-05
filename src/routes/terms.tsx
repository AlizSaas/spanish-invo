import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '@/components/legal/legal-page'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Términos de servicio — Factura Fácil' },
      {
        name: 'description',
        content:
          'Condiciones de uso de Factura Fácil: cuentas, documentos, mensajes a clientes y responsabilidades.',
      },
    ],
  }),
  component: TermsPage,
})

function TermsPage() {
  return <LegalPage doc="terms" />
}

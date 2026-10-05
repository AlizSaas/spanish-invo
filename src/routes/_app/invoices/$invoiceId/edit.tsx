import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { DocumentBuilder } from '@/components/documents/document-builder'
import { PageHeader } from '@/components/page-header'
import { clientsListQuery } from '@/data/clients/queries'
import { documentDetailQuery } from '@/data/documents/queries'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/_app/invoices/$invoiceId/edit')({
  loader: async ({ context, params }) => {
    const [doc] = await Promise.all([
      context.queryClient.query({
        ...documentDetailQuery(params.invoiceId),
        staleTime: 'static',
      }),
      context.queryClient.query({ ...clientsListQuery(), staleTime: 'static' }),
    ])
    if (doc.status === 'paid' || doc.status === 'void') {
      throw redirect({
        to: '/invoices/$invoiceId',
        params: { invoiceId: params.invoiceId },
      })
    }
  },
  component: EditInvoicePage,
})

function EditInvoicePage() {
  const t = useT()
  const { invoiceId } = Route.useParams()
  const { data: doc } = useSuspenseQuery(documentDetailQuery(invoiceId))
  return (
    <div className="space-y-6">
      <PageHeader title={`${t.docs.editInvoice} · ${doc.invoiceNumber}`} />
      <DocumentBuilder type="invoice" editing={doc} />
    </div>
  )
}

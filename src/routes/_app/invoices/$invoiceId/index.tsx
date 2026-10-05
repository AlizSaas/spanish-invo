import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DocumentDetail } from '@/components/documents/document-detail'
import { documentDetailQuery } from '@/data/documents/queries'

export const Route = createFileRoute('/_app/invoices/$invoiceId/')({
  validateSearch: z.object({ share: z.coerce.boolean().optional() }),
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...documentDetailQuery(params.invoiceId),
      staleTime: 'static',
    }),
  component: InvoiceDetailPage,
})

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams()
  const { share } = Route.useSearch()
  return <DocumentDetail id={invoiceId} openShare={Boolean(share)} />
}

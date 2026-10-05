import { createFileRoute } from '@tanstack/react-router'
import { DocumentList } from '@/components/documents/document-list'
import { documentsListQuery } from '@/data/documents/queries'

export const Route = createFileRoute('/_app/invoices/')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...documentsListQuery({ type: 'invoice' }),
      staleTime: 'static',
    }),
  component: () => <DocumentList type="invoice" />,
})

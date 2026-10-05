import { createFileRoute } from '@tanstack/react-router'
import { DocumentList } from '@/components/documents/document-list'
import { documentsListQuery } from '@/data/documents/queries'

export const Route = createFileRoute('/_app/estimates/')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...documentsListQuery({ type: 'estimate' }),
      staleTime: 'static',
    }),
  component: () => <DocumentList type="estimate" />,
})

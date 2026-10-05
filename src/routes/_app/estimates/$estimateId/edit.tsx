import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { DocumentBuilder } from '@/components/documents/document-builder'
import { PageHeader } from '@/components/page-header'
import { clientsListQuery } from '@/data/clients/queries'
import { documentDetailQuery } from '@/data/documents/queries'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/_app/estimates/$estimateId/edit')({
  loader: async ({ context, params }) => {
    const [doc] = await Promise.all([
      context.queryClient.query({
        ...documentDetailQuery(params.estimateId),
        staleTime: 'static',
      }),
      context.queryClient.query({ ...clientsListQuery(), staleTime: 'static' }),
    ])
    if (doc.status === 'paid' || doc.status === 'void') {
      throw redirect({
        to: '/estimates/$estimateId',
        params: { estimateId: params.estimateId },
      })
    }
  },
  component: EditEstimatePage,
})

function EditEstimatePage() {
  const t = useT()
  const { estimateId } = Route.useParams()
  const { data: doc } = useSuspenseQuery(documentDetailQuery(estimateId))
  return (
    <div className="space-y-6">
      <PageHeader title={`${t.docs.editEstimate} · ${doc.invoiceNumber}`} />
      <DocumentBuilder type="estimate" editing={doc} />
    </div>
  )
}

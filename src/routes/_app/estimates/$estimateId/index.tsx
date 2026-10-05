import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DocumentDetail } from '@/components/documents/document-detail'
import { documentDetailQuery } from '@/data/documents/queries'

export const Route = createFileRoute('/_app/estimates/$estimateId/')({
  validateSearch: z.object({ share: z.coerce.boolean().optional() }),
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...documentDetailQuery(params.estimateId),
      staleTime: 'static',
    }),
  component: EstimateDetailPage,
})

function EstimateDetailPage() {
  const { estimateId } = Route.useParams()
  const { share } = Route.useSearch()
  return <DocumentDetail id={estimateId} openShare={Boolean(share)} />
}

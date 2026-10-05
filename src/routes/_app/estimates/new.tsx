import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DocumentBuilder } from '@/components/documents/document-builder'
import { PageHeader } from '@/components/page-header'
import { clientsListQuery } from '@/data/clients/queries'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/_app/estimates/new')({
  validateSearch: z.object({ clientId: z.string().optional() }),
  loader: ({ context }) =>
    context.queryClient.query({ ...clientsListQuery(), staleTime: 'static' }),
  component: NewEstimatePage,
})

function NewEstimatePage() {
  const t = useT()
  const { clientId } = Route.useSearch()
  return (
    <div className="space-y-6">
      <PageHeader title={t.docs.newEstimate} />
      <DocumentBuilder type="estimate" initialClientId={clientId} />
    </div>
  )
}

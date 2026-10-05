import { createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { DocumentView } from '@/components/documents/document-view'
import { publicDocumentQuery } from '@/data/public/public-document'
import { getDictionary } from '@/lib/i18n'

export const Route = createFileRoute('/i/$token')({
  validateSearch: z.object({ preview: z.coerce.boolean().optional() }),
  loaderDeps: ({ search }) => ({ preview: Boolean(search.preview) }),
  loader: async ({ context, params, deps }) => {
    const doc = await context.queryClient.query({
      ...publicDocumentQuery(params.token, deps.preview),
      staleTime: 'static',
    })
    if (!doc) throw notFound()
    return {
      title: `${getDictionary(doc.language).public[doc.type === 'estimate' ? 'estimate' : 'invoice']} ${doc.number} · ${doc.business.name ?? ''}`,
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title ?? 'Factura Fácil' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: PublicDocumentPage,
  notFoundComponent: PublicNotFound,
})

function PublicDocumentPage() {
  const { token } = Route.useParams()
  const { preview } = Route.useSearch()
  const { data: doc } = useSuspenseQuery(
    publicDocumentQuery(token, Boolean(preview)),
  )
  if (!doc) return <PublicNotFound />
  return <DocumentView doc={doc} pdfHref={`/api/pdf/${token}`} />
}

function PublicNotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold">
          {getDictionary('es').public.notFound}
        </h1>
        <p className="text-muted-foreground text-sm">
          {getDictionary('en').public.notFound}
        </p>
      </div>
    </div>
  )
}

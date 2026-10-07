import { createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { DocumentView } from '@/components/documents/document-view'
import { publicDocumentQuery } from '@/data/public/public-document'
import { fill, getDictionary } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'

export const Route = createFileRoute('/i/$token')({
  validateSearch: z.object({ preview: z.coerce.boolean().optional() }),
  loaderDeps: ({ search }) => ({ preview: Boolean(search.preview) }),
  loader: async ({ context, params, deps }) => {
    const doc = await context.queryClient.query({
      ...publicDocumentQuery(params.token, deps.preview),
      staleTime: 'static',
    })
    if (!doc) throw notFound()
    const dict = getDictionary(doc.language)
    const estimate = doc.type === 'estimate'
    // The card Messenger and WhatsApp draw under the link, in the customer's language.
    const preview = {
      title: fill(
        estimate ? dict.public.ogEstimateTitle : dict.public.ogInvoiceTitle,
        { number: doc.number, business: doc.business.name ?? 'Factura Fácil' },
      ),
      description: fill(
        estimate
          ? dict.public.ogEstimateDescription
          : dict.public.ogInvoiceDescription,
        {
          total: formatCurrency(doc.total, doc.currency, doc.language),
          due: formatDate(doc.dueDate, {
            language: doc.language,
            timezone: doc.business.timezone,
          }),
        },
      ),
      url: `${doc.origin}/i/${params.token}`,
      image: doc.business.logoUrl
        ? `${doc.origin}${doc.business.logoUrl}`
        : null,
      locale: doc.language === 'en' ? 'en_US' : 'es_US',
      alternateLocale: doc.language === 'en' ? 'es_US' : 'en_US',
    }
    return {
      title: `${dict.public[estimate ? 'estimate' : 'invoice']} ${doc.number} · ${doc.business.name ?? ''}`,
      preview,
    }
  },
  head: ({ loaderData }) => {
    const p = loaderData?.preview
    return {
      meta: [
        { title: loaderData?.title ?? 'Factura Fácil' },
        // Kept out of search results; the preview tags below are for chat apps.
        { name: 'robots', content: 'noindex' },
        ...(p
          ? [
              { name: 'description', content: p.description },
              { property: 'og:title', content: p.title },
              { property: 'og:description', content: p.description },
              { property: 'og:url', content: p.url },
              { property: 'og:locale', content: p.locale },
              { property: 'og:locale:alternate', content: p.alternateLocale },
              ...(p.image ? [{ property: 'og:image', content: p.image }] : []),
            ]
          : []),
      ],
    }
  },
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

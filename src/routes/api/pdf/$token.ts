import { createFileRoute } from '@tanstack/react-router'
import puppeteer from '@cloudflare/puppeteer'
import { getDb } from '@/db'
import { loadPublicDocument } from '@/data/public/public-document'
import { getEnv } from '@/lib/env'
import { renderDocumentHtml } from '@/services/document-html'
import { getLogoDataUrl } from '@/services/logo'

const DAY = 60 * 60 * 24

function pdfResponse(
  body: ArrayBuffer | Uint8Array,
  filename: string,
  cache: 'HIT' | 'MISS',
) {
  return new Response(body as BodyInit, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${filename}"`,
      'cache-control': 'private, max-age=300',
      'x-pdf-cache': cache,
    },
  })
}

/** Public: anyone with the token link can download the PDF. */
export const Route = createFileRoute('/api/pdf/$token')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const env = getEnv()
        const doc = await loadPublicDocument(getDb(), params.token, {
          recordPdf: true,
        })
        if (!doc) return new Response('Not found', { status: 404 })

        const filename = `${doc.number}.pdf`
        // Any edit bumps updatedAt, any status change alters the stamp → new cache key.
        const cacheKey = `pdf:${doc.id}:${doc.updatedAt}:${doc.status}`
        const cached = await env.KV.get(cacheKey, 'arrayBuffer')
        if (cached) return pdfResponse(cached, filename, 'HIT')

        const logoDataUrl = await getLogoDataUrl(env.STORAGE, doc.ownerId)
        const html = renderDocumentHtml(doc, { logoDataUrl })

        const browser = await puppeteer.launch(env.BROWSER)
        try {
          const page = await browser.newPage()
          await page.setContent(html, { waitUntil: 'load' })
          const pdf = await page.pdf({
            format: 'letter',
            printBackground: true,
            preferCSSPageSize: true,
          })
          await env.KV.put(cacheKey, pdf, { expirationTtl: DAY })
          return pdfResponse(pdf, filename, 'MISS')
        } finally {
          await browser.close()
        }
      },
    },
  },
})

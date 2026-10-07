import { createFileRoute } from '@tanstack/react-router'
import puppeteer from '@cloudflare/puppeteer'
import { getDb } from '@/db'
import { loadPublicDocument } from '@/data/public/public-document'
import { getEnv } from '@/lib/env'
import { errorForLog } from '@/lib/log'
import { renderDocumentHtml } from '@/services/document-html'
import { getLogoDataUrl } from '@/services/logo'

const DAY = 60 * 60 * 24
const TOKEN = /^[A-Za-z0-9_-]{8,128}$/

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
        if (!TOKEN.test(params.token)) {
          return new Response('Not found', { status: 404 })
        }
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

        let browser: Awaited<ReturnType<typeof puppeteer.launch>>
        try {
          browser = await puppeteer.launch(env.BROWSER)
        } catch (err) {
          // Usually the account's concurrent-browser limit: ask to retry, don't 500.
          console.error(
            JSON.stringify({
              level: 'error',
              msg: 'pdf: browser launch',
              ...errorForLog(err),
            }),
          )
          return new Response('PDF temporarily unavailable', {
            status: 503,
            headers: { 'retry-after': '30', 'cache-control': 'no-store' },
          })
        }
        try {
          const page = await browser.newPage()
          // The HTML carries customer-written text: no scripts, and no network
          // at all (the logo is inlined as a data: URL).
          await page.setJavaScriptEnabled(false)
          await page.setRequestInterception(true)
          page.on('request', (req) => {
            if (req.isInterceptResolutionHandled()) return
            if (req.url().startsWith('data:')) void req.continue()
            else void req.abort()
          })
          await page.setContent(html, { waitUntil: 'load', timeout: 15_000 })
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

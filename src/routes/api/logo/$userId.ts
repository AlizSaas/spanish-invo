import { createFileRoute } from '@tanstack/react-router'
import { getEnv } from '@/lib/env'
import { getLogo } from '@/services/logo'

/** Public: logos appear on customer-facing invoice pages. */
export const Route = createFileRoute('/api/logo/$userId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const obj = await getLogo(getEnv().STORAGE, params.userId)
        if (!obj) return new Response('Not found', { status: 404 })
        const headers = new Headers()
        obj.writeHttpMetadata(headers)
        headers.set('etag', obj.httpEtag)
        headers.set('cache-control', 'public, max-age=3600')
        return new Response(obj.body, { headers })
      },
    },
  },
})

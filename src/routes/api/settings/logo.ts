import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { settings } from '@/db/schema'
import { getAuth } from '@/lib/auth'
import { getEnv } from '@/lib/env'
import {
  LOGO_MAX_BYTES,
  deleteLogo,
  putLogo,
  sniffLogoType,
} from '@/services/logo'

async function requireUser(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers })
  if (!session) throw new Response('Unauthorized', { status: 401 })
  return session.user
}

export const Route = createFileRoute('/api/settings/logo')({
  server: {
    handlers: {
      /** multipart/form-data with a single `file` field */
      POST: async ({ request }) => {
        const user = await requireUser(request)
        // Reject oversized uploads before buffering the multipart body. Browsers
        // always declare the length of a FormData upload.
        const declared = Number(request.headers.get('content-length') ?? 0)
        if (!declared) {
          return Response.json({ error: 'LENGTH_REQUIRED' }, { status: 411 })
        }
        if (declared > LOGO_MAX_BYTES + 16 * 1024)
          return Response.json({ error: 'TOO_LARGE' }, { status: 413 })
        const form = await request.formData()
        const file = form.get('file')
        if (!(file instanceof File))
          return Response.json({ error: 'NO_FILE' }, { status: 400 })
        if (file.size > LOGO_MAX_BYTES)
          return Response.json({ error: 'TOO_LARGE' }, { status: 413 })
        const type = await sniffLogoType(file)
        if (!type) return Response.json({ error: 'BAD_TYPE' }, { status: 415 })

        const env = getEnv()
        const logoUrl = await putLogo(
          env.STORAGE,
          user.id,
          file,
          type,
          env.IMAGES,
        )
        await getDb()
          .update(settings)
          .set({ logoUrl })
          .where(eq(settings.userId, user.id))
        return Response.json({ logoUrl })
      },
      DELETE: async ({ request }) => {
        const user = await requireUser(request)
        await deleteLogo(getEnv().STORAGE, user.id)
        await getDb()
          .update(settings)
          .set({ logoUrl: null })
          .where(eq(settings.userId, user.id))
        return Response.json({ ok: true })
      },
    },
  },
})

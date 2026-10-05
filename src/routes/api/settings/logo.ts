import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { settings } from '@/db/schema'
import { getAuth } from '@/lib/auth'
import { getEnv } from '@/lib/env'
import {
  LOGO_MAX_BYTES,
  LOGO_TYPES,
  deleteLogo,
  putLogo,
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
        // Reject oversized uploads before buffering the multipart body.
        const declared = Number(request.headers.get('content-length') ?? 0)
        if (declared > LOGO_MAX_BYTES + 16 * 1024)
          return Response.json({ error: 'TOO_LARGE' }, { status: 413 })
        const form = await request.formData()
        const file = form.get('file')
        if (!(file instanceof File))
          return Response.json({ error: 'NO_FILE' }, { status: 400 })
        if (!LOGO_TYPES.has(file.type))
          return Response.json({ error: 'BAD_TYPE' }, { status: 415 })
        if (file.size > LOGO_MAX_BYTES)
          return Response.json({ error: 'TOO_LARGE' }, { status: 413 })

        const logoUrl = await putLogo(getEnv().STORAGE, user.id, file)
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

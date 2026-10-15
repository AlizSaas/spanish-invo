import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SignupForm } from '@/components/auth/signup-form'
import { pageUrl } from '@/lib/constants'

const searchSchema = z.object({
  // Set by Better Auth when "Continue with Google" fails.
  error: z.string().optional(),
})

export const Route = createFileRoute('/_auth/signup')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: 'Crear cuenta — Factura Fácil' },
      {
        name: 'description',
        content:
          'Crea tu cuenta gratis: 1 factura y 1 presupuesto al mes sin costo, con un asistente de IA que los prepara por ti y los envía por WhatsApp.',
      },
      { property: 'og:url', content: pageUrl('/signup') },
    ],
    links: [{ rel: 'canonical', href: pageUrl('/signup') }],
  }),
  component: SignupPage,
})

function SignupPage() {
  const { error } = Route.useSearch()
  return <SignupForm oauthError={error} />
}

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
      { title: 'Sign up — Factura Fácil' },
      {
        name: 'description',
        content:
          'Create your free account: 3 invoices and 3 estimates a month at no cost, with an AI assistant that prepares them for you and sends them by WhatsApp.',
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

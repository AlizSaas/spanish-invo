import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginForm } from '@/components/auth/login-form'
import { pageUrl } from '@/lib/constants'

const searchSchema = z.object({
  // Set by Better Auth when "Continue with Google" fails.
  error: z.string().optional(),
})

export const Route = createFileRoute('/_auth/login')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: 'Log in — Factura Fácil' },
      {
        name: 'description',
        content:
          'Log in to your Factura Fácil account to create, send and get paid for your invoices and estimates.',
      },
      { property: 'og:url', content: pageUrl('/login') },
    ],
    links: [{ rel: 'canonical', href: pageUrl('/login') }],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { error } = Route.useSearch()
  return <LoginForm oauthError={error} />
}

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
      { title: 'Entrar — Factura Fácil' },
      {
        name: 'description',
        content:
          'Entra a tu cuenta de Factura Fácil para crear, enviar y cobrar tus facturas y presupuestos.',
      },
      { property: 'og:url', content: pageUrl('/login') },
      { name: 'robots', content: 'noindex' },
    ],
    links: [{ rel: 'canonical', href: pageUrl('/login') }],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { error } = Route.useSearch()
  return <LoginForm oauthError={error} />
}

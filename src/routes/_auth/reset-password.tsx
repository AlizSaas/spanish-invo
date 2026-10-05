import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: 'Nueva contraseña — Factura Fácil' }] }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token, error } = Route.useSearch()
  return <ResetPasswordForm token={token} invalid={Boolean(error)} />
}

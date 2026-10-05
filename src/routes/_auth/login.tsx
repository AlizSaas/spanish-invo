import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/login-form'

export const Route = createFileRoute('/_auth/login')({
  head: () => ({ meta: [{ title: 'Entrar — Factura Fácil' }] }),
  component: LoginForm,
})

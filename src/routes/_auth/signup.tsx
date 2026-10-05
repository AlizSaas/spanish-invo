import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '@/components/auth/signup-form'

export const Route = createFileRoute('/_auth/signup')({
  head: () => ({ meta: [{ title: 'Crear cuenta — Factura Fácil' }] }),
  component: SignupForm,
})

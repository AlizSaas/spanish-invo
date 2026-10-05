import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { requestPasswordReset } from '@/lib/auth-client'
import { useT } from '@/lib/i18n'

const schema = z.object({ email: z.string().trim().email() })
type Values = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const t = useT()
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    // Always show the same confirmation to avoid leaking which emails exist.
    await requestPasswordReset({
      email: values.email,
      redirectTo: '/reset-password',
    })
    setSent(true)
  })

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="bg-accent text-accent-foreground mx-auto flex size-14 items-center justify-center rounded-2xl">
          <MailCheck className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.auth.forgot.title}
        </h1>
        <p className="text-muted-foreground">{t.auth.forgot.sent}</p>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">{t.auth.forgot.backToLogin}</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.auth.forgot.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.auth.forgot.subtitle}</p>
      </div>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t.auth.login.email}</FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>
      </FieldGroup>
      <Button
        type="submit"
        className="h-11 w-full text-base"
        disabled={isSubmitting}
      >
        {isSubmitting && <Spinner />}
        {t.auth.forgot.submit}
      </Button>
      <p className="text-center text-sm">
        <Link to="/login" className="text-primary font-medium hover:underline">
          {t.auth.forgot.backToLogin}
        </Link>
      </p>
    </form>
  )
}

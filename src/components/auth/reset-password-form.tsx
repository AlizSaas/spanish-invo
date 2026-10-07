import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authErrorMessage } from './auth-errors'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { resetPassword } from '@/lib/auth-client'
import { useT } from '@/lib/i18n'

const schema = z
  .object({
    password: z.string().min(8, 'auth.errors.weakPassword'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'auth.reset.mismatch',
  })
type Values = z.infer<typeof schema>

export function ResetPasswordForm({
  token,
  invalid,
}: {
  token?: string
  invalid?: boolean
}) {
  const t = useT()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  if (invalid || !token) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.auth.reset.title}
        </h1>
        <p className="text-destructive">{t.auth.reset.invalidToken}</p>
        <Button asChild className="w-full">
          <Link to="/forgot-password">{t.auth.forgot.submit}</Link>
        </Button>
      </div>
    )
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    const { error } = await resetPassword({
      newPassword: values.password,
      token,
    })
    if (error) {
      setServerError(authErrorMessage(t, error))
      return
    }
    toast.success(t.auth.reset.success)
    await router.navigate({ to: '/login' })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.auth.reset.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.auth.reset.subtitle}</p>
      </div>
      <FieldGroup>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">{t.auth.reset.newPassword}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError
            errors={[
              errors.password && { message: t.auth.errors.weakPassword },
            ]}
          />
        </Field>
        <Field data-invalid={!!errors.confirm}>
          <FieldLabel htmlFor="confirm">
            {t.auth.reset.confirmPassword}
          </FieldLabel>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register('confirm')}
          />
          <FieldError
            errors={[errors.confirm && { message: t.auth.reset.mismatch }]}
          />
        </Field>
      </FieldGroup>
      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          {serverError}
        </p>
      )}
      <Button
        type="submit"
        className="h-11 w-full text-base"
        disabled={isSubmitting}
      >
        {isSubmitting && <Spinner />}
        {t.auth.reset.submit}
      </Button>
    </form>
  )
}

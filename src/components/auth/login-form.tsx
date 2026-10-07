import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
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
import { signIn } from '@/lib/auth-client'
import { useT } from '@/lib/i18n'

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})
type Values = z.infer<typeof schema>

export function LoginForm() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setServerError(authErrorMessage(t, error.code))
      return
    }
    // A tab bounced here after its session ended still caches the previous
    // account's settings and documents; never show them to the new one.
    queryClient.clear()
    await router.invalidate()
    await router.navigate({ to: '/dashboard' })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.auth.login.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.auth.login.subtitle}</p>
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
        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">{t.auth.login.password}</FieldLabel>
            <Link
              to="/forgot-password"
              className="text-primary text-sm hover:underline"
            >
              {t.auth.login.forgot}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError errors={[errors.password]} />
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
        {t.auth.login.submit}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {t.auth.login.noAccount}{' '}
        <Link to="/signup" className="text-primary font-medium hover:underline">
          {t.auth.login.signup}
        </Link>
      </p>
    </form>
  )
}

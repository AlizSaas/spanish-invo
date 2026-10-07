import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { authErrorMessage } from './auth-errors'
import { LegalAgreement } from '@/components/legal/legal-links'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { signUp } from '@/lib/auth-client'
import { LOCALE_HEADER } from '@/lib/constants'
import { useT } from '@/lib/i18n'
import { useUiStore } from '@/stores/ui-store'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8, 'auth.errors.weakPassword'),
})
type Values = z.infer<typeof schema>

export function SignupForm() {
  const t = useT()
  const locale = useUiStore((s) => s.locale)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      // So the welcome emails come in the language they signed up in.
      fetchOptions: { headers: { [LOCALE_HEADER]: locale } },
    })
    if (error) {
      setServerError(authErrorMessage(t, error.code))
      return
    }
    // Drop anything cached for a previous account in this tab (see login-form).
    queryClient.clear()
    await router.invalidate()
    await router.navigate({ to: '/onboarding' })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.auth.signup.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.auth.signup.subtitle}</p>
      </div>

      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">{t.auth.signup.name}</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t.auth.signup.email}</FieldLabel>
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
          <FieldLabel htmlFor="password">{t.auth.signup.password}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldDescription>{t.auth.signup.passwordHint}</FieldDescription>
          <FieldError
            errors={[
              errors.password && { message: t.auth.errors.weakPassword },
            ]}
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
        {t.auth.signup.submit}
      </Button>

      <LegalAgreement />

      <p className="text-muted-foreground text-center text-sm">
        {t.auth.signup.haveAccount}{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          {t.auth.signup.login}
        </Link>
      </p>
    </form>
  )
}

import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { Settings } from '@/db/schema'
import type {
  OnboardingFormInput,
  OnboardingInput,
} from '@/lib/validators/settings'
import { PhoneInput } from '@/components/phone-input'
import { LogoUploader } from '@/components/settings/logo-uploader'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { SETTINGS_QUERY_KEY } from '@/data/settings/queries'
import { completeOnboardingFn } from '@/data/settings/settings'
import { CURRENCIES, TIMEZONES } from '@/lib/constants'
import { errorMessage, resolveMessage, useT } from '@/lib/i18n'
import { onboardingSchema } from '@/lib/validators/settings'
import { useUiStore } from '@/stores/ui-store'

const PAYMENT_SNIPPETS = [
  'Zelle: ',
  'Cash App: $',
  'Venmo: @',
  'Efectivo / Cash',
  'Cheque / Check',
]

export function OnboardingWizard({ settings }: { settings: Settings }) {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const locale = useUiStore((s) => s.locale)
  const setLocale = useUiStore((s) => s.setLocale)
  const [step, setStep] = useState<0 | 1>(0)

  const form = useForm<OnboardingFormInput, unknown, OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName: settings.businessName ?? '',
      businessPhone: settings.businessPhone ?? null,
      logoUrl: settings.logoUrl ?? null,
      defaultCurrency: settings.defaultCurrency as 'USD' | 'MXN',
      timezone: settings.timezone as (typeof TIMEZONES)[number],
      locale,
      paymentInstructions: settings.paymentInstructions ?? '',
    },
  })
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    formState,
  } = form
  const { errors, isSubmitting } = formState

  const mutation = useMutation({
    mutationFn: (data: OnboardingInput) => completeOnboardingFn({ data }),
    onSuccess: async (updated) => {
      // Seed the cache so the /_app guard sees onboarding as complete immediately.
      queryClient.setQueryData(SETTINGS_QUERY_KEY, updated)
      await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY })
      toast.success(t.onboarding.done)
      await router.navigate({ to: '/dashboard' })
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  const next = async () => {
    const ok = await trigger([
      'businessName',
      'businessPhone',
      'logoUrl',
      'defaultCurrency',
      'timezone',
      'locale',
    ])
    if (ok) setStep(1)
  }

  const onSubmit = handleSubmit(
    (values) => mutation.mutate(values),
    (errs) => {
      // Every field except payment instructions lives on step 1, so a hidden
      // error there would make Finish look dead. Go back and show it.
      if (Object.keys(errs).some((k) => k !== 'paymentInstructions')) setStep(0)
    },
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <ol className="flex items-center gap-3 text-sm">
        {[t.onboarding.stepBusiness, t.onboarding.stepPayments].map(
          (label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={
                  'flex size-7 items-center justify-center rounded-full text-xs font-semibold ' +
                  (i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground')
                }
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={i === step ? 'font-medium' : 'text-muted-foreground'}
              >
                {label}
              </span>
              {i === 0 && <span className="bg-border mx-1 h-px w-8" />}
            </li>
          ),
        )}
      </ol>

      {step === 0 && (
        <FieldGroup>
          <Field data-invalid={!!errors.businessName}>
            <FieldLabel htmlFor="businessName">
              {t.onboarding.businessName}
            </FieldLabel>
            <Input
              id="businessName"
              placeholder={t.onboarding.businessNamePlaceholder}
              autoFocus
              aria-invalid={!!errors.businessName}
              {...register('businessName')}
            />
            <FieldError
              errors={[
                errors.businessName && {
                  message: resolveMessage(t, errors.businessName.message),
                },
              ]}
            />
          </Field>

          <Field data-invalid={!!errors.businessPhone}>
            <FieldLabel htmlFor="businessPhone">
              {t.onboarding.businessPhone}{' '}
              <span className="text-muted-foreground font-normal">
                ({t.common.optional})
              </span>
            </FieldLabel>
            <Controller
              control={control}
              name="businessPhone"
              render={({ field }) => (
                <PhoneInput
                  id="businessPhone"
                  ref={field.ref}
                  value={field.value}
                  onChange={(v) => field.onChange(v || null)}
                  onBlur={field.onBlur}
                  invalid={!!errors.businessPhone}
                />
              )}
            />
            <FieldDescription>
              {t.onboarding.businessPhoneHelp}
            </FieldDescription>
            <FieldError
              errors={[
                errors.businessPhone && {
                  message: resolveMessage(t, errors.businessPhone.message),
                },
              ]}
            />
          </Field>

          <Field data-invalid={!!errors.logoUrl}>
            <FieldLabel>{t.onboarding.logo}</FieldLabel>
            <Controller
              control={control}
              name="logoUrl"
              render={({ field }) => (
                <LogoUploader value={field.value} onChange={field.onChange} />
              )}
            />
            <FieldError
              errors={[
                errors.logoUrl && {
                  message: resolveMessage(t, errors.logoUrl.message),
                },
              ]}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field>
              <FieldLabel>{t.onboarding.language}</FieldLabel>
              <Controller
                control={control}
                name="locale"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v: 'es' | 'en') => {
                      field.onChange(v)
                      setLocale(v)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">{t.common.spanish}</SelectItem>
                      <SelectItem value="en">{t.common.english}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel>{t.onboarding.currency}</FieldLabel>
              <Controller
                control={control}
                name="defaultCurrency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel>{t.onboarding.timezone}</FieldLabel>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz
                            .replace('America/', '')
                            .replace('Pacific/', '')
                            .replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="button" size="lg" onClick={next}>
              {t.common.next}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </FieldGroup>
      )}

      {step === 1 && (
        <FieldGroup>
          <Field data-invalid={!!errors.paymentInstructions}>
            <FieldLabel htmlFor="paymentInstructions">
              {t.onboarding.paymentInstructions}
            </FieldLabel>
            <Textarea
              id="paymentInstructions"
              rows={6}
              autoFocus
              placeholder={t.onboarding.paymentInstructionsPlaceholder}
              aria-invalid={!!errors.paymentInstructions}
              {...register('paymentInstructions')}
            />
            <div className="flex flex-wrap gap-2">
              {PAYMENT_SNIPPETS.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-full"
                  onClick={() => {
                    const cur = getValues('paymentInstructions')
                    setValue(
                      'paymentInstructions',
                      cur ? `${cur.replace(/\s+$/, '')}\n${s}` : s,
                      {
                        shouldDirty: true,
                      },
                    )
                    document.getElementById('paymentInstructions')?.focus()
                  }}
                >
                  + {s.replace(/[\s:$@]+$/, '')}
                </Button>
              ))}
            </div>
            <FieldDescription>
              {t.onboarding.paymentInstructionsHelp}
            </FieldDescription>
            <FieldError
              errors={[
                errors.paymentInstructions && {
                  message: resolveMessage(
                    t,
                    errors.paymentInstructions.message,
                  ),
                },
              ]}
            />
          </Field>

          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft className="size-4" />
              {t.common.back}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || mutation.isPending}
            >
              {(isSubmitting || mutation.isPending) && <Spinner />}
              {t.onboarding.finish}
            </Button>
          </div>
        </FieldGroup>
      )}
    </form>
  )
}

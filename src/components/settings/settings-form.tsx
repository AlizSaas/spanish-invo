import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { z } from 'zod'
import type { Settings } from '@/db/schema'
import { PhoneInput } from '@/components/phone-input'
import { LogoUploader } from '@/components/settings/logo-uploader'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { updateSettingsFn } from '@/data/settings/settings'
import { CURRENCIES, TIMEZONES } from '@/lib/constants'
import { errorMessage, resolveMessage, useT } from '@/lib/i18n'
import { updateSettingsSchema } from '@/lib/validators/settings'
import { useUiStore } from '@/stores/ui-store'

type FormInput = z.input<typeof updateSettingsSchema>
type FormOutput = z.output<typeof updateSettingsSchema>

export function SettingsForm({ settings }: { settings: Settings }) {
  const t = useT()
  const queryClient = useQueryClient()
  const setLocale = useUiStore((s) => s.setLocale)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      businessName: settings.businessName ?? '',
      businessPhone: settings.businessPhone ?? null,
      businessEmail: settings.businessEmail ?? '',
      businessAddress: settings.businessAddress ?? '',
      logoUrl: settings.logoUrl ?? null,
      locale: settings.locale,
      defaultInvoiceLanguage: settings.defaultInvoiceLanguage,
      timezone: settings.timezone as (typeof TIMEZONES)[number],
      defaultCurrency: settings.defaultCurrency as 'USD' | 'MXN',
      paymentInstructions: settings.paymentInstructions ?? '',
      defaultDueDays: settings.defaultDueDays,
      defaultTaxRate: Number(settings.defaultTaxRate),
      defaultNotes: settings.defaultNotes ?? '',
      invoicePrefix: settings.invoicePrefix,
      nextInvoiceNumber: settings.nextInvoiceNumber,
      estimatePrefix: settings.estimatePrefix,
      nextEstimateNumber: settings.nextEstimateNumber,
    },
  })
  const { register, control, handleSubmit, formState, reset } = form
  const { errors, isDirty } = formState

  const mutation = useMutation({
    mutationFn: (data: FormOutput) => updateSettingsFn({ data }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, updated)
      await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY })
      setLocale(updated.locale)
      toast.success(t.settings.saved)
      reset(undefined, { keepValues: true })
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.business}</CardTitle>
          <CardDescription>{t.settings.businessHelp}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>{t.onboarding.logo}</FieldLabel>
              <Controller
                control={control}
                name="logoUrl"
                render={({ field }) => (
                  <LogoUploader value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field data-invalid={!!errors.businessName}>
                <FieldLabel htmlFor="businessName">
                  {t.onboarding.businessName}
                </FieldLabel>
                <Input
                  id="businessName"
                  aria-invalid={!!errors.businessName}
                  {...register('businessName')}
                />
                <FieldError errors={[errors.businessName]} />
              </Field>
              <Field data-invalid={!!errors.businessPhone}>
                <FieldLabel htmlFor="businessPhone">
                  {t.onboarding.businessPhone}
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
                <FieldError
                  errors={[
                    errors.businessPhone && {
                      message: resolveMessage(t, errors.businessPhone.message),
                    },
                  ]}
                />
              </Field>
              <Field data-invalid={!!errors.businessEmail}>
                <FieldLabel htmlFor="businessEmail">
                  {t.settings.businessEmail}
                </FieldLabel>
                <Input
                  id="businessEmail"
                  type="email"
                  aria-invalid={!!errors.businessEmail}
                  {...register('businessEmail')}
                />
                <FieldError errors={[errors.businessEmail]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="businessAddress">
                  {t.settings.businessAddress}
                </FieldLabel>
                <Textarea
                  id="businessAddress"
                  rows={2}
                  {...register('businessAddress')}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.payments}</CardTitle>
          <CardDescription>
            {t.onboarding.paymentInstructionsHelp}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="paymentInstructions">
              {t.onboarding.paymentInstructions}
            </FieldLabel>
            <Textarea
              id="paymentInstructions"
              rows={5}
              placeholder={t.onboarding.paymentInstructionsPlaceholder}
              {...register('paymentInstructions')}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.documents}</CardTitle>
          <CardDescription>{t.settings.documentsHelp}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel>{t.settings.defaultInvoiceLanguage}</FieldLabel>
                <Controller
                  control={control}
                  name="defaultInvoiceLanguage"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
              <Field data-invalid={!!errors.defaultDueDays}>
                <FieldLabel htmlFor="defaultDueDays">
                  {t.settings.defaultDueDays}
                </FieldLabel>
                <Input
                  id="defaultDueDays"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={365}
                  {...register('defaultDueDays', { valueAsNumber: true })}
                />
                <FieldDescription>
                  {t.settings.defaultDueDaysHelp}
                </FieldDescription>
                <FieldError errors={[errors.defaultDueDays]} />
              </Field>
              <Field data-invalid={!!errors.defaultTaxRate}>
                <FieldLabel htmlFor="defaultTaxRate">
                  {t.settings.defaultTaxRate}
                </FieldLabel>
                <Input
                  id="defaultTaxRate"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  max={100}
                  {...register('defaultTaxRate', { valueAsNumber: true })}
                />
                <FieldError errors={[errors.defaultTaxRate]} />
              </Field>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
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
                              .replace(/^(America|Pacific)\//, '')
                              .replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="defaultNotes">
                  {t.settings.defaultNotes}
                </FieldLabel>
                <Textarea
                  id="defaultNotes"
                  rows={2}
                  {...register('defaultNotes')}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.numbering}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field data-invalid={!!errors.invoicePrefix}>
              <FieldLabel htmlFor="invoicePrefix">
                {t.settings.invoicePrefix}
              </FieldLabel>
              <Input
                id="invoicePrefix"
                maxLength={8}
                className="uppercase"
                {...register('invoicePrefix')}
              />
              <FieldError errors={[errors.invoicePrefix]} />
            </Field>
            <Field data-invalid={!!errors.nextInvoiceNumber}>
              <FieldLabel htmlFor="nextInvoiceNumber">
                {t.settings.nextInvoiceNumber}
              </FieldLabel>
              <Input
                id="nextInvoiceNumber"
                type="number"
                inputMode="numeric"
                min={1}
                {...register('nextInvoiceNumber', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.nextInvoiceNumber]} />
            </Field>
            <Field data-invalid={!!errors.estimatePrefix}>
              <FieldLabel htmlFor="estimatePrefix">
                {t.settings.estimatePrefix}
              </FieldLabel>
              <Input
                id="estimatePrefix"
                maxLength={8}
                className="uppercase"
                {...register('estimatePrefix')}
              />
              <FieldError errors={[errors.estimatePrefix]} />
            </Field>
            <Field data-invalid={!!errors.nextEstimateNumber}>
              <FieldLabel htmlFor="nextEstimateNumber">
                {t.settings.nextEstimateNumber}
              </FieldLabel>
              <Input
                id="nextEstimateNumber"
                type="number"
                inputMode="numeric"
                min={1}
                {...register('nextEstimateNumber', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.nextEstimateNumber]} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.appLanguage}</CardTitle>
        </CardHeader>
        <CardContent>
          <Field className="max-w-xs">
            <Controller
              control={control}
              name="locale"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
        </CardContent>
      </Card>

      <div className="bg-background/80 sticky bottom-0 -mx-4 flex justify-end gap-2 border-t px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Button
          type="submit"
          size="lg"
          disabled={!isDirty || mutation.isPending}
        >
          {mutation.isPending && <Spinner />}
          {t.common.save}
        </Button>
      </div>
    </form>
  )
}

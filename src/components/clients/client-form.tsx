import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Client } from '@/db/schema'
import type { ClientFormInput } from '@/lib/validators/clients'
import { PhoneInput } from '@/components/phone-input'
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
import { resolveMessage, useT } from '@/lib/i18n'
import { clientInputSchema } from '@/lib/validators/clients'

/**
 * Validates in the browser for instant feedback but submits the *raw* input;
 * the server function re-runs the same schema and owns normalization
 * (E.164 phone, lower-cased email, empty → null).
 */
export function ClientForm({
  client,
  onSubmit,
  onCancel,
  pending,
  submitLabel,
}: {
  client?: Client | null
  onSubmit: (values: ClientFormInput) => void
  onCancel?: () => void
  pending?: boolean
  submitLabel?: string
}) {
  const t = useT()
  const { register, control, handleSubmit, formState } =
    useForm<ClientFormInput>({
      resolver: zodResolver(clientInputSchema, undefined, { raw: true }),
      defaultValues: {
        name: client?.name ?? '',
        phone: client?.phone ?? '',
        email: client?.email ?? '',
        company: client?.company ?? '',
        address: client?.address ?? '',
        notes: client?.notes ?? '',
        preferredLanguage: client?.preferredLanguage ?? 'es',
      },
    })
  const { errors } = formState
  const err = (m?: string) =>
    m ? { message: resolveMessage(t, m) } : undefined

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">{t.clients.name}</FieldLabel>
          <Input
            id="name"
            autoFocus
            autoComplete="off"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <FieldError errors={[err(errors.name?.message)]} />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">{t.clients.phone}</FieldLabel>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput
                  id="phone"
                  ref={field.ref}
                  autoComplete="off"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!errors.phone}
                />
              )}
            />
            <FieldDescription>{t.clients.phoneHelp}</FieldDescription>
            <FieldError errors={[err(errors.phone?.message)]} />
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">
              {t.clients.email}{' '}
              <span className="text-muted-foreground font-normal">
                ({t.common.optional})
              </span>
            </FieldLabel>
            <Input
              id="email"
              type="email"
              inputMode="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            <FieldError
              errors={[errors.email && { message: t.clients.email }]}
            />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="company">
              {t.clients.company}{' '}
              <span className="text-muted-foreground font-normal">
                ({t.common.optional})
              </span>
            </FieldLabel>
            <Input id="company" {...register('company')} />
          </Field>
          <Field>
            <FieldLabel>{t.clients.preferredLanguage}</FieldLabel>
            <Controller
              control={control}
              name="preferredLanguage"
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
            <FieldDescription>
              {t.clients.preferredLanguageHelp}
            </FieldDescription>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="address">
            {t.clients.address}{' '}
            <span className="text-muted-foreground font-normal">
              ({t.common.optional})
            </span>
          </FieldLabel>
          <Textarea id="address" rows={2} {...register('address')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="notes">
            {t.clients.notes}{' '}
            <span className="text-muted-foreground font-normal">
              ({t.common.optional})
            </span>
          </FieldLabel>
          <Textarea id="notes" rows={2} {...register('notes')} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {submitLabel ?? t.common.save}
        </Button>
      </div>
    </form>
  )
}

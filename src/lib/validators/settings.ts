import { z } from 'zod'
import { CURRENCIES, LANGUAGES, TIMEZONES } from '@/lib/constants'
import { phoneSchema } from '@/lib/validators/phone'

/**
 * Logo URLs are issued by /api/settings/logo as app-relative paths
 * (`/api/logo/<userId>?v=…`). Only that shape is accepted, and the server
 * ignores the field anyway (the upload route is the source of truth), so a
 * form can't point the public page or the PDF renderer at an external URL.
 */
const logoUrlSchema = z
  .string()
  .trim()
  .max(256)
  .regex(
    /^\/api\/logo\/[A-Za-z0-9_-]+(\?v=\d+)?$/,
    'Logo inválido. Súbelo de nuevo.',
  )

/** Document number prefix: must be safe inside a Content-Disposition filename. */
const prefixSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(8)
  .regex(/^[A-Z0-9-]+$/, 'Usa solo letras, números o guion')

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()

/** Fields collected on the onboarding screen right after signup. */
export const onboardingSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre de tu negocio')
    .max(120),
  businessPhone: phoneSchema.nullable().optional(),
  logoUrl: logoUrlSchema.nullable().optional(),
  defaultCurrency: z.enum(CURRENCIES),
  timezone: z.enum(TIMEZONES),
  locale: z.enum(LANGUAGES).default('es'),
  paymentInstructions: z
    .string()
    .trim()
    .min(3, 'Explica cómo te pueden pagar (Zelle, Cash App, efectivo…)')
    .max(1000),
})
export type OnboardingFormInput = z.input<typeof onboardingSchema>
export type OnboardingInput = z.output<typeof onboardingSchema>

/** Next document number. Postgres integer, with room left to keep counting. */
const nextNumberSchema = z.number().int().positive().max(99_999_999)

/** Everything editable later from the Settings page. All optional (PATCH semantics). */
export const updateSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120).optional(),
  businessPhone: phoneSchema.nullable().optional(),
  businessEmail: z
    .string()
    .trim()
    .max(254)
    .email()
    .nullable()
    .optional()
    .or(z.literal('')),
  businessAddress: optionalText(500),
  logoUrl: logoUrlSchema.nullable().optional(),
  locale: z.enum(LANGUAGES).optional(),
  defaultInvoiceLanguage: z.enum(LANGUAGES).optional(),
  timezone: z.enum(TIMEZONES).optional(),
  defaultCurrency: z.enum(CURRENCIES).optional(),
  paymentInstructions: optionalText(1000),
  defaultDueDays: z.number().int().min(0).max(365).optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  defaultNotes: optionalText(1000),
  invoicePrefix: prefixSchema.optional(),
  nextInvoiceNumber: nextNumberSchema.optional(),
  estimatePrefix: prefixSchema.optional(),
  nextEstimateNumber: nextNumberSchema.optional(),
})
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>

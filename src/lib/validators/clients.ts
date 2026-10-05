import { z } from 'zod'
import { LANGUAGES } from '@/lib/constants'
import { normalizePhone } from '@/lib/utils'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()

/**
 * Error messages are dictionary paths (see resolveMessage in lib/i18n) so the
 * same schema validates in the browser form and on the server.
 */
export const clientInputSchema = z
  .object({
    name: z.string().trim().min(1, 'clients.name').max(120),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .transform((v, ctx) => {
        if (!v) return null
        const normalized = normalizePhone(v)
        if (!normalized) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'clients.invalidPhone',
          })
          return z.NEVER
        }
        return normalized
      }),
    email: z
      .string()
      .trim()
      .max(254)
      .optional()
      .transform((v, ctx) => {
        if (!v) return null
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'clients.email',
          })
          return z.NEVER
        }
        return v.toLowerCase()
      }),
    company: optionalText(120),
    address: optionalText(500),
    notes: optionalText(2000),
    preferredLanguage: z.enum(LANGUAGES).default('es'),
  })
  .superRefine((v, ctx) => {
    if (!v.phone && !v.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'clients.contactRequired',
      })
    }
  })

export type ClientFormInput = z.input<typeof clientInputSchema>
export type ClientInput = z.output<typeof clientInputSchema>

export const updateClientSchema = z.object({
  id: z.string().min(1),
  data: clientInputSchema,
})

export const listClientsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  includeArchived: z.boolean().optional(),
})

export const clientIdSchema = z.object({ id: z.string().min(1) })

export const setClientArchivedSchema = z.object({
  id: z.string().min(1),
  archived: z.boolean(),
})

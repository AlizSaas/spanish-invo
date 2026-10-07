import { z } from 'zod'
import { normalizePhone } from '@/lib/phone'

/**
 * Phone → E.164, '' → null. Messages are dictionary paths (see resolveMessage
 * in lib/i18n); a number without "+" never got a country code.
 */
export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .transform((v, ctx) => {
    if (!v) return null
    const normalized = normalizePhone(v)
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: v.startsWith('+')
          ? 'clients.invalidPhone'
          : 'phone.needCountry',
      })
      return z.NEVER
    }
    return normalized
  })

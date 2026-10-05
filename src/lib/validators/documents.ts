import { z } from 'zod'
import {
  CURRENCIES,
  DISCOUNT_TYPES,
  DOCUMENT_TYPES,
  INVOICE_STATUSES,
  LANGUAGES,
  PAYMENT_METHODS,
} from '@/lib/constants'
import { DATE_ONLY } from '@/lib/dates'

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, 'docs.builder.needItem').max(500),
  quantity: z.number().positive().max(999_999),
  unitPrice: z.number().min(0).max(99_999_999),
  taxRate: z.number().min(0).max(100).nullable().optional(),
})

export const documentInputSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  clientId: z.string().min(1, 'docs.builder.needClient'),
  language: z.enum(LANGUAGES),
  issueDate: z.string().regex(DATE_ONLY),
  dueDate: z.string().regex(DATE_ONLY),
  currency: z.enum(CURRENCIES),
  items: z.array(lineItemSchema).min(1, 'docs.builder.needItem').max(100),
  discountType: z.enum(DISCOUNT_TYPES).nullable().optional(),
  discountValue: z.number().min(0).nullable().optional(),
  depositAmount: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  paymentInstructionsOverride: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),
})
export type DocumentInput = z.infer<typeof documentInputSchema>

export const updateDocumentSchema = z.object({
  id: z.string().min(1),
  data: documentInputSchema.omit({ type: true }),
})

export const documentIdSchema = z.object({ id: z.string().min(1) })

export const listDocumentsSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  status: z.enum(INVOICE_STATUSES).optional(),
  clientId: z.string().optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.number().int().min(1).max(500).optional(),
})
export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>

export const markPaidSchema = z.object({
  id: z.string().min(1),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paidAt: z.string().regex(DATE_ONLY).optional(),
})

export const shareChannelSchema = z.enum(['whatsapp', 'sms', 'link'])
export type ShareChannel = z.infer<typeof shareChannelSchema>

export const recordShareSchema = z.object({
  id: z.string().min(1),
  channel: shareChannelSchema,
  message: z.string().trim().max(1200).optional(),
})

export const publicTokenSchema = z.object({
  token: z.string().min(8).max(128),
  /** Owner preview: don't log a "viewed" event or flip the status */
  preview: z.boolean().optional(),
})

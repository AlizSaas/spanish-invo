import type {
  DiscountType,
  DocumentType,
  InvoiceEventType,
  InvoiceStatus,
  Language,
} from './constants'

/** Read-only shape served to the public invoice page and the PDF renderer. */
export interface PublicDocument {
  id: string
  ownerId: string
  updatedAt: string // ISO, used as a PDF cache key
  type: DocumentType
  number: string
  status: InvoiceStatus
  language: Language
  issueDate: string // ISO
  dueDate: string // ISO
  currency: string
  subtotal: number
  taxTotal: number
  discountType: DiscountType | null
  discountValue: number | null
  discountAmount: number
  total: number
  depositAmount: number | null
  notes: string | null
  /** Already resolved: override if present, otherwise the business default */
  paymentInstructions: string | null
  paidAt: string | null
  paymentMethod: string | null
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxRate: number | null
    amount: number
  }>
  client: {
    name: string
    company: string | null
    address: string | null
    phone: string | null
    email: string | null
  }
  business: {
    name: string | null
    phone: string | null
    email: string | null
    address: string | null
    logoUrl: string | null
    timezone: string
  }
}

export interface TimelineEvent {
  id: string
  eventType: InvoiceEventType | string
  metadata: Record<string, string | number | boolean | null> | null
  createdAt: string
}

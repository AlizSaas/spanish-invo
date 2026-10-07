// Shared constants. Postgres enums in src/db/schema.ts are derived from these
// so the DB, zod validators and UI always agree.

export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'paid',
  'void',
  'overdue',
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const DOCUMENT_TYPES = ['estimate', 'invoice'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const LANGUAGES = ['es', 'en'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'es'
/** Sent by the signup and forgot-password forms so auth emails match the UI language. */
export const LOCALE_HEADER = 'x-locale'

export const DISCOUNT_TYPES = ['percentage', 'fixed'] as const
export type DiscountType = (typeof DISCOUNT_TYPES)[number]

// Stored as plain text on invoices.paymentMethod (per spec), validated with zod.
export const PAYMENT_METHODS = [
  'zelle',
  'cash',
  'cashapp',
  'venmo',
  'check',
  'other',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const CURRENCIES = ['USD', 'MXN'] as const
export type Currency = (typeof CURRENCIES)[number]
export const DEFAULT_CURRENCY: Currency = 'USD'

// US zones first (primary market), then common Latin American zones.
export const TIMEZONES = [
  'America/Chicago',
  'America/New_York',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Puerto_Rico',
  'America/Mexico_City',
  'America/Guatemala',
  'America/El_Salvador',
  'America/Tegucigalpa',
  'America/Bogota',
  'America/Lima',
  'America/Santo_Domingo',
] as const
export type Timezone = (typeof TIMEZONES)[number]
export const DEFAULT_TIMEZONE: Timezone = 'America/Chicago'

export const INVOICE_EVENT_TYPES = [
  'created',
  'updated',
  'sent_whatsapp',
  'sent_messenger',
  'sent_sms',
  'link_copied',
  'viewed',
  'pdf_downloaded',
  'marked_paid',
  'voided',
  'converted_to_invoice',
] as const
export type InvoiceEventType = (typeof INVOICE_EVENT_TYPES)[number]

export const DEFAULT_INVOICE_PREFIX = 'INV'
export const DEFAULT_ESTIMATE_PREFIX = 'EST'
export const DEFAULT_DUE_DAYS = 15

/** Public site origin (SEO tags, legal pages). Runtime links use env.BETTER_AUTH_URL. */
export const SITE_URL = 'https://facturafacilapp.com'
/** Shown in the footer, legal pages and security.txt. Needs a real mailbox (Email Routing). */
export const SUPPORT_EMAIL = 'support@facturafacilapp.com'

// Abuse limits. SMS goes out through our Twilio account and the assistant
// through our OpenAI key, so every signed-in user gets a per-account budget.
export const SMS_MAX_CHARS = 480
export const SMS_DAILY_LIMIT = 50
export const AI_MESSAGES_PER_HOUR = 60

/**
 * Off until Twilio approves the toll-free / A2P 10DLC verification. Hides the
 * SMS share button and makes the server refuse the channel even when the
 * Twilio secrets are set. /sms-consent stays live: the review links to it.
 * Typed as boolean so the gated code still type-checks and lints while off.
 */
export const SMS_ENABLED = false as boolean

/** Display prices for the pricing page. Stripe (STRIPE_PRICE_* vars) is the source of truth for billing. */
export const PRO_MONTHLY_PRICE = 19.99
export const PRO_YEARLY_PRICE = 199

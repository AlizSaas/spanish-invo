import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  DEFAULT_CURRENCY,
  DEFAULT_DUE_DAYS,
  DEFAULT_ESTIMATE_PREFIX,
  DEFAULT_INVOICE_PREFIX,
  DEFAULT_TIMEZONE,
  DISCOUNT_TYPES,
  DOCUMENT_TYPES,
  INVOICE_STATUSES,
  LANGUAGES,
} from '@/lib/constants'

/** JSON-safe metadata stored on invoice events (must serialize across server functions). */
export type EventMetadata = Record<string, string | number | boolean | null>

/** Any JSON value; used for jsonb columns that must round-trip through server functions. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue }

// ---------------------------------------------------------------------------
// Column helpers
// ---------------------------------------------------------------------------

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

const ts = (name: string) => timestamp(name, { withTimezone: true })

const createdAt = () => ts('created_at').notNull().defaultNow()
const updatedAt = () =>
  ts('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

// Money: numeric avoids float drift. Values round-trip as strings in Drizzle.
const money = (name: string) => numeric(name, { precision: 12, scale: 2 })

// ---------------------------------------------------------------------------
// Better Auth tables (default model names: user / session / account / verification)
// ---------------------------------------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  /** Set by the Better Auth Stripe plugin the first time the user checks out. */
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: ts('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_session_user_id').on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: ts('access_token_expires_at'),
    refreshTokenExpiresAt: ts('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_account_user_id').on(t.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: ts('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_verification_identifier').on(t.identifier)],
)

/**
 * Owned by the Better Auth Stripe plugin (model "subscription"): written from
 * Stripe webhooks, read by lib/plan.ts. `referenceId` is the user id.
 */
export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    plan: text('plan').notNull(),
    referenceId: text('reference_id').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    status: text('status').notNull().default('incomplete'),
    periodStart: ts('period_start'),
    periodEnd: ts('period_end'),
    trialStart: ts('trial_start'),
    trialEnd: ts('trial_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    cancelAt: ts('cancel_at'),
    canceledAt: ts('canceled_at'),
    endedAt: ts('ended_at'),
    seats: integer('seats'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_subscription_reference_id').on(t.referenceId)],
)

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const invoiceStatusEnum = pgEnum('invoice_status', INVOICE_STATUSES)
export const documentTypeEnum = pgEnum('document_type', DOCUMENT_TYPES)
export const languageEnum = pgEnum('language', LANGUAGES)
export const discountTypeEnum = pgEnum('discount_type', DISCOUNT_TYPES)

// ---------------------------------------------------------------------------
// Settings — one row per owner. Created at onboarding. `userId` is UNIQUE (indexed).
// ---------------------------------------------------------------------------

export const settings = pgTable('settings', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),

  // Business profile (shown on invoices)
  businessName: text('business_name'),
  businessPhone: text('business_phone'), // E.164, shown on invoice so customers can reply
  businessEmail: text('business_email'),
  businessAddress: text('business_address'),
  logoUrl: text('logo_url'),

  // Localization
  locale: languageEnum('locale').notNull().default('es'), // app shell language
  defaultInvoiceLanguage: languageEnum('default_invoice_language')
    .notNull()
    .default('es'), // pre-selected on new invoices; overridable per invoice
  timezone: text('timezone').notNull().default(DEFAULT_TIMEZONE),
  defaultCurrency: text('default_currency').notNull().default(DEFAULT_CURRENCY),

  // Getting paid (v1: manual). Free text, e.g. "Zelle: 502-555-0100 · Cash App: $Shop"
  paymentInstructions: text('payment_instructions'),

  // Invoice defaults
  defaultDueDays: integer('default_due_days')
    .notNull()
    .default(DEFAULT_DUE_DAYS),
  defaultTaxRate: numeric('default_tax_rate', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  defaultNotes: text('default_notes'),

  // Numbering (separate sequences so EST-0001 and INV-0001 never collide)
  invoicePrefix: text('invoice_prefix')
    .notNull()
    .default(DEFAULT_INVOICE_PREFIX),
  nextInvoiceNumber: integer('next_invoice_number').notNull().default(1),
  estimatePrefix: text('estimate_prefix')
    .notNull()
    .default(DEFAULT_ESTIMATE_PREFIX),
  nextEstimateNumber: integer('next_estimate_number').notNull().default(1),

  onboardingCompletedAt: ts('onboarding_completed_at'),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clients = pgTable(
  'clients',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // Phone is the primary channel (WhatsApp/SMS). Email is optional for this audience.
    // The CHECK below guarantees at least one contact method at the DB level.
    phone: text('phone'), // normalized E.164, e.g. +15025550100
    email: text('email'),
    company: text('company'),
    address: text('address'),
    notes: text('notes'),
    preferredLanguage: languageEnum('preferred_language')
      .notNull()
      .default('es'),
    archived: boolean('archived').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_clients_user_id').on(t.userId),
    index('idx_clients_user_phone').on(t.userId, t.phone),
    index('idx_clients_user_archived').on(t.userId, t.archived),
    check(
      'chk_clients_contact',
      sql`${t.phone} IS NOT NULL OR ${t.email} IS NOT NULL`,
    ),
  ],
)

// ---------------------------------------------------------------------------
// Invoices + Estimates (same table, discriminated by `type`)
// ---------------------------------------------------------------------------

export const invoices = pgTable(
  'invoices',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),

    type: documentTypeEnum('type').notNull().default('invoice'),
    invoiceNumber: text('invoice_number').notNull(), // "INV-0001" or "EST-0001"
    status: invoiceStatusEnum('status').notNull().default('draft'),
    language: languageEnum('language').notNull().default('es'), // language of the document itself

    issueDate: ts('issue_date').notNull(),
    // For estimates this is the "valid until" date; `overdue` only applies to type='invoice'.
    dueDate: ts('due_date').notNull(),
    currency: text('currency').notNull().default(DEFAULT_CURRENCY),

    subtotal: money('subtotal').notNull().default('0'),
    taxTotal: money('tax_total').notNull().default('0'),
    discountType: discountTypeEnum('discount_type'),
    discountValue: money('discount_value'),
    discountAmount: money('discount_amount').notNull().default('0'),
    total: money('total').notNull().default('0'),

    // Estimates only: requested up-front deposit
    depositAmount: money('deposit_amount'),

    notes: text('notes'),
    // When null the invoice shows settings.paymentInstructions
    paymentInstructionsOverride: text('payment_instructions_override'),

    // Manual "mark as paid" (v1 has no payment processing)
    paidAt: ts('paid_at'),
    paymentMethod: text('payment_method'), // zelle | cash | cashapp | venmo | check | other

    // Send/view tracking for the dashboard
    sentAt: ts('sent_at'),
    viewedAt: ts('viewed_at'),

    // Set on the invoice that was created from an estimate
    estimateId: text('estimate_id').references((): AnyPgColumn => invoices.id, {
      onDelete: 'set null',
    }),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('uq_invoices_user_number').on(t.userId, t.invoiceNumber),
    index('idx_invoices_user_id').on(t.userId),
    index('idx_invoices_client_id').on(t.clientId),
    index('idx_invoices_user_type_status').on(t.userId, t.type, t.status),
    index('idx_invoices_due_date').on(t.dueDate),
    index('idx_invoices_user_created').on(t.userId, t.createdAt),
    index('idx_invoices_estimate_id').on(t.estimateId),
  ],
)

export const invoiceItems = pgTable(
  'invoice_items',
  {
    id: id(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 })
      .notNull()
      .default('1'),
    unitPrice: money('unit_price').notNull().default('0'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }), // percent, e.g. 8.25
    amount: money('amount').notNull().default('0'), // quantity * unitPrice (pre-tax)
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('idx_invoice_items_invoice_id').on(t.invoiceId)],
)

export const invoiceEvents = pgTable(
  'invoice_events',
  {
    id: id(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(), // see INVOICE_EVENT_TYPES
    metadata: jsonb('metadata').$type<EventMetadata>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('idx_invoice_events_invoice_id').on(t.invoiceId),
    index('idx_invoice_events_invoice_type').on(t.invoiceId, t.eventType),
  ],
)

// One public token per invoice; this powers the /i/$token page and PDF download.
// `token` and `invoiceId` are UNIQUE, which already gives Postgres the lookup indexes.
export const invoicePublicTokens = pgTable('invoice_public_tokens', {
  id: id(),
  invoiceId: text('invoice_id')
    .notNull()
    .unique()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: ts('expires_at'), // null = never expires
  createdAt: createdAt(),
})

// ---------------------------------------------------------------------------
// AI assistant chat history (per owner). Parts are the AI SDK UIMessage parts.
// ---------------------------------------------------------------------------

export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: text('id').primaryKey(), // client-generated UUID (useChat id)
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_ai_conversations_user_updated').on(t.userId, t.updatedAt)],
)

export const aiMessages = pgTable(
  'ai_messages',
  {
    id: text('id').primaryKey(), // UIMessage id
    conversationId: text('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // user | assistant | system
    parts: jsonb('parts').$type<Array<JsonValue>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('idx_ai_messages_conversation').on(t.conversationId, t.createdAt),
  ],
)

/**
 * One row per assistant model run, for the AI budget (see worker/routes/chat.ts).
 * Kept apart from the chat history on purpose: deleting a conversation or
 * replaying a message id must not hand the budget back. Pruned by the daily cron.
 */
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Finishing an approved write rather than asking a new question. */
    continuation: boolean('continuation').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('idx_ai_usage_user_created').on(t.userId, t.createdAt)],
)

// ---------------------------------------------------------------------------
// Inferred row types
// ---------------------------------------------------------------------------

export type User = typeof user.$inferSelect
export type Settings = typeof settings.$inferSelect
export type NewSettings = typeof settings.$inferInsert
export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type InvoiceItem = typeof invoiceItems.$inferSelect
export type NewInvoiceItem = typeof invoiceItems.$inferInsert
export type InvoiceEvent = typeof invoiceEvents.$inferSelect
export type InvoicePublicToken = typeof invoicePublicTokens.$inferSelect

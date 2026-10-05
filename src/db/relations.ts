import { relations } from 'drizzle-orm'
import {
  account,
  aiConversations,
  aiMessages,
  clients,
  invoiceEvents,
  invoiceItems,
  invoicePublicTokens,
  invoices,
  session,
  settings,
  user,
} from './schema'

export const userRelations = relations(user, ({ one, many }) => ({
  settings: one(settings, { fields: [user.id], references: [settings.userId] }),
  sessions: many(session),
  accounts: many(account),
  clients: many(clients),
  invoices: many(invoices),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(user, { fields: [settings.userId], references: [user.id] }),
}))

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(user, { fields: [clients.userId], references: [user.id] }),
  invoices: many(invoices),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(user, { fields: [invoices.userId], references: [user.id] }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  events: many(invoiceEvents),
  // No `publicToken` relation on purpose: the token row is optional, but a one()
  // relation keyed on invoices.id (NOT NULL) would be typed as always present.
  // estimate -> invoice link (self relation)
  estimate: one(invoices, {
    fields: [invoices.estimateId],
    references: [invoices.id],
    relationName: 'estimate_conversion',
  }),
  convertedInvoices: many(invoices, { relationName: 'estimate_conversion' }),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}))

export const invoiceEventsRelations = relations(invoiceEvents, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceEvents.invoiceId],
    references: [invoices.id],
  }),
}))

export const invoicePublicTokensRelations = relations(
  invoicePublicTokens,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoicePublicTokens.invoiceId],
      references: [invoices.id],
    }),
  }),
)

export const aiConversationsRelations = relations(
  aiConversations,
  ({ one, many }) => ({
    user: one(user, {
      fields: [aiConversations.userId],
      references: [user.id],
    }),
    messages: many(aiMessages),
  }),
)

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}))

import { tool } from 'ai'
import { z } from 'zod'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  sum,
} from 'drizzle-orm'
import type { Database } from '@/db'
import type { Settings } from '@/db/schema'
import type { InvoiceStatus } from '@/lib/constants'
import {
  clients,
  invoiceEvents,
  invoiceItems,
  invoicePublicTokens,
  invoices,
} from '@/db/schema'
import { DOCUMENT_TYPES, INVOICE_STATUSES } from '@/lib/constants'
import { DATE_ONLY, dateOnlyToDb } from '@/lib/dates'
import { docPath } from '@/components/documents/doc-link'
import { semanticSearch } from '@/services/vectors'

export interface ToolContext {
  db: Database
  env: Env
  userId: string
  settings: Settings | undefined
  /** Origin used to build absolute public links, e.g. https://app.example.com */
  baseUrl: string
}

const OUTSTANDING: Array<InvoiceStatus> = ['sent', 'viewed', 'overdue']
const num = (v: string | number | null | undefined) => Number(v ?? 0)
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const day = (d: Date) => d.toISOString().slice(0, 10)

/** Compact, JSON-safe shape the UI renders as a document card. */
export interface DocumentSummary {
  id: string
  type: 'invoice' | 'estimate'
  number: string
  status: InvoiceStatus
  clientId: string
  clientName: string
  issueDate: string
  dueDate: string
  currency: string
  total: number
  depositAmount: number | null
  paidAt: string | null
  paymentMethod: string | null
  language: 'es' | 'en'
  path: string
}

type DocRow = typeof invoices.$inferSelect & {
  client: { id: string; name: string }
}

function summarize(d: DocRow): DocumentSummary {
  return {
    id: d.id,
    type: d.type,
    number: d.invoiceNumber,
    status: d.status,
    clientId: d.clientId,
    clientName: d.client.name,
    issueDate: day(d.issueDate),
    dueDate: day(d.dueDate),
    currency: d.currency,
    total: num(d.total),
    depositAmount: d.depositAmount != null ? num(d.depositAmount) : null,
    paidAt: iso(d.paidAt),
    paymentMethod: d.paymentMethod,
    language: d.language,
    path: docPath(d.id, d.type),
  }
}

async function findClients(ctx: ToolContext, query: string, limit = 10) {
  const pattern = `%${query.trim()}%`
  return ctx.db
    .select({
      id: clients.id,
      name: clients.name,
      company: clients.company,
      phone: clients.phone,
      email: clients.email,
      preferredLanguage: clients.preferredLanguage,
      archived: clients.archived,
      documentCount: count(invoices.id),
    })
    .from(clients)
    .leftJoin(invoices, eq(invoices.clientId, clients.id))
    .where(
      and(
        eq(clients.userId, ctx.userId),
        or(
          ilike(clients.name, pattern),
          ilike(clients.company, pattern),
          ilike(clients.phone, pattern),
          ilike(clients.email, pattern),
        ),
      ),
    )
    .groupBy(clients.id)
    .orderBy(asc(clients.archived), asc(clients.name))
    .limit(limit)
}

/**
 * Read-only tools the assistant can call. Everything is scoped to the signed-in
 * owner (userId), so the model can never see another business's data.
 */
export function createInvoiceTools(ctx: ToolContext) {
  const currency = ctx.settings?.defaultCurrency ?? 'USD'

  const searchClients = tool({
    description:
      'Find clients by (partial) name, company, phone or email. Use this first when the user mentions a person or business name.',
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe('Name, company, phone or email fragment'),
    }),
    execute: async ({ query }) => {
      const rows = await findClients(ctx, query)
      return { count: rows.length, clients: rows }
    },
  })

  const listDocuments = tool({
    description:
      'List invoices and/or estimates with filters. Use status "outstanding" for unpaid (sent, viewed or overdue). Returns totals and compact records; the UI renders them as cards.',
    inputSchema: z.object({
      type: z.enum([...DOCUMENT_TYPES, 'all']).default('all'),
      status: z
        .enum([...INVOICE_STATUSES, 'outstanding', 'all'])
        .default('all'),
      clientName: z
        .string()
        .optional()
        .describe('Fuzzy client name/company filter'),
      numberContains: z
        .string()
        .optional()
        .describe('Fragment of the document number, e.g. "0001"'),
      dueBefore: z.string().regex(DATE_ONLY).optional().describe('yyyy-mm-dd'),
      dueAfter: z.string().regex(DATE_ONLY).optional().describe('yyyy-mm-dd'),
      limit: z.number().int().min(1).max(25).default(10),
    }),
    execute: async ({
      type,
      status,
      clientName,
      numberContains,
      dueBefore,
      dueAfter,
      limit,
    }) => {
      const clientIds = clientName
        ? (await findClients(ctx, clientName, 20)).map((c) => c.id)
        : null
      if (clientIds && clientIds.length === 0) {
        return {
          count: 0,
          shown: 0,
          totalAmount: 0,
          currency,
          documents: [] as Array<DocumentSummary>,
          note: `No client matches "${clientName}"` as string | undefined,
        }
      }

      const where = and(
        eq(invoices.userId, ctx.userId),
        type !== 'all' ? eq(invoices.type, type) : undefined,
        status === 'outstanding'
          ? inArray(invoices.status, OUTSTANDING)
          : status !== 'all'
            ? eq(invoices.status, status)
            : undefined,
        clientIds ? inArray(invoices.clientId, clientIds) : undefined,
        numberContains
          ? ilike(invoices.invoiceNumber, `%${numberContains}%`)
          : undefined,
        dueBefore ? lte(invoices.dueDate, dateOnlyToDb(dueBefore)) : undefined,
        dueAfter ? gte(invoices.dueDate, dateOnlyToDb(dueAfter)) : undefined,
      )

      const rows = await ctx.db.query.invoices.findMany({
        where,
        with: { client: { columns: { id: true, name: true } } },
        orderBy:
          status === 'overdue' || status === 'outstanding'
            ? asc(invoices.dueDate)
            : desc(invoices.createdAt),
        limit,
      })
      const [agg] = await ctx.db
        .select({ n: count(), total: sum(invoices.total) })
        .from(invoices)
        .where(where)

      return {
        count: agg.n,
        shown: rows.length,
        totalAmount: num(agg.total),
        currency,
        documents: rows.map(summarize),
        note: undefined as string | undefined,
      }
    },
  })

  const searchDocumentsByMeaning = tool({
    description:
      'Semantic search over invoices and estimates by what the work was about (line item descriptions, notes), e.g. "the sprinkler installation" or "limpieza de oficina". Use when the user describes a job instead of giving a number or client. Returns the closest documents with a similarity score (0-1).',
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .describe('Natural-language description of the job or document'),
      limit: z.number().int().min(1).max(10).default(6),
    }),
    execute: async ({ query, limit }) => {
      const matches = await semanticSearch(ctx.env, {
        userId: ctx.userId,
        query,
        topK: limit,
      })
      if (matches.length === 0) {
        return {
          count: 0,
          documents: [] as Array<DocumentSummary & { score: number }>,
        }
      }
      const rows = await ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.userId, ctx.userId),
          inArray(
            invoices.id,
            matches.map((m) => m.id),
          ),
        ),
        with: { client: { columns: { id: true, name: true } } },
      })
      const byId = new Map(rows.map((r) => [r.id, r]))
      const documents = matches.flatMap((m) => {
        const row = byId.get(m.id)
        return row
          ? [{ ...summarize(row), score: Math.round(m.score * 100) / 100 }]
          : []
      })
      return { count: documents.length, documents }
    },
  })

  const getDocument = tool({
    description:
      'Get the full detail of one invoice or estimate by its number (e.g. INV-0001, EST-0002), including line items, payment info, history and the public link.',
    inputSchema: z.object({
      number: z.string().min(1).describe('Document number like INV-0001'),
    }),
    execute: async ({ number }) => {
      const doc = await ctx.db.query.invoices.findFirst({
        where: and(
          eq(invoices.userId, ctx.userId),
          ilike(invoices.invoiceNumber, number.trim()),
        ),
        with: {
          client: true,
          items: { orderBy: invoiceItems.sortOrder },
          events: { orderBy: desc(invoiceEvents.createdAt), limit: 20 },
          estimate: { columns: { id: true, invoiceNumber: true } },
          convertedInvoices: {
            columns: { id: true, invoiceNumber: true, status: true },
          },
        },
      })
      if (!doc) return { found: false as const, number }
      const token = await ctx.db.query.invoicePublicTokens.findFirst({
        where: eq(invoicePublicTokens.invoiceId, doc.id),
        columns: { token: true },
      })
      return {
        found: true as const,
        document: {
          ...summarize(doc),
          subtotal: num(doc.subtotal),
          taxTotal: num(doc.taxTotal),
          discountAmount: num(doc.discountAmount),
          notes: doc.notes,
          paymentInstructions:
            doc.paymentInstructionsOverride ??
            ctx.settings?.paymentInstructions ??
            null,
          sentAt: iso(doc.sentAt),
          viewedAt: iso(doc.viewedAt),
          publicUrl: token ? `${ctx.baseUrl}/i/${token.token}` : null,
          convertedFrom: doc.estimate?.invoiceNumber ?? null,
          convertedTo: doc.convertedInvoices.map((i) => i.invoiceNumber),
          client: {
            id: doc.client.id,
            name: doc.client.name,
            company: doc.client.company,
            phone: doc.client.phone,
            email: doc.client.email,
          },
          items: doc.items.map((it) => ({
            description: it.description,
            quantity: num(it.quantity),
            unitPrice: num(it.unitPrice),
            taxRate: it.taxRate != null ? num(it.taxRate) : null,
            amount: num(it.amount),
          })),
          history: doc.events.map((e) => ({
            type: e.eventType,
            at: e.createdAt.toISOString(),
          })),
        },
      }
    },
  })

  const getSummary = tool({
    description:
      'Business overview: total outstanding, overdue, collected this month, drafts, estimates pending conversion, and the most urgent overdue invoices.',
    inputSchema: z.object({}),
    execute: async () => {
      const tz = ctx.settings?.timezone ?? 'America/Chicago'
      const byStatus = await ctx.db
        .select({
          status: invoices.status,
          type: invoices.type,
          total: sum(invoices.total),
          n: count(),
        })
        .from(invoices)
        .where(eq(invoices.userId, ctx.userId))
        .groupBy(invoices.status, invoices.type)
      const pick = (type: string, st: string) =>
        byStatus.find((r) => r.type === type && r.status === st)
      const sumOf = (type: string, sts: Array<string>) =>
        sts.reduce((acc, st) => acc + num(pick(type, st)?.total), 0)
      const cnt = (type: string, sts: Array<string>) =>
        sts.reduce((acc, st) => acc + (pick(type, st)?.n ?? 0), 0)

      const [paidMonth] = await ctx.db
        .select({ total: sum(invoices.total), n: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, ctx.userId),
            eq(invoices.type, 'invoice'),
            eq(invoices.status, 'paid'),
            sql`${invoices.paidAt} >= timezone(${tz}, date_trunc('month', timezone(${tz}, now())))`,
          ),
        )
      const overdue = await ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.userId, ctx.userId),
          eq(invoices.type, 'invoice'),
          eq(invoices.status, 'overdue'),
        ),
        with: { client: { columns: { id: true, name: true } } },
        orderBy: asc(invoices.dueDate),
        limit: 5,
      })
      const convertedIds = await ctx.db
        .select({ estimateId: invoices.estimateId })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, ctx.userId),
            sql`${invoices.estimateId} is not null`,
          ),
        )
      const converted = new Set(convertedIds.map((r) => r.estimateId))
      const openEstimates = await ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.userId, ctx.userId),
          eq(invoices.type, 'estimate'),
          inArray(invoices.status, ['draft', 'sent', 'viewed']),
        ),
        with: { client: { columns: { id: true, name: true } } },
        orderBy: desc(invoices.createdAt),
        limit: 25,
      })

      return {
        currency,
        outstanding: {
          total: sumOf('invoice', OUTSTANDING),
          count: cnt('invoice', OUTSTANDING),
        },
        overdue: {
          total: sumOf('invoice', ['overdue']),
          count: cnt('invoice', ['overdue']),
        },
        paidThisMonth: { total: num(paidMonth.total), count: paidMonth.n },
        paidAllTime: {
          total: sumOf('invoice', ['paid']),
          count: cnt('invoice', ['paid']),
        },
        drafts: cnt('invoice', ['draft']),
        estimatesPending: openEstimates.filter((e) => !converted.has(e.id))
          .length,
        mostUrgentOverdue: overdue.map(summarize),
      }
    },
  })

  const getClientBalance = tool({
    description:
      'What a specific client owes: outstanding invoices and total, plus lifetime paid total and their most recent documents.',
    inputSchema: z.object({
      clientName: z.string().min(1).describe('Client name or company (fuzzy)'),
    }),
    execute: async ({ clientName }) => {
      const matches = await findClients(ctx, clientName, 5)
      if (matches.length === 0) return { found: false as const, clientName }
      const client = matches[0]
      const docs = await ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.userId, ctx.userId),
          eq(invoices.clientId, client.id),
        ),
        with: { client: { columns: { id: true, name: true } } },
        orderBy: desc(invoices.createdAt),
        limit: 25,
      })
      const outstanding = docs.filter(
        (d) => d.type === 'invoice' && OUTSTANDING.includes(d.status),
      )
      const paid = docs.filter(
        (d) => d.type === 'invoice' && d.status === 'paid',
      )
      return {
        found: true as const,
        client: {
          id: client.id,
          name: client.name,
          company: client.company,
          phone: client.phone,
          email: client.email,
        },
        otherMatches: matches.slice(1).map((m) => m.name),
        currency,
        outstandingTotal: outstanding.reduce((a, d) => a + num(d.total), 0),
        outstandingCount: outstanding.length,
        paidTotal: paid.reduce((a, d) => a + num(d.total), 0),
        outstanding: outstanding.map(summarize),
        recent: docs.slice(0, 10).map(summarize),
      }
    },
  })

  return {
    searchClients,
    listDocuments,
    searchDocumentsByMeaning,
    getDocument,
    getSummary,
    getClientBalance,
  }
}

export type InvoiceTools = ReturnType<typeof createInvoiceTools>

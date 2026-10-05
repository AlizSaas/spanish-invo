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
import type { InvoiceEventType, InvoiceStatus } from '@/lib/constants'
import {
  clients,
  invoiceEvents,
  invoiceItems,
  invoicePublicTokens,
  invoices,
} from '@/db/schema'
import {
  DOCUMENT_TYPES,
  INVOICE_EVENT_TYPES,
  INVOICE_STATUSES,
} from '@/lib/constants'
import { DATE_ONLY, addDays, dateOnlyToDb } from '@/lib/dates'
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
/** Invoices that count as "issued": everything except drafts and voids. */
const BILLED: Array<InvoiceStatus> = ['sent', 'viewed', 'overdue', 'paid']
const num = (v: string | number | null | undefined) => Number(v ?? 0)
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const day = (d: Date) => d.toISOString().slice(0, 10)

// --- Periods, always resolved in the owner's time zone -----------------------

const PERIODS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_year',
  'last_30_days',
  'custom',
] as const
type Period = (typeof PERIODS)[number]

/** yyyy-mm-dd for "now" in the given time zone. */
const todayIn = (tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
const startOfMonth = (d: string) => `${d.slice(0, 7)}-01`
const endOfMonth = (d: string) => {
  const [y, m] = d.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${d.slice(0, 7)}-${String(last).padStart(2, '0')}`
}
/** Monday-based week start. */
const startOfWeek = (d: string) =>
  addDays(d, -((dateOnlyToDb(d).getUTCDay() + 6) % 7))

function resolvePeriod(
  period: Period,
  from: string | undefined,
  to: string | undefined,
  tz: string,
): { from: string; to: string } {
  const today = todayIn(tz)
  switch (period) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { from: y, to: y }
    }
    case 'this_week':
      return { from: startOfWeek(today), to: today }
    case 'last_week': {
      const start = addDays(startOfWeek(today), -7)
      return { from: start, to: addDays(start, 6) }
    }
    case 'this_month':
      return { from: startOfMonth(today), to: today }
    case 'last_month': {
      const start = startOfMonth(addDays(startOfMonth(today), -1))
      return { from: start, to: endOfMonth(start) }
    }
    case 'this_year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
    case 'last_30_days':
      return { from: addDays(today, -29), to: today }
    case 'custom':
      return { from: from ?? startOfMonth(today), to: to ?? today }
  }
}

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

  const getRevenueReport = tool({
    description:
      'Income report for a period in the owner\'s time zone: money collected (paid invoices by payment date), amount invoiced (invoices issued in the period), average paid invoice, a breakdown by day/week/month and the top clients by payments. Use for "how much did I make today / this week / last month", comparisons and trends.',
    inputSchema: z.object({
      period: z.enum(PERIODS).default('this_month'),
      from: z
        .string()
        .regex(DATE_ONLY)
        .optional()
        .describe('yyyy-mm-dd; only with period "custom"'),
      to: z
        .string()
        .regex(DATE_ONLY)
        .optional()
        .describe('yyyy-mm-dd; only with period "custom"'),
      groupBy: z
        .enum(['day', 'week', 'month'])
        .optional()
        .describe(
          'Breakdown granularity. Default: day for ranges up to 31 days, otherwise month',
        ),
    }),
    execute: async ({ period, from, to, groupBy }) => {
      const tz = ctx.settings?.timezone ?? 'America/Chicago'
      const range = resolvePeriod(period, from, to, tz)
      const days =
        Math.round(
          (dateOnlyToDb(range.to).getTime() -
            dateOnlyToDb(range.from).getTime()) /
            86_400_000,
        ) + 1
      const unit = groupBy ?? (days <= 31 ? 'day' : 'month')
      const fmt =
        unit === 'day'
          ? 'YYYY-MM-DD'
          : unit === 'week'
            ? 'IYYY-"W"IW'
            : 'YYYY-MM'

      // paidAt is a real instant: compare against local midnight in the owner's zone.
      const paidWhere = and(
        eq(invoices.userId, ctx.userId),
        eq(invoices.type, 'invoice'),
        eq(invoices.status, 'paid'),
        sql`${invoices.paidAt} >= timezone(${tz}, ${range.from}::timestamp)`,
        sql`${invoices.paidAt} < timezone(${tz}, (${range.to}::date + 1)::timestamp)`,
      )
      // issueDate is a date-only value stored at UTC midnight.
      const issuedWhere = and(
        eq(invoices.userId, ctx.userId),
        eq(invoices.type, 'invoice'),
        inArray(invoices.status, BILLED),
        gte(invoices.issueDate, dateOnlyToDb(range.from)),
        lte(invoices.issueDate, dateOnlyToDb(range.to)),
      )

      const [paid] = await ctx.db
        .select({ total: sum(invoices.total), n: count() })
        .from(invoices)
        .where(paidWhere)
      const [issued] = await ctx.db
        .select({ total: sum(invoices.total), n: count() })
        .from(invoices)
        .where(issuedWhere)

      const paidBucket = sql<string>`to_char(timezone(${tz}, ${invoices.paidAt}), ${fmt})`
      const paidRows = await ctx.db
        .select({ bucket: paidBucket, total: sum(invoices.total), n: count() })
        .from(invoices)
        .where(paidWhere)
        .groupBy(paidBucket)
        .orderBy(paidBucket)
      const issuedBucket = sql<string>`to_char(${invoices.issueDate}, ${fmt})`
      const issuedRows = await ctx.db
        .select({
          bucket: issuedBucket,
          total: sum(invoices.total),
          n: count(),
        })
        .from(invoices)
        .where(issuedWhere)
        .groupBy(issuedBucket)
        .orderBy(issuedBucket)

      const buckets = new Map<
        string,
        {
          period: string
          collected: number
          collectedCount: number
          invoiced: number
          invoicedCount: number
        }
      >()
      const bucketFor = (key: string) => {
        let b = buckets.get(key)
        if (!b) {
          b = {
            period: key,
            collected: 0,
            collectedCount: 0,
            invoiced: 0,
            invoicedCount: 0,
          }
          buckets.set(key, b)
        }
        return b
      }
      for (const r of paidRows) {
        const b = bucketFor(r.bucket)
        b.collected = num(r.total)
        b.collectedCount = r.n
      }
      for (const r of issuedRows) {
        const b = bucketFor(r.bucket)
        b.invoiced = num(r.total)
        b.invoicedCount = r.n
      }

      const topClients = await ctx.db
        .select({
          clientId: invoices.clientId,
          name: clients.name,
          collected: sum(invoices.total),
          n: count(),
        })
        .from(invoices)
        .innerJoin(clients, eq(clients.id, invoices.clientId))
        .where(paidWhere)
        .groupBy(invoices.clientId, clients.name)
        .orderBy(desc(sum(invoices.total)))
        .limit(5)

      return {
        currency,
        period: { label: period, from: range.from, to: range.to, days },
        collected: { total: num(paid.total), count: paid.n },
        invoiced: { total: num(issued.total), count: issued.n },
        averagePaidInvoice: paid.n > 0 ? num(paid.total) / paid.n : 0,
        groupBy: unit,
        breakdown: [...buckets.values()].sort((a, b) =>
          a.period.localeCompare(b.period),
        ),
        topClients: topClients.map((c) => ({
          clientId: c.clientId,
          name: c.name,
          collected: num(c.collected),
          count: c.n,
        })),
      }
    },
  })

  const listClients = tool({
    description:
      'All clients with money figures: outstanding balance, lifetime paid, number of documents and last activity. Sort by "outstanding" for who owes money, "paid" for best clients, "recent" for latest activity, "name" for a directory. Also answers "how many clients do I have".',
    inputSchema: z.object({
      sortBy: z
        .enum(['outstanding', 'paid', 'recent', 'name'])
        .default('outstanding'),
      includeArchived: z.boolean().default(false),
      limit: z.number().int().min(1).max(50).default(15),
    }),
    execute: async ({ sortBy, includeArchived, limit }) => {
      const outstandingExpr = sql<string>`coalesce(sum(case when ${invoices.type} = 'invoice' and ${invoices.status} in ('sent', 'viewed', 'overdue') then ${invoices.total} else 0 end), 0)`
      const paidExpr = sql<string>`coalesce(sum(case when ${invoices.type} = 'invoice' and ${invoices.status} = 'paid' then ${invoices.total} else 0 end), 0)`
      const lastExpr = sql<string | null>`max(${invoices.createdAt})`
      const where = and(
        eq(clients.userId, ctx.userId),
        includeArchived ? undefined : eq(clients.archived, false),
      )
      const rows = await ctx.db
        .select({
          id: clients.id,
          name: clients.name,
          company: clients.company,
          phone: clients.phone,
          archived: clients.archived,
          documentCount: count(invoices.id),
          outstanding: outstandingExpr,
          paid: paidExpr,
          lastDocumentAt: lastExpr,
        })
        .from(clients)
        .leftJoin(invoices, eq(invoices.clientId, clients.id))
        .where(where)
        .groupBy(clients.id)
        .orderBy(
          sortBy === 'name'
            ? asc(clients.name)
            : sortBy === 'paid'
              ? desc(paidExpr)
              : sortBy === 'recent'
                ? desc(lastExpr)
                : desc(outstandingExpr),
        )
        .limit(limit)
      const [totals] = await ctx.db
        .select({ n: count() })
        .from(clients)
        .where(where)

      return {
        currency,
        totalClients: totals.n,
        shown: rows.length,
        clients: rows.map((r) => ({
          id: r.id,
          name: r.name,
          company: r.company,
          phone: r.phone,
          archived: r.archived,
          documentCount: r.documentCount,
          outstanding: num(r.outstanding),
          paid: num(r.paid),
          lastDocumentAt: r.lastDocumentAt
            ? new Date(r.lastDocumentAt).toISOString()
            : null,
        })),
      }
    },
  })

  const getRecentActivity = tool({
    description:
      'Timeline of what happened recently across all documents: created, edited, shared on WhatsApp, sent by SMS, link copied, opened by the customer, PDF downloaded, marked paid, voided, estimate converted. Use for "did anyone open my invoice", "who paid today", "what happened this week".',
    inputSchema: z.object({
      days: z.number().int().min(1).max(90).default(7),
      eventType: z.enum([...INVOICE_EVENT_TYPES, 'all']).default('all'),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    execute: async ({ days, eventType, limit }) => {
      const since = new Date(Date.now() - days * 86_400_000)
      const rows = await ctx.db
        .select({
          id: invoiceEvents.id,
          at: invoiceEvents.createdAt,
          type: invoiceEvents.eventType,
          docId: invoices.id,
          docType: invoices.type,
          number: invoices.invoiceNumber,
          status: invoices.status,
          total: invoices.total,
          currency: invoices.currency,
          clientName: clients.name,
        })
        .from(invoiceEvents)
        .innerJoin(invoices, eq(invoiceEvents.invoiceId, invoices.id))
        .innerJoin(clients, eq(clients.id, invoices.clientId))
        .where(
          and(
            eq(invoices.userId, ctx.userId),
            gte(invoiceEvents.createdAt, since),
            eventType !== 'all'
              ? eq(invoiceEvents.eventType, eventType)
              : undefined,
          ),
        )
        .orderBy(desc(invoiceEvents.createdAt))
        .limit(limit)

      return {
        days,
        count: rows.length,
        events: rows.map((r) => ({
          id: r.id,
          at: r.at.toISOString(),
          type: r.type as InvoiceEventType,
          number: r.number,
          clientName: r.clientName,
          docId: r.docId,
          docType: r.docType,
          status: r.status,
          total: num(r.total),
          currency: r.currency,
          path: docPath(r.docId, r.docType),
        })),
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
    getRevenueReport,
    listClients,
    getRecentActivity,
  }
}

export type InvoiceTools = ReturnType<typeof createInvoiceTools>

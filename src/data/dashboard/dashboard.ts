import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { and, asc, count, desc, eq, inArray, sql, sum } from 'drizzle-orm'
import { invoices, settings } from '@/db/schema'
import { authMiddleware } from '@/middlewares/dependencies'
import { refreshOverdue } from '@/data/documents/helpers'

export const getDashboardFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context
    await refreshOverdue(db, user.id)

    const s = await db.query.settings.findFirst({
      where: eq(settings.userId, user.id),
    })
    const tz = s?.timezone ?? 'America/Chicago'

    const byStatus = await db
      .select({
        status: invoices.status,
        total: sum(invoices.total),
        n: count(),
      })
      .from(invoices)
      .where(and(eq(invoices.userId, user.id), eq(invoices.type, 'invoice')))
      .groupBy(invoices.status)

    const pick = (st: string) => byStatus.find((r) => r.status === st)
    const num = (v: string | null | undefined) => Number(v ?? 0)

    const outstandingTotal =
      num(pick('sent')?.total) +
      num(pick('viewed')?.total) +
      num(pick('overdue')?.total)
    const outstandingCount =
      (pick('sent')?.n ?? 0) +
      (pick('viewed')?.n ?? 0) +
      (pick('overdue')?.n ?? 0)

    // Paid this month in the owner's time zone
    const [paidMonth] = await db
      .select({ total: sum(invoices.total), n: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, user.id),
          eq(invoices.type, 'invoice'),
          eq(invoices.status, 'paid'),
          sql`${invoices.paidAt} >= timezone(${tz}, date_trunc('month', timezone(${tz}, now())))`,
        ),
      )

    const overdueList = await db.query.invoices.findMany({
      where: and(
        eq(invoices.userId, user.id),
        eq(invoices.type, 'invoice'),
        eq(invoices.status, 'overdue'),
      ),
      with: { client: { columns: { id: true, name: true, phone: true } } },
      orderBy: asc(invoices.dueDate),
      limit: 10,
    })

    const recent = await db.query.invoices.findMany({
      where: and(
        eq(invoices.userId, user.id),
        inArray(invoices.type, ['invoice', 'estimate']),
      ),
      with: { client: { columns: { id: true, name: true } } },
      orderBy: desc(invoices.updatedAt),
      limit: 8,
    })

    return {
      currency: s?.defaultCurrency ?? 'USD',
      timezone: tz,
      kpis: {
        outstanding: { total: outstandingTotal, count: outstandingCount },
        overdue: {
          total: num(pick('overdue')?.total),
          count: pick('overdue')?.n ?? 0,
        },
        paidThisMonth: {
          total: num(paidMonth.total),
          count: paidMonth.n,
        },
        drafts: { count: pick('draft')?.n ?? 0 },
      },
      overdueList,
      recent,
      hasAnyDocument: byStatus.length > 0 || recent.length > 0,
    }
  })

export type DashboardData = Awaited<ReturnType<typeof getDashboardFn>>

export const dashboardQuery = () =>
  queryOptions({
    queryKey: ['dashboard'] as const,
    queryFn: () => getDashboardFn(),
  })

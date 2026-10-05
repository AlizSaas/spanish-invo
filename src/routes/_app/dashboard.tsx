import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  UserPlus,
} from 'lucide-react'
import { DocLink } from '@/components/documents/doc-link'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { dashboardQuery } from '@/data/dashboard/dashboard'
import { useAppContext } from '@/hooks/use-app-context'
import { useT } from '@/lib/i18n'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

export const Route = createFileRoute('/_app/dashboard')({
  loader: ({ context }) =>
    context.queryClient.query({ ...dashboardQuery(), staleTime: 'static' }),
  component: DashboardPage,
})

function DashboardPage() {
  const t = useT()
  const { user, settings } = useAppContext()
  const locale = useUiStore((s) => s.locale)
  const { data } = useSuspenseQuery(dashboardQuery())
  const money = (n: number) => formatCurrency(n, data.currency, locale)
  const date = (d: Date | string) =>
    formatDate(d, { language: locale, timezone: settings.timezone })

  const firstName = (settings.businessName || user.name).split(' ')[0]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${t.dashboard.greeting}, ${firstName}`}
        subtitle={settings.businessName ?? undefined}
        actions={
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="size-4" />
              {t.nav.newInvoice}
            </Link>
          </Button>
        }
      />

      {/* KPI tiles: hero numbers in text tokens; status is carried by icon + label, not color alone. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label={t.dashboard.outstanding}
          help={`${data.kpis.outstanding.count} ${t.dashboard.invoicesCount}`}
          value={money(data.kpis.outstanding.total)}
          icon={<Clock className="size-4" />}
        />
        <KpiTile
          label={t.dashboard.overdue}
          help={`${data.kpis.overdue.count} ${t.dashboard.invoicesCount}`}
          value={money(data.kpis.overdue.total)}
          icon={<AlertTriangle className="size-4" />}
          tone={data.kpis.overdue.count > 0 ? 'serious' : 'neutral'}
        />
        <KpiTile
          label={t.dashboard.paidThisMonth}
          help={`${data.kpis.paidThisMonth.count} ${t.dashboard.invoicesCount}`}
          value={money(data.kpis.paidThisMonth.total)}
          icon={<CheckCircle2 className="size-4" />}
          tone="good"
        />
        <KpiTile
          label={t.dashboard.drafts}
          help={t.dashboard.draftsHelp}
          value={String(data.kpis.drafts.count)}
          icon={<FileText className="size-4" />}
        />
      </section>

      {!data.hasAnyDocument ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>{t.dashboard.emptyTitle}</EmptyTitle>
            <EmptyDescription>{t.dashboard.emptyBody}</EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/clients/new">
                <UserPlus className="size-4" />
                {t.clients.new}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/invoices/new">
                <Plus className="size-4" />
                {t.docs.newInvoice}
              </Link>
            </Button>
          </div>
        </Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive size-4" />
                {t.dashboard.overdueList}
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/invoices">
                  {t.dashboard.viewAll}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.overdueList.length === 0 ? (
                <p className="text-muted-foreground px-6 pb-6 text-sm">
                  {t.dashboard.noOverdue}
                </p>
              ) : (
                <ul className="divide-y">
                  {data.overdueList.map((d) => (
                    <li key={d.id}>
                      <DocLink
                        id={d.id}
                        type="invoice"
                        className="hover:bg-accent/40 flex items-center gap-3 px-6 py-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {d.client.name}
                          </div>
                          <div className="text-muted-foreground text-xs tabular-nums">
                            {d.invoiceNumber} · {t.docs.dueDate}{' '}
                            {date(d.dueDate)}
                          </div>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {money(Number(d.total))}
                        </span>
                      </DocLink>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t.dashboard.recent}</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/invoices">
                  {t.dashboard.viewAll}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {data.recent.map((d) => (
                  <li key={d.id}>
                    <DocLink
                      id={d.id}
                      type={d.type}
                      className="hover:bg-accent/40 flex items-center gap-3 px-6 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {d.client.name}
                          <span className="text-muted-foreground font-normal tabular-nums">
                            {' '}
                            · {d.invoiceNumber}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {date(d.updatedAt)}
                        </div>
                      </div>
                      <StatusBadge status={d.status} type={d.type} />
                      <span className="w-24 text-right font-semibold tabular-nums">
                        {money(Number(d.total))}
                      </span>
                    </DocLink>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function KpiTile({
  label,
  help,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string
  help: string
  value: string
  icon: React.ReactNode
  tone?: 'neutral' | 'good' | 'serious'
}) {
  return (
    <div className="bg-card rounded-xl border p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm font-medium">
          {label}
        </span>
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-full',
            tone === 'good' &&
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
            tone === 'serious' &&
              'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
            tone === 'neutral' && 'bg-muted text-muted-foreground',
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 truncate text-2xl font-bold tracking-tight tabular-nums md:text-3xl">
        {value}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">{help}</div>
    </div>
  )
}

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, FileText, Plus, Search } from 'lucide-react'
import type { DocumentType, InvoiceStatus } from '@/lib/constants'
import { DocLink } from '@/components/documents/doc-link'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { documentsListQuery } from '@/data/documents/queries'
import { useAppContext } from '@/hooks/use-app-context'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useT } from '@/lib/i18n'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

const FILTERS: Array<{
  key: 'all' | InvoiceStatus
  statuses?: Array<InvoiceStatus>
}> = [
  { key: 'all' },
  { key: 'draft' },
  { key: 'sent' },
  { key: 'overdue' },
  { key: 'paid' },
  { key: 'void' },
]

export function DocumentList({ type }: { type: DocumentType }) {
  const t = useT()
  const { settings } = useAppContext()
  const locale = useUiStore((s) => s.locale)
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all')
  const [q, setQ] = useState('')
  const debounced = useDebouncedValue(q, 250)

  const { data, isPending } = useQuery(
    documentsListQuery({
      type,
      status: filter === 'all' ? undefined : filter,
      q: debounced || undefined,
    }),
  )

  const isEstimate = type === 'estimate'
  const labels = isEstimate ? t.docs.estimateStatuses : t.docs.statuses
  const newTo = isEstimate ? '/estimates/new' : '/invoices/new'
  const visibleFilters = FILTERS.filter(
    (f) => !(isEstimate && f.key === 'overdue'),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEstimate ? t.docs.estimates : t.docs.invoices}
        subtitle={
          isEstimate ? t.docs.estimatesSubtitle : t.docs.invoicesSubtitle
        }
        actions={
          <Button asChild>
            <Link to={newTo}>
              <Plus className="size-4" />
              {isEstimate ? t.docs.newEstimate : t.docs.newInvoice}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 lg:w-auto">
            {visibleFilters.map((f) => (
              <TabsTrigger key={f.key} value={f.key} className="px-3 py-1.5">
                {f.key === 'all' ? t.common.all : labels[f.key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="lg:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t.docs.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </InputGroup>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {isEstimate ? <ClipboardList /> : <FileText />}
            </EmptyMedia>
            <EmptyTitle>
              {isEstimate
                ? t.docs.emptyEstimatesTitle
                : t.docs.emptyInvoicesTitle}
            </EmptyTitle>
            <EmptyDescription>
              {isEstimate
                ? t.docs.emptyEstimatesBody
                : t.docs.emptyInvoicesBody}
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild>
            <Link to={newTo}>
              <Plus className="size-4" />
              {isEstimate ? t.docs.newEstimate : t.docs.newInvoice}
            </Link>
          </Button>
        </Empty>
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border">
          {/* Desktop header */}
          <div className="text-muted-foreground hidden grid-cols-[7rem_1fr_7rem_7rem_7rem_8rem] gap-3 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase md:grid">
            <span>{t.docs.number}</span>
            <span>{t.docs.client}</span>
            <span>{t.docs.issueDate}</span>
            <span>{isEstimate ? t.docs.validUntil : t.docs.dueDate}</span>
            <span>{t.docs.status}</span>
            <span className="text-right">{t.docs.total}</span>
          </div>
          <ul className="divide-y">
            {data.map((d) => (
              <li key={d.id}>
                <DocLink
                  id={d.id}
                  type={d.type}
                  className={cn(
                    'hover:bg-accent/40 grid gap-x-3 gap-y-1 px-4 py-3 transition-colors',
                    'grid-cols-[1fr_auto] md:grid-cols-[7rem_1fr_7rem_7rem_7rem_8rem] md:items-center',
                  )}
                >
                  <span className="font-medium tabular-nums">
                    {d.invoiceNumber}
                  </span>
                  <span className="text-right font-semibold tabular-nums md:order-6">
                    {formatCurrency(d.total, d.currency, locale)}
                  </span>
                  <span className="text-muted-foreground col-span-2 truncate md:col-span-1">
                    {d.client.name}
                    {d.client.company ? ` · ${d.client.company}` : ''}
                  </span>
                  <span className="text-muted-foreground hidden text-sm md:block">
                    {formatDate(d.issueDate, {
                      language: locale,
                      timezone: settings.timezone,
                    })}
                  </span>
                  <span
                    className={cn(
                      'text-muted-foreground text-sm',
                      d.status === 'overdue' && 'text-destructive font-medium',
                    )}
                  >
                    <span className="md:hidden">
                      {isEstimate ? t.docs.validUntil : t.docs.dueDate}:{' '}
                    </span>
                    {formatDate(d.dueDate, {
                      language: locale,
                      timezone: settings.timezone,
                    })}
                  </span>
                  <span className="justify-self-end md:justify-self-start">
                    <StatusBadge status={d.status} type={d.type} />
                  </span>
                </DocLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Users,
  XCircle,
} from 'lucide-react'
import type {
  AssistantToolName,
  AssistantToolOutputPart,
  AssistantToolPart,
} from './types'
import type { DocumentSummary } from '@/worker/ai/tools'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { DocLink } from '@/components/documents/doc-link'
import { StatusBadge } from '@/components/status-badge'
import { Spinner } from '@/components/ui/spinner'
import { useAppContext } from '@/hooks/use-app-context'
import { dateOnlyToDb } from '@/lib/dates'
import { useT } from '@/lib/i18n'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

/** One tool call: compact status header + the rich result the model fetched. */
export function ToolResult({
  part,
  onNavigate,
}: {
  part: AssistantToolPart
  onNavigate?: () => void
}) {
  const t = useT()
  const name = part.type.slice('tool-'.length) as AssistantToolName
  const label = t.assistant.tools[name]
  const running =
    part.state === 'input-streaming' || part.state === 'input-available'

  return (
    <div className="bg-card/70 w-full rounded-xl border text-sm">
      <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs font-medium tracking-wide uppercase">
        {running ? (
          <Spinner className="size-3.5" />
        ) : part.state === 'output-error' ? (
          <XCircle className="text-destructive size-3.5" />
        ) : (
          <CheckCircle2 className="text-primary size-3.5" />
        )}
        <span>{label}</span>
        {running && (
          <Shimmer as="span" className="normal-case tracking-normal">
            {t.assistant.searching}
          </Shimmer>
        )}
      </div>
      {part.state === 'output-error' && (
        <p className="text-destructive px-3 pb-3">{part.errorText}</p>
      )}
      {part.state === 'output-available' && (
        <div className="px-3 pb-3">
          <ToolOutputView part={part} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  )
}

function ToolOutputView({
  part,
  onNavigate,
}: {
  part: AssistantToolOutputPart
  onNavigate?: () => void
}) {
  const t = useT()
  switch (part.type) {
    case 'tool-searchClients':
      return part.output.clients.length === 0 ? (
        <Empty text={t.assistant.noResults} />
      ) : (
        <ClientRows clients={part.output.clients} onNavigate={onNavigate} />
      )
    case 'tool-listDocuments':
      return part.output.documents.length === 0 ? (
        <Empty text={part.output.note ?? t.assistant.noResults} />
      ) : (
        <>
          <ListMeta
            shown={part.output.shown}
            count={part.output.count}
            total={part.output.totalAmount}
            currency={part.output.currency}
          />
          <DocumentCards
            documents={part.output.documents}
            onNavigate={onNavigate}
          />
        </>
      )
    case 'tool-searchDocumentsByMeaning':
      return part.output.documents.length === 0 ? (
        <Empty text={t.assistant.noResults} />
      ) : (
        <DocumentCards
          documents={part.output.documents}
          onNavigate={onNavigate}
        />
      )
    case 'tool-getDocument':
      return part.output.found ? (
        <DocumentDetailCard
          doc={part.output.document}
          onNavigate={onNavigate}
        />
      ) : (
        <Empty text={`${t.assistant.noResults}: ${part.output.number}`} />
      )
    case 'tool-getSummary':
      return <SummaryTiles data={part.output} onNavigate={onNavigate} />
    case 'tool-getClientBalance':
      return part.output.found ? (
        <ClientBalanceCard data={part.output} onNavigate={onNavigate} />
      ) : (
        <Empty text={`${t.assistant.noResults}: ${part.output.clientName}`} />
      )
    default:
      return null
  }
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted-foreground text-sm">{text}</p>
}

function useFmt() {
  const { settings } = useAppContext()
  const locale = useUiStore((s) => s.locale)
  return {
    money: (n: number, currency: string) => formatCurrency(n, currency, locale),
    date: (yyyyMmDd: string) =>
      formatDate(dateOnlyToDb(yyyyMmDd), {
        language: locale,
        timezone: settings.timezone,
      }),
  }
}

function ListMeta({
  shown,
  count,
  total,
  currency,
}: {
  shown: number
  count: number
  total: number
  currency: string
}) {
  const t = useT()
  const { money } = useFmt()
  return (
    <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
      <span>
        {t.assistant.showing} {shown} {t.assistant.of} {count}
      </span>
      <span className="text-foreground font-semibold tabular-nums">
        {money(total, currency)}
      </span>
    </div>
  )
}

export function DocumentCards({
  documents,
  onNavigate,
}: {
  documents: Array<DocumentSummary>
  onNavigate?: () => void
}) {
  const t = useT()
  const { money, date } = useFmt()
  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {documents.map((d) => (
        <li key={d.id}>
          <DocLink
            id={d.id}
            type={d.type}
            className="hover:bg-accent/40 flex items-center gap-3 px-3 py-2 transition-colors"
          >
            <span onClick={onNavigate} className="contents">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{d.number}</span>
                  <StatusBadge
                    status={d.status}
                    type={d.type}
                    className="text-[11px]"
                  />
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {d.clientName} ·{' '}
                  {d.type === 'estimate' ? t.docs.validUntil : t.docs.dueDate}{' '}
                  {date(d.dueDate)}
                </span>
              </span>
              <span className="font-semibold tabular-nums">
                {money(d.total, d.currency)}
              </span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </span>
          </DocLink>
        </li>
      ))}
    </ul>
  )
}

type ClientRow = Extract<
  AssistantToolOutputPart,
  { type: 'tool-searchClients' }
>['output']['clients'][number]

function ClientRows({
  clients,
  onNavigate,
}: {
  clients: Array<ClientRow>
  onNavigate?: () => void
}) {
  const t = useT()
  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {clients.map((c) => (
        <li key={c.id}>
          <Link
            to="/clients/$clientId"
            params={{ clientId: c.id }}
            onClick={onNavigate}
            className="hover:bg-accent/40 flex items-center gap-3 px-3 py-2 transition-colors"
          >
            <Users className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {c.name}
                {c.company ? (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · {c.company}
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {[c.phone, c.email].filter(Boolean).join(' · ') || '—'}
              </span>
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {c.documentCount} {t.dashboard.invoicesCount}
            </span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

type SummaryOutput = Extract<
  AssistantToolOutputPart,
  { type: 'tool-getSummary' }
>['output']

function SummaryTiles({
  data,
  onNavigate,
}: {
  data: SummaryOutput
  onNavigate?: () => void
}) {
  const t = useT()
  const { money } = useFmt()
  const tiles = [
    {
      label: t.assistant.outstanding,
      value: money(data.outstanding.total, data.currency),
      sub: `${data.outstanding.count} ${t.dashboard.invoicesCount}`,
      icon: Clock,
      tone: 'neutral' as const,
    },
    {
      label: t.assistant.overdue,
      value: money(data.overdue.total, data.currency),
      sub: `${data.overdue.count} ${t.dashboard.invoicesCount}`,
      icon: AlertTriangle,
      tone:
        data.overdue.count > 0 ? ('serious' as const) : ('neutral' as const),
    },
    {
      label: t.assistant.paidThisMonth,
      value: money(data.paidThisMonth.total, data.currency),
      sub: `${data.paidThisMonth.count} ${t.dashboard.invoicesCount}`,
      icon: CheckCircle2,
      tone: 'good' as const,
    },
    {
      label: t.assistant.drafts,
      value: String(data.drafts),
      sub: `${data.estimatesPending} ${t.assistant.estimatesPending.toLowerCase()}`,
      icon: FileText,
      tone: 'neutral' as const,
    },
  ]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border p-3">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>{tile.label}</span>
              <tile.icon
                className={cn(
                  'size-3.5',
                  tile.tone === 'serious' && 'text-destructive',
                  tile.tone === 'good' && 'text-primary',
                )}
              />
            </div>
            <div className="mt-1 text-lg font-bold tracking-tight tabular-nums">
              {tile.value}
            </div>
            <div className="text-muted-foreground text-xs">{tile.sub}</div>
          </div>
        ))}
      </div>
      {data.mostUrgentOverdue.length > 0 && (
        <>
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t.dashboard.overdueList}
          </div>
          <DocumentCards
            documents={data.mostUrgentOverdue}
            onNavigate={onNavigate}
          />
        </>
      )}
    </div>
  )
}

type BalanceOutput = Extract<
  Extract<AssistantToolOutputPart, { type: 'tool-getClientBalance' }>['output'],
  { found: true }
>

function ClientBalanceCard({
  data,
  onNavigate,
}: {
  data: BalanceOutput
  onNavigate?: () => void
}) {
  const t = useT()
  const { money } = useFmt()
  return (
    <div className="space-y-3">
      <Link
        to="/clients/$clientId"
        params={{ clientId: data.client.id }}
        onClick={onNavigate}
        className="hover:bg-accent/40 flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
      >
        <div className="min-w-0">
          <div className="truncate font-semibold">{data.client.name}</div>
          <div className="text-muted-foreground truncate text-xs">
            {[data.client.company, data.client.phone, data.client.email]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground text-xs">
            {t.assistant.outstanding}
          </div>
          <div
            className={cn(
              'text-lg font-bold tabular-nums',
              data.outstandingTotal > 0 && 'text-destructive',
            )}
          >
            {money(data.outstandingTotal, data.currency)}
          </div>
          <div className="text-muted-foreground text-xs">
            {t.assistant.paid}: {money(data.paidTotal, data.currency)}
          </div>
        </div>
      </Link>
      {data.otherMatches.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t.assistant.results}: {data.otherMatches.join(', ')}
        </p>
      )}
      <DocumentCards
        documents={data.outstanding.length > 0 ? data.outstanding : data.recent}
        onNavigate={onNavigate}
      />
    </div>
  )
}

type DetailOutput = Extract<
  Extract<AssistantToolOutputPart, { type: 'tool-getDocument' }>['output'],
  { found: true }
>['document']

function DocumentDetailCard({
  doc,
  onNavigate,
}: {
  doc: DetailOutput
  onNavigate?: () => void
}) {
  const t = useT()
  const { money, date } = useFmt()
  const isEstimate = doc.type === 'estimate'
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">{doc.number}</span>
            <StatusBadge
              status={doc.status}
              type={doc.type}
              className="text-[11px]"
            />
          </div>
          <div className="text-muted-foreground text-xs">
            {doc.client.name} · {t.docs.issueDate} {date(doc.issueDate)} ·{' '}
            {isEstimate ? t.docs.validUntil : t.docs.dueDate}{' '}
            {date(doc.dueDate)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">
            {money(doc.total, doc.currency)}
          </div>
          {isEstimate && doc.depositAmount ? (
            <div className="text-primary text-xs">
              {t.docs.deposit}: {money(doc.depositAmount, doc.currency)}
            </div>
          ) : null}
        </div>
      </div>
      <ul className="divide-y rounded-md border text-xs">
        {doc.items.map((it, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 px-2 py-1.5"
          >
            <span className="min-w-0 flex-1 truncate">{it.description}</span>
            <span className="text-muted-foreground tabular-nums">
              {it.quantity} × {money(it.unitPrice, doc.currency)}
            </span>
            <span className="font-medium tabular-nums">
              {money(it.amount, doc.currency)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <DocLink
          id={doc.id}
          type={doc.type}
          className="bg-primary text-primary-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium"
        >
          <span onClick={onNavigate} className="contents">
            {t.assistant.openDocument}
            <ChevronRight className="size-3.5" />
          </span>
        </DocLink>
        {doc.publicUrl && (
          <a
            href={doc.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium"
          >
            {t.docs.detail.openPublic}
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

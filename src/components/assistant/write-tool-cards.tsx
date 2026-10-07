import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Ban,
  CheckCircle2,
  ChevronRight,
  FileText,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { useFmt } from './tool-results'
import type { AssistantToolPart } from './types'
import type { ReactNode } from 'react'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { DocLink } from '@/components/documents/doc-link'
import { ShareDialog } from '@/components/documents/share-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { clientDetailQuery } from '@/data/clients/queries'
import { useAppContext } from '@/hooks/use-app-context'
import { todayInZone } from '@/lib/dates'
import { resolveDocumentDraft } from '@/lib/document-draft'
import { useT } from '@/lib/i18n'
import { computeTotals } from '@/lib/invoice-math'
import { useUiStore } from '@/stores/ui-store'

export type WriteToolPart = Extract<
  AssistantToolPart,
  { type: 'tool-createClient' | 'tool-createDocument' }
>

export function isWriteToolPart(
  part: AssistantToolPart,
): part is WriteToolPart {
  return (
    part.type === 'tool-createClient' || part.type === 'tool-createDocument'
  )
}

export type ApprovalHandler = (approvalId: string, approved: boolean) => void

/**
 * Tools that change data. The model proposes, the owner confirms on a card,
 * and only then does the server write. Every state of the call has a view so
 * the card never jumps: preview → saving → result (or cancelled).
 */
export function WriteToolResult({
  part,
  onApproval,
  onNavigate,
}: {
  part: WriteToolPart
  onApproval: ApprovalHandler
  onNavigate?: () => void
}) {
  const t = useT()
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return <Pending label={t.assistant.write.preparing} />
    case 'approval-requested':
      return part.type === 'tool-createClient' ? (
        <ClientConfirmCard
          input={part.input}
          onApprove={(ok) => onApproval(part.approval.id, ok)}
        />
      ) : (
        <DocumentConfirmCard
          input={part.input}
          onApprove={(ok) => onApproval(part.approval.id, ok)}
        />
      )
    case 'approval-responded':
      return part.approval.approved ? (
        <Pending label={t.assistant.write.saving} />
      ) : (
        <Cancelled />
      )
    case 'output-denied':
      return <Cancelled />
    case 'output-error':
      // Without an approval the input was invalid (say, a phone without a
      // country code): the model asks the user, nothing to show here.
      return part.approval ? (
        <p className="text-destructive rounded-xl border px-3 py-2 text-sm">
          {t.assistant.write.failed}
        </p>
      ) : null
    case 'output-available':
      return part.type === 'tool-createClient' ? (
        <ClientCreatedCard output={part.output} onNavigate={onNavigate} />
      ) : (
        <DocumentCreatedCard output={part.output} onNavigate={onNavigate} />
      )
  }
}

function Pending({ label }: { label: string }) {
  return (
    <div className="bg-card/70 text-muted-foreground flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
      <Spinner className="size-3.5" />
      <Shimmer as="span">{label}</Shimmer>
    </div>
  )
}

function Cancelled() {
  const t = useT()
  return (
    <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm">
      <Ban className="size-3.5" />
      {t.assistant.write.cancelled}
    </div>
  )
}

function ConfirmShell({
  icon,
  title,
  children,
  onApprove,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  onApprove: (approved: boolean) => void
}) {
  const t = useT()
  return (
    <div className="border-primary/40 bg-card w-full space-y-3 rounded-xl border-2 p-3 text-sm shadow-sm">
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>
      {children}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => onApprove(false)}>
          {t.common.cancel}
        </Button>
        <Button size="sm" autoFocus onClick={() => onApprove(true)}>
          <CheckCircle2 />
          {t.assistant.write.approve}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="text-muted-foreground w-28 shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  )
}

type ClientInput = Extract<
  WriteToolPart,
  { type: 'tool-createClient'; state: 'approval-requested' }
>['input']

function ClientConfirmCard({
  input,
  onApprove,
}: {
  input: ClientInput
  onApprove: (approved: boolean) => void
}) {
  const t = useT()
  const { settings } = useAppContext()
  // Same default as the server tool.
  const language = input.preferredLanguage ?? settings.defaultInvoiceLanguage
  return (
    <ConfirmShell
      icon={<UserPlus className="text-primary size-4" />}
      title={t.assistant.write.confirmClient}
      onApprove={onApprove}
    >
      <dl className="space-y-1.5">
        <Field label={t.clients.name} value={input.name} />
        {input.phone && <Field label={t.clients.phone} value={input.phone} />}
        {input.email && <Field label={t.clients.email} value={input.email} />}
        {input.company && (
          <Field label={t.clients.company} value={input.company} />
        )}
        {input.address && (
          <Field label={t.clients.address} value={input.address} />
        )}
        {input.notes && <Field label={t.clients.notes} value={input.notes} />}
        <Field
          label={t.clients.preferredLanguage}
          value={language === 'es' ? t.common.spanish : t.common.english}
        />
      </dl>
    </ConfirmShell>
  )
}

type DocumentInput = Extract<
  WriteToolPart,
  { type: 'tool-createDocument'; state: 'approval-requested' }
>['input']

function DocumentConfirmCard({
  input,
  onApprove,
}: {
  input: DocumentInput
  onApprove: (approved: boolean) => void
}) {
  const t = useT()
  const { money, date } = useFmt()
  const { settings } = useAppContext()
  const client = useQuery(clientDetailQuery(input.clientId))
  // The exact defaults the server applies, so the preview is what gets saved.
  const draft = resolveDocumentDraft(input, {
    settings,
    clientLanguage: client.data?.preferredLanguage,
    today: todayInZone(settings.timezone),
  })
  const totals = computeTotals(draft.items)
  const isEstimate = input.type === 'estimate'

  return (
    <ConfirmShell
      icon={<FileText className="text-primary size-4" />}
      title={
        isEstimate
          ? t.assistant.write.confirmEstimate
          : t.assistant.write.confirmInvoice
      }
      onApprove={onApprove}
    >
      <dl className="space-y-1.5">
        <Field
          label={t.assistant.write.client}
          value={
            client.data?.name ??
            (client.isError ? '—' : <Spinner className="size-3.5" />)
          }
        />
        <Field
          label={isEstimate ? t.docs.validUntil : t.docs.dueDate}
          value={date(draft.dueDate)}
        />
        <Field
          label={t.assistant.write.language}
          value={draft.language === 'es' ? t.common.spanish : t.common.english}
        />
      </dl>
      <ul className="divide-y rounded-md border text-xs">
        {draft.items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 px-2 py-1.5">
            <span className="min-w-0 flex-1 break-words">{it.description}</span>
            <span className="text-muted-foreground tabular-nums">
              {it.quantity} × {money(it.unitPrice, draft.currency)}
              {it.taxRate ? ` + ${it.taxRate}%` : ''}
            </span>
            <span className="font-medium tabular-nums">
              {money(totals.itemAmounts[i], draft.currency)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="ml-auto w-48 space-y-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t.docs.builder.subtotal}</dt>
          <dd className="tabular-nums">
            {money(totals.subtotal, draft.currency)}
          </dd>
        </div>
        {totals.taxTotal > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.docs.builder.taxTotal}</dt>
            <dd className="tabular-nums">
              {money(totals.taxTotal, draft.currency)}
            </dd>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <dt>{t.docs.builder.total}</dt>
          <dd className="tabular-nums">
            {money(totals.total, draft.currency)}
          </dd>
        </div>
      </dl>
      {draft.notes && (
        <p className="text-muted-foreground text-xs whitespace-pre-wrap">
          {draft.notes}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        {t.assistant.write.draftNote}
      </p>
    </ConfirmShell>
  )
}

type ClientOutput = Extract<
  WriteToolPart,
  { type: 'tool-createClient'; state: 'output-available' }
>['output']

function ClientCreatedCard({
  output,
  onNavigate,
}: {
  output: ClientOutput
  onNavigate?: () => void
}) {
  const t = useT()
  const c = output.client
  return (
    <div className="bg-card/70 w-full space-y-2 rounded-xl border p-3 text-sm">
      <div className="text-primary flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <CheckCircle2 className="size-3.5" />
        {output.status === 'existing'
          ? t.assistant.write.clientExisting
          : t.assistant.write.clientCreated}
      </div>
      <Link
        to="/clients/$clientId"
        params={{ clientId: c.id }}
        onClick={onNavigate}
        className="hover:bg-accent/40 flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors"
      >
        <UserPlus className="text-muted-foreground size-4 shrink-0" />
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
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </div>
  )
}

type DocumentOutput = Extract<
  WriteToolPart,
  { type: 'tool-createDocument'; state: 'output-available' }
>['output']

function DocumentCreatedCard({
  output,
  onNavigate,
}: {
  output: DocumentOutput
  onNavigate?: () => void
}) {
  const t = useT()
  const { money, date } = useFmt()
  const openUpgrade = useUiStore((s) => s.openUpgrade)
  const [shareOpen, setShareOpen] = useState(false)

  if (output.status === 'plan_limit') {
    return (
      <div className="bg-card/70 w-full space-y-3 rounded-xl border p-3 text-sm">
        <p>{t.assistant.write.planLimit}</p>
        <Button size="sm" onClick={() => openUpgrade('documents')}>
          <Sparkles />
          {t.assistant.write.seePro}
        </Button>
      </div>
    )
  }
  if (output.status === 'client_not_found') {
    return (
      <p className="text-muted-foreground rounded-xl border px-3 py-2 text-sm">
        {t.assistant.write.clientNotFound}
      </p>
    )
  }

  const d = output.document
  const isEstimate = d.type === 'estimate'
  return (
    <div className="bg-card/70 w-full space-y-3 rounded-xl border p-3 text-sm">
      <div className="text-primary flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <CheckCircle2 className="size-3.5" />
        {isEstimate
          ? t.assistant.write.estimateCreated
          : t.assistant.write.invoiceCreated}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold tabular-nums">{d.number}</div>
          <div className="text-muted-foreground truncate text-xs">
            {d.clientName} · {isEstimate ? t.docs.validUntil : t.docs.dueDate}{' '}
            {date(d.dueDate)}
          </div>
        </div>
        <div className="text-lg font-bold tabular-nums">
          {money(d.total, d.currency)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setShareOpen(true)}>
          <Send />
          {t.common.share}
        </Button>
        <DocLink
          id={d.id}
          type={d.type}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium"
        >
          <span onClick={onNavigate} className="contents">
            {t.assistant.openDocument}
            <ChevronRight className="size-3.5" />
          </span>
        </DocLink>
      </div>
      <p className="text-muted-foreground text-xs">
        {t.assistant.write.shareHint}
      </p>
      <ShareDialog
        docId={d.id}
        clientId={d.clientId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { isPlanLimitError } from '@/components/billing/upgrade-dialog'
import { DocLink, docPath } from '@/components/documents/doc-link'
import { MarkPaidDialog } from '@/components/documents/mark-paid-dialog'
import { ShareDialog } from '@/components/documents/share-dialog'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { clientKeys } from '@/data/clients/queries'
import {
  convertEstimateFn,
  deleteDraftFn,
  duplicateDocumentFn,
  prepareShareFn,
  undoPaidFn,
  voidDocumentFn,
} from '@/data/documents/documents'
import { documentDetailQuery, documentKeys } from '@/data/documents/queries'
import { useAppContext } from '@/hooks/use-app-context'
import { errorMessage, useT } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

export function DocumentDetail({
  id,
  openShare = false,
}: {
  id: string
  openShare?: boolean
}) {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { settings } = useAppContext()
  const locale = useUiStore((s) => s.locale)
  const { data: doc } = useSuspenseQuery(documentDetailQuery(id))

  const [share, setShare] = useState(false)
  const [pay, setPay] = useState(false)
  const [confirm, setConfirm] = useState<null | 'void' | 'delete' | 'convert'>(
    null,
  )

  useEffect(() => {
    if (openShare) setShare(true)
  }, [openShare])

  const isEstimate = doc.type === 'estimate'
  const locked = doc.status === 'paid' || doc.status === 'void'
  const money = (n: string | number) => formatCurrency(n, doc.currency, locale)
  const date = (d: Date | string) =>
    formatDate(d, { language: locale, timezone: settings.timezone })

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: documentKeys.all }),
      queryClient.invalidateQueries({ queryKey: clientKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  const openUpgrade = useUiStore((s) => s.openUpgrade)
  const onError = (err: unknown) =>
    isPlanLimitError(err)
      ? openUpgrade('documents')
      : toast.error(errorMessage(t, err))

  const voidDoc = useMutation({
    mutationFn: () => voidDocumentFn({ data: { id } }),
    onSuccess: async () => {
      await invalidate()
      toast.success(t.docs.detail.voided)
    },
    onError,
  })
  const undoPaid = useMutation({
    mutationFn: () => undoPaidFn({ data: { id } }),
    onSuccess: async () => {
      await invalidate()
      toast.success(t.docs.detail.undonePaid)
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: () => deleteDraftFn({ data: { id } }),
    onSuccess: async (deleted) => {
      await invalidate()
      toast.success(t.docs.detail.deleted)
      await router.navigate({
        to: deleted.type === 'estimate' ? '/estimates' : '/invoices',
      })
    },
    onError,
  })
  const convert = useMutation({
    mutationFn: () => convertEstimateFn({ data: { id } }),
    onSuccess: async (inv) => {
      await invalidate()
      toast.success(t.docs.detail.converted)
      await router.navigate({
        to: '/invoices/$invoiceId',
        params: { invoiceId: inv.id },
      })
    },
    onError,
  })
  const duplicate = useMutation({
    mutationFn: () => duplicateDocumentFn({ data: { id } }),
    onSuccess: async (copy) => {
      await invalidate()
      await router.navigate({ href: docPath(copy.id, copy.type, true) })
    },
    onError,
  })
  const openPdf = useMutation({
    mutationFn: async () => {
      const token =
        doc.publicToken?.token ??
        (await prepareShareFn({ data: { id } })).publicUrl.split('/i/')[1]
      return token
    },
    onSuccess: async (token) => {
      window.open(`/api/pdf/${token}`, '_blank')
      if (!doc.publicToken) await invalidate()
    },
    onError,
  })
  const openPreview = useMutation({
    mutationFn: async () =>
      doc.publicToken?.token ??
      (await prepareShareFn({ data: { id } })).publicUrl.split('/i/')[1],
    onSuccess: async (token) => {
      window.open(`/i/${token}?preview=1`, '_blank')
      if (!doc.publicToken) await invalidate()
    },
    onError,
  })

  const convertedTo = doc.convertedInvoices.at(0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular-nums">{doc.invoiceNumber}</span>
            <StatusBadge
              status={doc.status}
              type={doc.type}
              className="text-sm"
            />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2">
            <Link
              to="/clients/$clientId"
              params={{ clientId: doc.clientId }}
              className="hover:underline"
            >
              {doc.client.name}
            </Link>
            {doc.client.company && <span>· {doc.client.company}</span>}
            {doc.estimate && (
              <span>
                · {t.docs.detail.convertedFrom}{' '}
                <DocLink
                  id={doc.estimate.id}
                  type="estimate"
                  className="text-primary hover:underline"
                >
                  {doc.estimate.invoiceNumber}
                </DocLink>
              </span>
            )}
            {convertedTo && (
              <span>
                · {t.docs.detail.convertedTo}{' '}
                <DocLink
                  id={convertedTo.id}
                  type="invoice"
                  className="text-primary hover:underline"
                >
                  {convertedTo.invoiceNumber}
                </DocLink>
              </span>
            )}
          </span>
        }
        actions={
          <>
            {doc.status !== 'void' && (
              <Button onClick={() => setShare(true)}>
                <Send className="size-4" />
                {t.common.share}
              </Button>
            )}
            {!isEstimate && !locked && (
              <Button variant="outline" onClick={() => setPay(true)}>
                <CheckCircle2 className="size-4" />
                {t.docs.detail.markPaid}
              </Button>
            )}
            {isEstimate && doc.status !== 'void' && !convertedTo && (
              <Button variant="outline" onClick={() => setConfirm('convert')}>
                <ArrowRightLeft className="size-4" />
                {t.docs.detail.convert}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t.common.actions}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!locked && (
                  <DropdownMenuItem asChild>
                    <DocLink id={doc.id} type={doc.type} edit>
                      <Pencil />
                      {t.common.edit}
                    </DocLink>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => openPdf.mutate()}>
                  <Download />
                  {t.docs.detail.downloadPdf}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openPreview.mutate()}>
                  <ExternalLink />
                  {t.docs.detail.openPublic}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicate.mutate()}>
                  <Copy />
                  {t.docs.detail.duplicate}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {doc.status === 'paid' && (
                  <DropdownMenuItem onClick={() => undoPaid.mutate()}>
                    <Undo2 />
                    {t.docs.detail.undoPaid}
                  </DropdownMenuItem>
                )}
                {!locked && (
                  <DropdownMenuItem onClick={() => setConfirm('void')}>
                    <Ban />
                    {t.docs.detail.void}
                  </DropdownMenuItem>
                )}
                {doc.status === 'draft' && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirm('delete')}
                  >
                    <Trash2 />
                    {t.docs.detail.delete}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Meta label={t.docs.issueDate} value={date(doc.issueDate)} />
              <Meta
                label={isEstimate ? t.docs.validUntil : t.docs.dueDate}
                value={date(doc.dueDate)}
                className={
                  doc.status === 'overdue' ? 'text-destructive' : undefined
                }
              />
              <Meta
                label={t.docs.builder.documentLanguage}
                value={doc.language === 'es' ? 'Español' : 'English'}
              />
              {doc.paidAt ? (
                <Meta
                  label={t.docs.detail.paidOn}
                  value={`${date(doc.paidAt)}${doc.paymentMethod ? ` · ${labelFor(t.docs.paymentMethods, doc.paymentMethod)}` : ''}`}
                />
              ) : (
                <Meta label={t.docs.builder.currency} value={doc.currency} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.docs.builder.items}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {doc.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start justify-between gap-4 px-6 py-3"
                  >
                    <div className="min-w-0">
                      <div className="whitespace-pre-line">
                        {it.description}
                      </div>
                      <div className="text-muted-foreground text-sm tabular-nums">
                        {Number(it.quantity)} × {money(it.unitPrice)}
                        {it.taxRate && Number(it.taxRate) > 0
                          ? ` · ${t.docs.builder.tax} ${Number(it.taxRate)}%`
                          : ''}
                      </div>
                    </div>
                    <div className="font-semibold tabular-nums">
                      {money(it.amount)}
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="ml-auto max-w-xs space-y-1.5 px-6 py-4 text-sm">
                <Row
                  label={t.docs.builder.subtotal}
                  value={money(doc.subtotal)}
                />
                {Number(doc.discountAmount) > 0 && (
                  <Row
                    label={t.docs.builder.discount}
                    value={`−${money(doc.discountAmount)}`}
                  />
                )}
                {Number(doc.taxTotal) > 0 && (
                  <Row
                    label={t.docs.builder.taxTotal}
                    value={money(doc.taxTotal)}
                  />
                )}
                <div className="flex items-baseline justify-between border-t pt-2">
                  <dt className="font-semibold">{t.docs.total}</dt>
                  <dd className="text-2xl font-bold tabular-nums">
                    {money(doc.total)}
                  </dd>
                </div>
                {isEstimate &&
                doc.depositAmount &&
                Number(doc.depositAmount) > 0 ? (
                  <Row
                    label={t.docs.deposit}
                    value={money(doc.depositAmount)}
                    className="text-primary font-medium"
                  />
                ) : null}
              </dl>
            </CardContent>
          </Card>

          {(doc.notes ||
            doc.paymentInstructionsOverride ||
            settings.paymentInstructions) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-accent/40">
                <CardHeader>
                  <CardTitle className="text-primary text-xs tracking-[0.08em] uppercase">
                    {t.public.howToPay}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-line">
                  {doc.paymentInstructionsOverride ??
                    settings.paymentInstructions}
                </CardContent>
              </Card>
              {doc.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-muted-foreground text-xs tracking-[0.08em] uppercase">
                      {t.public.notes}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-line">
                    {doc.notes}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>{t.docs.detail.timeline}</CardTitle>
          </CardHeader>
          <CardContent>
            {doc.events.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t.docs.detail.noEvents}
              </p>
            ) : (
              <ol className="relative space-y-4 border-l pl-4 text-sm">
                {doc.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="bg-primary absolute top-1.5 -left-[1.3rem] size-2 rounded-full" />
                    <div className="font-medium">
                      {labelFor(t.docs.detail.events, e.eventType)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {new Intl.DateTimeFormat(
                        locale === 'es' ? 'es-US' : 'en-US',
                        {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: settings.timezone,
                        },
                      ).format(new Date(e.createdAt))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <ShareDialog
        docId={doc.id}
        clientId={doc.clientId}
        open={share}
        onOpenChange={setShare}
      />
      {!isEstimate && (
        <MarkPaidDialog docId={doc.id} open={pay} onOpenChange={setPay} />
      )}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'void'
                ? t.docs.detail.voidTitle
                : confirm === 'delete'
                  ? t.docs.detail.deleteTitle
                  : t.docs.detail.convertTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'void'
                ? t.docs.detail.voidBody
                : confirm === 'delete'
                  ? t.docs.detail.deleteBody
                  : t.docs.detail.convertBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm === 'delete'
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : undefined
              }
              onClick={() => {
                if (confirm === 'void') voidDoc.mutate()
                if (confirm === 'delete') remove.mutate()
                if (confirm === 'convert') convert.mutate()
                setConfirm(null)
              }}
            >
              {t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** DB stores payment methods / event types as plain text; fall back to the raw value. */
function labelFor(dict: Record<string, string>, key: string): string {
  return (dict as Partial<Record<string, string>>)[key] ?? key
}

function Meta({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={`font-medium ${className ?? ''}`}>{value}</div>
    </div>
  )
}

function Row({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`flex justify-between ${className ?? ''}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

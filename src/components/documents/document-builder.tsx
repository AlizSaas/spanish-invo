import { useEffect, useMemo } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Send, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { DocumentDetail } from '@/data/documents/documents'
import type { DocumentType, Language } from '@/lib/constants'
import type { DocumentInput } from '@/lib/validators/documents'
import { docPath } from '@/components/documents/doc-link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { clientKeys, clientsListQuery } from '@/data/clients/queries'
import { createDocumentFn, updateDocumentFn } from '@/data/documents/documents'
import { documentKeys } from '@/data/documents/queries'
import { useAppContext } from '@/hooks/use-app-context'
import { CURRENCIES } from '@/lib/constants'
import { addDays, dbToDateOnly, todayDateOnly } from '@/lib/dates'
import { errorMessage, useT } from '@/lib/i18n'
import { toNumber } from '@/lib/invoice-math'
import { formatCurrency } from '@/lib/utils'
import {
  computeDraftTotals,
  newItem,
  useInvoiceBuilder,
} from '@/stores/invoice-builder-store'
import { useUiStore } from '@/stores/ui-store'

interface Props {
  type: DocumentType
  /** Pre-select a client (from /clients/$id or after creating one) */
  initialClientId?: string
  /** When set, the builder edits this document instead of creating one */
  editing?: DocumentDetail
}

export function DocumentBuilder({ type, initialClientId, editing }: Props) {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { settings } = useAppContext()
  const locale = useUiStore((s) => s.locale)

  const draft = useInvoiceBuilder((s) => s.draft)
  const editingId = useInvoiceBuilder((s) => s.editingId)
  const { start, set, addItem, updateItem, removeItem, moveItem, reset } =
    useInvoiceBuilder()
  const totals = useMemo(() => computeDraftTotals(draft), [draft])

  const { data: clients } = useQuery(clientsListQuery())
  const isEstimate = type === 'estimate'

  // Seed the store from settings / the document being edited.
  useEffect(() => {
    if (editing) {
      start(
        {
          type: editing.type,
          clientId: editing.clientId,
          language: editing.language,
          issueDate: dbToDateOnly(editing.issueDate),
          dueDate: dbToDateOnly(editing.dueDate),
          currency: editing.currency,
          items: editing.items.map((it) =>
            newItem({
              description: it.description,
              quantity: String(Number(it.quantity)),
              unitPrice: String(Number(it.unitPrice)),
              taxRate: it.taxRate != null ? String(Number(it.taxRate)) : '',
            }),
          ),
          discountType: editing.discountType,
          discountValue:
            editing.discountValue != null
              ? String(Number(editing.discountValue))
              : '',
          depositAmount:
            editing.depositAmount != null
              ? String(Number(editing.depositAmount))
              : '',
          notes: editing.notes ?? '',
          paymentInstructionsOverride:
            editing.paymentInstructionsOverride ?? '',
        },
        editing.id,
      )
    } else {
      const today = todayDateOnly()
      const defaultTax =
        Number(settings.defaultTaxRate) > 0
          ? String(Number(settings.defaultTaxRate))
          : ''
      start({
        type,
        clientId: initialClientId ?? null,
        language: settings.defaultInvoiceLanguage,
        issueDate: today,
        dueDate: addDays(today, isEstimate ? 30 : settings.defaultDueDays),
        currency: settings.defaultCurrency,
        items: [newItem({ taxRate: defaultTax })],
        notes: settings.defaultNotes ?? '',
      })
    }
    return () => reset()
    // Intentionally keyed on the document identity only; settings are read once at mount.
  }, [editing?.id, type])

  // Picking a client adopts the client's language.
  const selectedClient = useMemo(
    () => clients?.find((c) => c.id === draft.clientId),
    [clients, draft.clientId],
  )
  useEffect(() => {
    if (selectedClient && !editing)
      set('language', selectedClient.preferredLanguage)
    // Only react to a change of client, not to every language edit.
  }, [selectedClient?.id])

  const save = useMutation({
    mutationFn: async (opts: { share: boolean }) => {
      const input = toInput(draft, type)
      if (!input.clientId) throw new Error('docs.builder.needClient')
      if (input.items.length === 0) throw new Error('docs.builder.needItem')
      const doc = editingId
        ? await updateDocumentFn({ data: { id: editingId, data: input } })
        : await createDocumentFn({ data: input })
      return { doc, share: opts.share }
    },
    onSuccess: async ({ doc, share }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentKeys.all }),
        queryClient.invalidateQueries({ queryKey: clientKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success(t.docs.builder.saved)
      await router.navigate({
        href: docPath(doc.id, doc.type) + (share ? '?share=1' : ''),
      })
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  const useDefaultInstructions = draft.paymentInstructionsOverride === ''
  const money = (n: number) => formatCurrency(n, draft.currency, locale)
  const returnTo = isEstimate ? '/estimates/new' : '/invoices/new'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-6">
        {/* Client + language */}
        <Card>
          <CardContent className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field>
              <FieldLabel>{t.docs.client}</FieldLabel>
              {clients && clients.length === 0 ? (
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/clients/new" search={{ returnTo }}>
                    <UserPlus className="size-4" />
                    {t.docs.builder.addClient}
                  </Link>
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={draft.clientId ?? ''}
                    onValueChange={(v) => set('clientId', v)}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder={t.docs.builder.selectClient} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.company ? ` · ${c.company}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    title={t.docs.builder.addClient}
                  >
                    <Link to="/clients/new" search={{ returnTo }}>
                      <UserPlus className="size-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </Field>
            <Field>
              <FieldLabel>{t.docs.builder.documentLanguage}</FieldLabel>
              <Tabs
                value={draft.language}
                onValueChange={(v) => set('language', v as Language)}
              >
                <TabsList className="h-11">
                  <TabsTrigger value="es" className="px-4">
                    Español
                  </TabsTrigger>
                  <TabsTrigger value="en" className="px-4">
                    English
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </Field>
          </CardContent>
        </Card>

        {/* Dates + currency */}
        <Card>
          <CardContent className="grid gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="issueDate">{t.docs.issueDate}</FieldLabel>
              <Input
                id="issueDate"
                type="date"
                value={draft.issueDate}
                onChange={(e) => set('issueDate', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dueDate">
                {isEstimate ? t.docs.validUntil : t.docs.dueDate}
              </FieldLabel>
              <Input
                id="dueDate"
                type="date"
                value={draft.dueDate}
                min={draft.issueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{t.docs.builder.currency}</FieldLabel>
              <Select
                value={draft.currency}
                onValueChange={(v) => set('currency', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t.docs.builder.items}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                addItem({ taxRate: draft.items.at(-1)?.taxRate ?? '' })
              }
            >
              <Plus className="size-4" />
              {t.docs.builder.addItem}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-muted-foreground hidden grid-cols-[1fr_5rem_7rem_5rem_7rem_8rem] gap-2 px-1 text-xs font-medium tracking-wide uppercase md:grid">
              <span>{t.docs.builder.description}</span>
              <span>{t.docs.builder.qty}</span>
              <span>{t.docs.builder.price}</span>
              <span>{t.docs.builder.tax}</span>
              <span className="text-right">{t.docs.builder.amount}</span>
              <span />
            </div>
            {draft.items.map((it, i) => (
              <div
                key={it.key}
                className="bg-muted/30 grid grid-cols-2 gap-2 rounded-xl border p-3 md:grid-cols-[1fr_5rem_7rem_5rem_7rem_8rem] md:items-center md:border-0 md:bg-transparent md:p-0"
              >
                <Textarea
                  placeholder={t.docs.builder.descriptionPlaceholder}
                  value={it.description}
                  rows={1}
                  className="col-span-2 min-h-10 resize-none md:col-span-1"
                  onChange={(e) =>
                    updateItem(it.key, { description: e.target.value })
                  }
                />
                <LabeledNumber
                  label={t.docs.builder.qty}
                  value={it.quantity}
                  onChange={(v) => updateItem(it.key, { quantity: v })}
                />
                <LabeledNumber
                  label={t.docs.builder.price}
                  value={it.unitPrice}
                  onChange={(v) => updateItem(it.key, { unitPrice: v })}
                  prefix="$"
                />
                <LabeledNumber
                  label={t.docs.builder.tax}
                  value={it.taxRate}
                  onChange={(v) => updateItem(it.key, { taxRate: v })}
                  suffix="%"
                />
                <div className="flex items-center justify-between md:block md:text-right">
                  <span className="text-muted-foreground text-xs md:hidden">
                    {t.docs.builder.amount}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {money(totals.itemAmounts[i] ?? 0)}
                  </span>
                </div>
                <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === 0}
                    onClick={() => moveItem(it.key, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === draft.items.length - 1}
                    onClick={() => moveItem(it.key, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(it.key)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Discount, deposit, notes, payment instructions */}
        <Card>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t.docs.builder.discount}</FieldLabel>
                <div className="flex gap-2">
                  <Select
                    value={draft.discountType ?? 'none'}
                    onValueChange={(v) =>
                      set(
                        'discountType',
                        v === 'none' ? null : (v as 'fixed' | 'percentage'),
                      )
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t.docs.builder.noDiscount}
                      </SelectItem>
                      <SelectItem value="fixed">
                        {t.docs.builder.discountFixed}
                      </SelectItem>
                      <SelectItem value="percentage">
                        {t.docs.builder.discountPercent}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.discountType && (
                    <Input
                      inputMode="decimal"
                      value={draft.discountValue}
                      placeholder={
                        draft.discountType === 'percentage' ? '10' : '25.00'
                      }
                      onChange={(e) => set('discountValue', e.target.value)}
                    />
                  )}
                </div>
              </Field>
              {isEstimate && (
                <Field>
                  <FieldLabel htmlFor="deposit">{t.docs.deposit}</FieldLabel>
                  <Input
                    id="deposit"
                    inputMode="decimal"
                    value={draft.depositAmount}
                    placeholder="0.00"
                    onChange={(e) => set('depositAmount', e.target.value)}
                  />
                  <FieldDescription>
                    {t.docs.builder.depositHelp}
                  </FieldDescription>
                </Field>
              )}
            </div>

            <Field>
              <FieldLabel htmlFor="notes">{t.docs.builder.notes}</FieldLabel>
              <Textarea
                id="notes"
                rows={2}
                placeholder={t.docs.builder.notesPlaceholder}
                value={draft.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel>{t.docs.builder.paymentInstructions}</FieldLabel>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={useDefaultInstructions}
                    onCheckedChange={(on) =>
                      set(
                        'paymentInstructionsOverride',
                        on ? '' : (settings.paymentInstructions ?? ' '),
                      )
                    }
                  />
                  {t.docs.builder.useDefaultInstructions}
                </label>
              </div>
              {useDefaultInstructions ? (
                <p className="text-muted-foreground bg-muted/40 rounded-lg border border-dashed p-3 text-sm whitespace-pre-line">
                  {settings.paymentInstructions || '—'}
                </p>
              ) : (
                <Textarea
                  rows={3}
                  value={draft.paymentInstructionsOverride}
                  onChange={(e) =>
                    set('paymentInstructionsOverride', e.target.value)
                  }
                />
              )}
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* Totals + actions */}
      <div className="space-y-4 lg:sticky lg:top-24">
        <Card>
          <CardContent className="space-y-2 text-sm">
            <Row
              label={t.docs.builder.subtotal}
              value={money(totals.subtotal)}
            />
            {totals.discountAmount > 0 && (
              <Row
                label={t.docs.builder.discount}
                value={`−${money(totals.discountAmount)}`}
              />
            )}
            {totals.taxTotal > 0 && (
              <Row
                label={t.docs.builder.taxTotal}
                value={money(totals.taxTotal)}
              />
            )}
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="font-semibold">{t.docs.builder.total}</span>
              <span className="text-2xl font-bold tabular-nums">
                {money(totals.total)}
              </span>
            </div>
            {isEstimate && toNumber(draft.depositAmount) > 0 && (
              <Row
                label={t.docs.deposit}
                value={money(toNumber(draft.depositAmount))}
                className="text-primary font-medium"
              />
            )}
          </CardContent>
        </Card>
        <div className="grid gap-2">
          <Button
            size="lg"
            className="h-12"
            disabled={save.isPending}
            onClick={() => save.mutate({ share: true })}
          >
            {save.isPending ? <Spinner /> : <Send className="size-4" />}
            {t.docs.builder.saveAndShare}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12"
            disabled={save.isPending}
            onClick={() => save.mutate({ share: false })}
          >
            {editingId ? t.docs.builder.saveChanges : t.docs.builder.saveDraft}
          </Button>
        </div>
      </div>
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
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function LabeledNumber({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  prefix?: string
  suffix?: string
}) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-xs md:hidden">
        {label}
      </span>
      <div className="relative">
        {prefix && (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm">
            {prefix}
          </span>
        )}
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${prefix ? 'pl-6' : ''} ${suffix ? 'pr-6' : ''} tabular-nums`}
        />
        {suffix && (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

/** Store (strings) → validated server input (numbers). Empty rows are dropped. */
function toInput(
  draft: ReturnType<typeof useInvoiceBuilder.getState>['draft'],
  type: DocumentType,
): DocumentInput {
  return {
    type,
    clientId: draft.clientId ?? '',
    language: draft.language,
    issueDate: draft.issueDate,
    dueDate: draft.dueDate,
    currency: draft.currency as 'USD' | 'MXN',
    items: draft.items
      .filter((it) => it.description.trim() !== '')
      .map((it) => ({
        description: it.description.trim(),
        quantity: toNumber(it.quantity) || 1,
        unitPrice: toNumber(it.unitPrice),
        taxRate: it.taxRate.trim() === '' ? null : toNumber(it.taxRate),
      })),
    discountType: draft.discountType,
    discountValue: draft.discountType ? toNumber(draft.discountValue) : null,
    depositAmount:
      type === 'estimate' && draft.depositAmount.trim() !== ''
        ? toNumber(draft.depositAmount)
        : null,
    notes: draft.notes.trim() || null,
    paymentInstructionsOverride:
      draft.paymentInstructionsOverride.trim() || null,
  }
}

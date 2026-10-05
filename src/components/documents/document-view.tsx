import { Download, Mail, MapPin, Phone } from 'lucide-react'
import type { PublicDocument } from '@/lib/types'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

/**
 * Customer-facing rendering of an invoice/estimate. Strings follow the
 * document's own language, not the owner's UI language.
 */
export function DocumentView({
  doc,
  pdfHref,
}: {
  doc: PublicDocument
  pdfHref: string
}) {
  const t = getDictionary(doc.language).public
  const lang = doc.language
  const tz = doc.business.timezone
  const money = (n: number) => formatCurrency(n, doc.currency, lang)
  const date = (iso: string) =>
    formatDate(iso, { language: lang, timezone: tz })
  const isEstimate = doc.type === 'estimate'

  const stamp =
    doc.status === 'paid'
      ? { label: t.paid, cls: 'text-emerald-700 border-emerald-700' }
      : doc.status === 'void'
        ? { label: t.void, cls: 'text-zinc-500 border-zinc-500' }
        : doc.status === 'overdue' && !isEstimate
          ? { label: t.overdue, cls: 'text-red-700 border-red-700' }
          : null

  return (
    <div className="min-h-dvh bg-[oklch(0.96_0.006_95)] py-6 md:py-10 dark:bg-background">
      <div className="mx-auto w-full max-w-3xl px-3 md:px-6">
        {/* Action bar */}
        <div className="no-print mb-4 flex items-center justify-between gap-3">
          <div className="text-muted-foreground min-w-0 truncate text-sm">
            {doc.business.name}
          </div>
          <Button asChild size="lg" className="h-11 shrink-0">
            <a href={pdfHref} target="_blank" rel="noreferrer">
              <Download className="size-4" />
              {t.downloadPdf}
            </a>
          </Button>
        </div>

        <article className="bg-card text-card-foreground relative overflow-hidden rounded-2xl border shadow-sm">
          {stamp && (
            <div
              className={cn(
                'pointer-events-none absolute top-8 right-6 rotate-[-12deg] rounded-lg border-[3px] px-4 py-1 text-xl font-black tracking-[0.15em] opacity-80 md:top-10 md:right-10 md:text-2xl',
                stamp.cls,
              )}
            >
              {stamp.label}
            </div>
          )}

          {/* Header */}
          <header className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between md:p-10">
            <div className="flex items-start gap-4">
              {doc.business.logoUrl && (
                <img
                  src={doc.business.logoUrl}
                  alt=""
                  className="max-h-16 max-w-40 object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {doc.business.name}
                </h1>
                <div className="text-muted-foreground mt-1 space-y-0.5 text-sm">
                  {doc.business.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3.5" />
                      <a
                        href={`tel:${doc.business.phone}`}
                        className="hover:underline"
                      >
                        {doc.business.phone}
                      </a>
                    </div>
                  )}
                  {doc.business.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3.5" />
                      <a
                        href={`mailto:${doc.business.email}`}
                        className="hover:underline"
                      >
                        {doc.business.email}
                      </a>
                    </div>
                  )}
                  {doc.business.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span className="whitespace-pre-line">
                        {doc.business.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="md:text-right">
              <div className="text-primary text-2xl font-extrabold tracking-[0.12em]">
                {isEstimate ? t.estimate : t.invoice}
              </div>
              <div className="mt-0.5 font-semibold">{doc.number}</div>
              <dl className="text-muted-foreground mt-3 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-sm md:justify-end">
                <dt>{t.issued}</dt>
                <dd className="text-foreground font-medium">
                  {date(doc.issueDate)}
                </dd>
                <dt>{isEstimate ? t.validUntil : t.due}</dt>
                <dd className="text-foreground font-medium">
                  {date(doc.dueDate)}
                </dd>
                {doc.paidAt && (
                  <>
                    <dt>{t.paidOn}</dt>
                    <dd className="text-foreground font-medium">
                      {date(doc.paidAt)}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </header>

          {/* Bill to */}
          <section className="px-6 md:px-10">
            <div className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
              {t.billTo}
            </div>
            <div className="mt-1 font-semibold">{doc.client.name}</div>
            <div className="text-muted-foreground text-sm">
              {doc.client.company && <div>{doc.client.company}</div>}
              {doc.client.address && (
                <div className="whitespace-pre-line">{doc.client.address}</div>
              )}
              <div>
                {[doc.client.phone, doc.client.email]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="mt-6 px-6 md:px-10">
            <div className="text-muted-foreground hidden grid-cols-[1fr_4rem_6rem_4rem_7rem] gap-3 border-b-2 border-foreground pb-2 text-xs font-medium tracking-[0.06em] uppercase sm:grid">
              <span>{t.description}</span>
              <span className="text-right">{t.qty}</span>
              <span className="text-right">{t.unitPrice}</span>
              <span className="text-right">{t.tax}</span>
              <span className="text-right">{t.amount}</span>
            </div>
            <ul className="divide-y">
              {doc.items.map((it, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-3 sm:grid-cols-[1fr_4rem_6rem_4rem_7rem]"
                >
                  <span className="whitespace-pre-line">{it.description}</span>
                  <span className="font-semibold tabular-nums sm:order-5 sm:text-right">
                    {money(it.amount)}
                  </span>
                  <span className="text-muted-foreground col-span-2 text-sm tabular-nums sm:col-span-1 sm:text-right sm:text-base">
                    <span className="sm:hidden">
                      {it.quantity} × {money(it.unitPrice)}
                      {it.taxRate ? ` · ${t.tax} ${it.taxRate}%` : ''}
                    </span>
                    <span className="hidden sm:inline">
                      {it.quantity % 1 === 0
                        ? it.quantity
                        : it.quantity.toFixed(2)}
                    </span>
                  </span>
                  <span className="hidden text-right tabular-nums sm:block">
                    {money(it.unitPrice)}
                  </span>
                  <span className="text-muted-foreground hidden text-right tabular-nums sm:block">
                    {it.taxRate ? `${it.taxRate}%` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Totals */}
          <section className="mt-4 flex justify-end px-6 md:px-10">
            <dl className="w-full max-w-xs space-y-1.5 text-sm">
              <Row label={t.subtotal} value={money(doc.subtotal)} />
              {doc.discountAmount > 0 && (
                <Row
                  label={`${t.discount}${doc.discountType === 'percentage' && doc.discountValue ? ` (${doc.discountValue}%)` : ''}`}
                  value={`−${money(doc.discountAmount)}`}
                />
              )}
              {doc.taxTotal > 0 && (
                <Row label={t.tax} value={money(doc.taxTotal)} />
              )}
              <div className="border-foreground flex items-baseline justify-between border-t-2 pt-2">
                <dt className="text-base font-semibold">{t.total}</dt>
                <dd className="text-2xl font-extrabold tabular-nums">
                  {money(doc.total)}
                </dd>
              </div>
              {isEstimate && doc.depositAmount ? (
                <div className="bg-accent text-accent-foreground flex items-center justify-between rounded-lg px-3 py-2 font-medium">
                  <dt>{t.deposit}</dt>
                  <dd className="tabular-nums">{money(doc.depositAmount)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* Pay + notes */}
          <section className="grid gap-4 p-6 md:grid-cols-2 md:p-10">
            {doc.paymentInstructions && (
              <div className="bg-accent/60 border-primary/20 rounded-xl border p-4">
                <h3 className="text-primary text-xs font-semibold tracking-[0.08em] uppercase">
                  {t.howToPay}
                </h3>
                <p className="mt-2 whitespace-pre-line">
                  {doc.paymentInstructions}
                </p>
              </div>
            )}
            {doc.notes && (
              <div className="rounded-xl border p-4">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
                  {t.notes}
                </h3>
                <p className="mt-2 whitespace-pre-line">{doc.notes}</p>
              </div>
            )}
          </section>

          <footer className="text-muted-foreground border-t px-6 py-4 text-center text-sm md:px-10">
            {t.thanks}
          </footer>
        </article>

        <div className="no-print text-muted-foreground mt-6 flex items-center justify-center gap-1.5 text-xs">
          {t.poweredBy} <Logo compact className="[&_svg]:size-4" /> Factura
          Fácil
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

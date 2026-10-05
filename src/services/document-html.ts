import type { PublicDocument } from '@/lib/types'
import { getDictionary } from '@/lib/i18n'
import { formatCurrency, formatDate } from '@/lib/utils'

const esc = (s: string | null | undefined) =>
  (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const nl2br = (s: string | null | undefined) => esc(s).replace(/\n/g, '<br/>')

/**
 * Standalone, print-ready HTML for the PDF renderer (US Letter). Kept free of
 * app CSS on purpose so Browser Rendering needs nothing but this string.
 */
export function renderDocumentHtml(
  doc: PublicDocument,
  opts: { logoDataUrl?: string | null } = {},
) {
  const t = getDictionary(doc.language).public
  const lang = doc.language
  const tz = doc.business.timezone
  const money = (n: number) => formatCurrency(n, doc.currency, lang)
  const date = (iso: string) =>
    formatDate(iso, { language: lang, timezone: tz })
  const isEstimate = doc.type === 'estimate'
  const logo = opts.logoDataUrl ?? doc.business.logoUrl

  const stamp =
    doc.status === 'paid'
      ? `<div class="stamp paid">${t.paid}</div>`
      : doc.status === 'void'
        ? `<div class="stamp void">${t.void}</div>`
        : doc.status === 'overdue' && !isEstimate
          ? `<div class="stamp overdue">${t.overdue}</div>`
          : ''

  const rows = doc.items
    .map(
      (it) => `
      <tr>
        <td class="desc">${nl2br(it.description)}</td>
        <td class="num">${it.quantity % 1 === 0 ? it.quantity : it.quantity.toFixed(2)}</td>
        <td class="num">${money(it.unitPrice)}</td>
        <td class="num">${it.taxRate ? `${it.taxRate}%` : '—'}</td>
        <td class="num">${money(it.amount)}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${esc(isEstimate ? t.estimate : t.invoice)} ${esc(doc.number)}</title>
<style>
  @page { size: Letter; margin: 0.6in 0.6in 0.7in; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11pt/1.45 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2320; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .biz { display: flex; gap: 14px; align-items: flex-start; }
  .biz img { max-height: 64px; max-width: 160px; object-fit: contain; }
  .biz h1 { margin: 0 0 4px; font-size: 16pt; letter-spacing: -0.01em; }
  .muted { color: #6b7069; }
  .small { font-size: 9.5pt; }
  .title { text-align: right; }
  .title .kind { font-size: 22pt; font-weight: 800; letter-spacing: 0.08em; color: #2f7a4f; margin: 0; }
  .title .no { font-size: 12pt; font-weight: 600; margin-top: 2px; }
  .meta { margin-top: 10px; display: grid; grid-template-columns: auto auto; gap: 2px 12px; justify-content: end; }
  .meta dt { color: #6b7069; text-align: right; }
  .meta dd { margin: 0; font-weight: 600; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 26px 0 18px; }
  .label { text-transform: uppercase; letter-spacing: 0.08em; font-size: 8.5pt; color: #6b7069; margin-bottom: 4px; }
  .party strong { font-size: 12pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7069; padding: 8px 8px; border-bottom: 1.5px solid #1f2320; }
  tbody td { padding: 9px 8px; border-bottom: 1px solid #e6e4dd; vertical-align: top; }
  td.num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  thead th:not(:first-child) { text-align: right; }
  .totals { margin-left: auto; width: 290px; margin-top: 10px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 8px; }
  .totals .row.total { border-top: 2px solid #1f2320; margin-top: 4px; padding-top: 9px; font-size: 14pt; font-weight: 800; }
  .totals .row.deposit { background: #eef7f1; border-radius: 6px; margin-top: 8px; font-weight: 600; color: #2f7a4f; }
  .boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 26px; }
  .box { border: 1px solid #e6e4dd; border-radius: 8px; padding: 12px 14px; }
  .box.pay { background: #f6faf7; border-color: #cfe5d6; }
  .box h3 { margin: 0 0 6px; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; color: #2f7a4f; }
  .foot { margin-top: 28px; text-align: center; color: #6b7069; font-size: 9pt; }
  .stamp { position: absolute; right: 0.6in; top: 1.55in; transform: rotate(-12deg); border: 3px solid; border-radius: 8px; padding: 4px 14px; font-weight: 900; font-size: 20pt; letter-spacing: 0.12em; opacity: 0.85; }
  .stamp.paid { color: #2f7a4f; border-color: #2f7a4f; }
  .stamp.void { color: #8a8a8a; border-color: #8a8a8a; }
  .stamp.overdue { color: #b43b2e; border-color: #b43b2e; }
</style>
</head>
<body>
  ${stamp}
  <div class="head">
    <div class="biz">
      ${logo ? `<img src="${esc(logo)}" alt=""/>` : ''}
      <div>
        <h1>${esc(doc.business.name) || '&nbsp;'}</h1>
        <div class="muted small">
          ${[doc.business.phone, doc.business.email].filter(Boolean).map(esc).join(' · ')}
          ${doc.business.address ? `<br/>${nl2br(doc.business.address)}` : ''}
        </div>
      </div>
    </div>
    <div class="title">
      <p class="kind">${isEstimate ? t.estimate : t.invoice}</p>
      <div class="no">${esc(doc.number)}</div>
      <dl class="meta small">
        <dt>${t.issued}</dt><dd>${date(doc.issueDate)}</dd>
        <dt>${isEstimate ? t.validUntil : t.due}</dt><dd>${date(doc.dueDate)}</dd>
        ${doc.paidAt ? `<dt>${t.paidOn}</dt><dd>${date(doc.paidAt)}</dd>` : ''}
      </dl>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="label">${t.billTo}</div>
      <strong>${esc(doc.client.name)}</strong>
      <div class="muted small">
        ${doc.client.company ? `${esc(doc.client.company)}<br/>` : ''}
        ${doc.client.address ? `${nl2br(doc.client.address)}<br/>` : ''}
        ${[doc.client.phone, doc.client.email].filter(Boolean).map(esc).join(' · ')}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${t.description}</th><th class="num">${t.qty}</th><th class="num">${t.unitPrice}</th><th class="num">${t.tax}</th><th class="num">${t.amount}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span class="muted">${t.subtotal}</span><span>${money(doc.subtotal)}</span></div>
    ${
      doc.discountAmount > 0
        ? `<div class="row"><span class="muted">${t.discount}${doc.discountType === 'percentage' && doc.discountValue ? ` (${doc.discountValue}%)` : ''}</span><span>−${money(doc.discountAmount)}</span></div>`
        : ''
    }
    ${doc.taxTotal > 0 ? `<div class="row"><span class="muted">${t.tax}</span><span>${money(doc.taxTotal)}</span></div>` : ''}
    <div class="row total"><span>${t.total}</span><span>${money(doc.total)}</span></div>
    ${isEstimate && doc.depositAmount ? `<div class="row deposit"><span>${t.deposit}</span><span>${money(doc.depositAmount)}</span></div>` : ''}
  </div>

  <div class="boxes">
    ${doc.paymentInstructions ? `<div class="box pay"><h3>${t.howToPay}</h3><div>${nl2br(doc.paymentInstructions)}</div></div>` : '<div></div>'}
    ${doc.notes ? `<div class="box"><h3 style="color:#6b7069">${t.notes}</h3><div>${nl2br(doc.notes)}</div></div>` : ''}
  </div>

  <div class="foot">${t.thanks}</div>
</body>
</html>`
}

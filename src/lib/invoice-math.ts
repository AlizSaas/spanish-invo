import type { DiscountType } from './constants'

export interface LineItemInput {
  quantity: number
  unitPrice: number
  /** percent, e.g. 8.25 */
  taxRate?: number | null
}

export interface InvoiceTotals {
  itemAmounts: Array<number>
  subtotal: number
  discountAmount: number
  taxTotal: number
  total: number
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Parse a user-typed number ("1,5", "$12.00", "") into a finite number or 0. */
export function toNumber(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (!v) return 0
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Single source of truth for document math (client preview + server persistence).
 *
 * - amount      = quantity × unitPrice (pre-tax, pre-discount)
 * - subtotal    = Σ amount
 * - discount    = fixed amount or % of subtotal, capped at subtotal
 * - tax         = Σ (amount × share of subtotal left after discount) × taxRate
 *                 i.e. the discount reduces the taxable base, as US sales tax expects
 * - total       = subtotal − discount + tax
 */
export function computeTotals(
  items: Array<LineItemInput>,
  discountType?: DiscountType | null,
  discountValue?: number | null,
): InvoiceTotals {
  const itemAmounts = items.map((it) =>
    round2(toNumber(it.quantity) * toNumber(it.unitPrice)),
  )
  const subtotal = round2(itemAmounts.reduce((sum, a) => sum + a, 0))

  let discountAmount = 0
  const dv = toNumber(discountValue)
  if (discountType && dv > 0 && subtotal > 0) {
    // Never more than the subtotal, whatever the input: totals can't go negative.
    discountAmount =
      discountType === 'fixed'
        ? Math.min(dv, subtotal)
        : subtotal * (Math.min(dv, 100) / 100)
    discountAmount = round2(discountAmount)
  }

  const taxableShare = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 0
  const taxTotal = round2(
    items.reduce((sum, it, i) => {
      const rate = toNumber(it.taxRate)
      if (rate <= 0) return sum
      return sum + itemAmounts[i] * taxableShare * (rate / 100)
    }, 0),
  )

  const total = round2(Math.max(0, subtotal - discountAmount + taxTotal))
  return { itemAmounts, subtotal, discountAmount, taxTotal, total }
}

/** Drizzle numeric columns are strings; this keeps the DB format consistent. */
export function money(n: number): string {
  return round2(n).toFixed(2)
}

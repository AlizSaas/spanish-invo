import type { Settings } from '@/db/schema'
import type { DocumentType, Language } from '@/lib/constants'
import type { DocumentInput } from '@/lib/validators/documents'
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/constants'
import { addDays } from '@/lib/dates'

/** What the assistant fills in; everything else comes from the owner's settings. */
export interface DocumentDraftRequest {
  type: DocumentType
  clientId: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxRate?: number
  }>
  dueDate?: string
  notes?: string
  language?: Language
}

type DraftSettings = Pick<
  Settings,
  | 'defaultCurrency'
  | 'defaultDueDays'
  | 'defaultTaxRate'
  | 'defaultNotes'
  | 'defaultInvoiceLanguage'
>

/**
 * Applies the same defaults as the document builder. Shared by the assistant's
 * confirm card (preview) and the server tool (insert), so what the owner
 * approves is exactly what gets saved.
 */
export function resolveDocumentDraft(
  req: DocumentDraftRequest,
  opts: {
    settings: DraftSettings
    clientLanguage: Language | null | undefined
    /** yyyy-mm-dd in the owner's time zone */
    today: string
  },
): DocumentInput {
  const s = opts.settings
  const defaultTax =
    Number(s.defaultTaxRate) > 0 ? Number(s.defaultTaxRate) : null
  const currency =
    CURRENCIES.find((c) => c === s.defaultCurrency) ?? DEFAULT_CURRENCY
  return {
    type: req.type,
    clientId: req.clientId,
    language: req.language ?? opts.clientLanguage ?? s.defaultInvoiceLanguage,
    issueDate: opts.today,
    dueDate:
      req.dueDate ??
      addDays(opts.today, req.type === 'estimate' ? 30 : s.defaultDueDays),
    currency,
    items: req.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate ?? defaultTax,
    })),
    notes: req.notes ?? s.defaultNotes ?? null,
  }
}

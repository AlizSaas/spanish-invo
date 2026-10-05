import { create } from 'zustand'
import type { DiscountType, DocumentType, Language } from '@/lib/constants'
import { computeTotals } from '@/lib/invoice-math'

export interface DraftItem {
  /** local-only key for React lists */
  key: string
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
}

export interface DraftDocument {
  type: DocumentType
  clientId: string | null
  language: Language
  issueDate: string // yyyy-mm-dd
  dueDate: string // yyyy-mm-dd (estimates: valid until)
  currency: string
  items: Array<DraftItem>
  discountType: DiscountType | null
  discountValue: string
  depositAmount: string
  notes: string
  paymentInstructionsOverride: string
}

interface BuilderState {
  draft: DraftDocument
  /** id of the invoice being edited, null when creating */
  editingId: string | null
  dirty: boolean

  start: (
    init: Partial<DraftDocument> & { type: DocumentType },
    editingId?: string | null,
  ) => void
  reset: () => void
  set: <TKey extends keyof DraftDocument>(
    key: TKey,
    value: DraftDocument[TKey],
  ) => void
  addItem: (defaults?: Partial<DraftItem>) => void
  updateItem: (key: string, patch: Partial<Omit<DraftItem, 'key'>>) => void
  removeItem: (key: string) => void
  moveItem: (key: string, direction: -1 | 1) => void
}

export const newItem = (defaults: Partial<DraftItem> = {}): DraftItem => ({
  key: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unitPrice: '',
  taxRate: '',
  ...defaults,
})

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export function defaultDraft(type: DocumentType, dueDays = 15): DraftDocument {
  const today = new Date()
  const due = new Date(today)
  due.setDate(due.getDate() + dueDays)
  return {
    type,
    clientId: null,
    language: 'es',
    issueDate: isoDate(today),
    dueDate: isoDate(due),
    currency: 'USD',
    items: [newItem()],
    discountType: null,
    discountValue: '',
    depositAmount: '',
    notes: '',
    paymentInstructionsOverride: '',
  }
}

export const useInvoiceBuilder = create<BuilderState>()((set) => ({
  draft: defaultDraft('invoice'),
  editingId: null,
  dirty: false,

  start: (init, editingId = null) =>
    set({
      draft: { ...defaultDraft(init.type), ...init },
      editingId,
      dirty: false,
    }),
  reset: () =>
    set({ draft: defaultDraft('invoice'), editingId: null, dirty: false }),
  set: (key, value) =>
    set((s) => ({ draft: { ...s.draft, [key]: value }, dirty: true })),

  addItem: (defaults) =>
    set((s) => ({
      draft: { ...s.draft, items: [...s.draft.items, newItem(defaults)] },
      dirty: true,
    })),
  updateItem: (key, patch) =>
    set((s) => ({
      draft: {
        ...s.draft,
        items: s.draft.items.map((it) =>
          it.key === key ? { ...it, ...patch } : it,
        ),
      },
      dirty: true,
    })),
  removeItem: (key) =>
    set((s) => {
      const items = s.draft.items.filter((it) => it.key !== key)
      return {
        draft: { ...s.draft, items: items.length ? items : [newItem()] },
        dirty: true,
      }
    }),
  moveItem: (key, direction) =>
    set((s) => {
      const items = [...s.draft.items]
      const i = items.findIndex((it) => it.key === key)
      const j = i + direction
      if (i < 0 || j < 0 || j >= items.length) return s
      ;[items[i], items[j]] = [items[j], items[i]]
      return { draft: { ...s.draft, items }, dirty: true }
    }),
}))

/**
 * Derived totals for the live preview; same math the server runs on save.
 * Pure function (not a store selector): it returns a new object each call,
 * which would make useSyncExternalStore re-render forever if used as one.
 */
export function computeDraftTotals(draft: DraftDocument) {
  const { items, discountType, discountValue } = draft
  return computeTotals(
    items.map((it) => ({
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      taxRate: it.taxRate === '' ? null : Number(it.taxRate),
    })),
    discountType,
    discountValue === '' ? null : Number(discountValue),
  )
}

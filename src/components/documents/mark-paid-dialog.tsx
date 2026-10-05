import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  CircleDollarSign,
  Landmark,
  Smartphone,
  Wallet,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PaymentMethod } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { markPaidFn } from '@/data/documents/documents'
import { documentKeys } from '@/data/documents/queries'
import { PAYMENT_METHODS } from '@/lib/constants'
import { todayDateOnly } from '@/lib/dates'
import { errorMessage, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const ICONS: Record<PaymentMethod, typeof Banknote> = {
  zelle: Landmark,
  cash: Banknote,
  cashapp: CircleDollarSign,
  venmo: Smartphone,
  check: WalletCards,
  other: Wallet,
}

export function MarkPaidDialog({
  docId,
  open,
  onOpenChange,
}: {
  docId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<PaymentMethod>('zelle')
  const [paidAt, setPaidAt] = useState(todayDateOnly())

  const mutation = useMutation({
    mutationFn: () =>
      markPaidFn({ data: { id: docId, paymentMethod: method, paidAt } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success(t.docs.detail.markedPaid)
      onOpenChange(false)
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.docs.detail.markPaidTitle}</DialogTitle>
          <DialogDescription>{t.docs.detail.markPaidBody}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const Icon = ICONS[m]
            const active = method === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={active}
                className={cn(
                  'flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'hover:bg-muted',
                )}
              >
                <Icon className="size-5" />
                {t.docs.paymentMethods[m]}
              </button>
            )
          })}
        </div>

        <Field>
          <FieldLabel htmlFor="paidAt">{t.docs.detail.paidOn}</FieldLabel>
          <Input
            id="paidAt"
            type="date"
            value={paidAt}
            max={todayDateOnly()}
            onChange={(e) => setPaidAt(e.target.value)}
          />
        </Field>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner />}
            {t.docs.detail.markPaid}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { billingQueryOptions } from '@/data/billing/billing'
import { authClient } from '@/lib/auth-client'
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from '@/lib/constants'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

/**
 * Free-plan limit errors: server functions throw Error('PLAN_LIMIT') and the
 * AI route answers 402 with {"error":"PLAN_LIMIT"} as the body.
 */
export const isPlanLimitError = (err: unknown) =>
  err instanceof Error && err.message.includes('PLAN_LIMIT')

/**
 * Shown when a free account hits a monthly limit (documents or AI questions):
 * both Pro prices side by side, each going straight to Stripe Checkout.
 * Mounted once in the signed-in layout and opened through the UI store.
 */
export function UpgradeDialog() {
  const t = useT()
  const reason = useUiStore((s) => s.upgradeReason)
  const closeUpgrade = useUiStore((s) => s.closeUpgrade)
  const { data } = useQuery({
    ...billingQueryOptions(),
    enabled: reason !== null,
  })
  const [busy, setBusy] = useState<'monthly' | 'yearly' | null>(null)
  const stripeConfigured = data?.stripeConfigured ?? true

  // The browser's back button on Stripe Checkout can restore this page from
  // the back/forward cache with the spinner still running.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null)
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  const checkout = async (annual: boolean) => {
    setBusy(annual ? 'yearly' : 'monthly')
    // Cancelling on Stripe brings the user back to this page. Better Auth only
    // accepts plain relative paths here, so anything unusual falls back.
    const here = window.location.pathname
    const { error } = await authClient.subscription.upgrade({
      plan: 'pro',
      annual,
      successUrl: '/settings?upgraded=1',
      cancelUrl: /^\/[\w\-./@]*$/.test(here) ? here : '/settings',
    })
    if (error) {
      toast.error(error.message ?? t.auth.errors.generic)
      setBusy(null)
    }
    // On success the browser is redirected to Stripe.
  }

  const plans = [
    {
      key: 'monthly',
      annual: false,
      name: t.billing.monthly,
      price: PRO_MONTHLY_PRICE,
      period: t.billing.perMonth,
      note: t.billing.billedMonthly,
      cta: t.billing.chooseMonthly,
    },
    {
      key: 'yearly',
      annual: true,
      name: t.billing.yearly,
      price: PRO_YEARLY_PRICE,
      period: t.billing.perYear,
      note: t.billing.billedYearly,
      cta: t.billing.chooseYearly,
    },
  ] as const

  return (
    <Dialog
      open={reason !== null}
      onOpenChange={(open) => {
        if (!open) closeUpgrade()
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="bg-primary/10 text-primary mx-auto flex size-11 items-center justify-center rounded-xl sm:mx-0">
            <Crown className="size-5" />
          </div>
          <DialogTitle>{t.billing.limitTitle}</DialogTitle>
          <DialogDescription>
            {reason === 'ai'
              ? t.billing.aiLimitBody
              : t.billing.documentsLimitBody}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={cn(
                'bg-card relative flex flex-col rounded-2xl border p-5',
                plan.annual && 'border-primary ring-primary/20 ring-2',
              )}
            >
              {plan.annual && (
                <span className="bg-primary text-primary-foreground absolute -top-3 left-5 rounded-full px-3 py-1 text-xs font-semibold">
                  {t.pricing.popular}
                </span>
              )}
              <div className="font-semibold">
                {t.billing.pro} · {plan.name}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                  ${plan.price}
                </span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-muted-foreground mt-1 flex-1 text-sm">
                {plan.note}
              </p>
              <Button
                className="mt-4 w-full"
                variant={plan.annual ? 'default' : 'outline'}
                onClick={() => checkout(plan.annual)}
                disabled={busy !== null || !stripeConfigured}
                title={stripeConfigured ? undefined : t.billing.notConfigured}
              >
                {busy === plan.key && <Spinner />}
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {t.pricing.proFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-muted-foreground text-center text-xs sm:text-left">
            {stripeConfigured
              ? `${t.billing.trialNote} ${t.pricing.taxNote}`
              : t.billing.notConfigured}
          </p>
          <Button variant="ghost" onClick={closeUpgrade}>
            {t.billing.notNow}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Check, Crown, MessageCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { billingQueryOptions } from '@/data/billing/billing'
import { authClient } from '@/lib/auth-client'
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from '@/lib/constants'
import { fill, useT } from '@/lib/i18n'
import { cn, formatDate } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

/**
 * Settings → "Your plan": current plan, this month's usage and the upgrade /
 * manage buttons. Checkout and the billing portal are Stripe-hosted pages the
 * Better Auth Stripe plugin redirects to; webhooks update the plan afterwards.
 */
export function PlanCard({ justUpgraded = false }: { justUpgraded?: boolean }) {
  const t = useT()
  const locale = useUiStore((s) => s.locale)
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data, isPending } = useQuery(billingQueryOptions())
  const [yearly, setYearly] = useState(false)
  const [busy, setBusy] = useState<'upgrade' | 'manage' | null>(null)

  // Back from Stripe Checkout. Runs once per visit (the dictionary object
  // changes when the language rehydrates, so it is read through a ref): poll a
  // few seconds for the webhook or the self-heal sync, toast once, then drop
  // the ?upgraded flag so a refresh does not repeat this.
  const tRef = useRef(t)
  tRef.current = t
  const handledUpgrade = useRef(false)
  useEffect(() => {
    if (!justUpgraded || handledUpgrade.current) return
    handledUpgrade.current = true
    const run = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const fresh = await queryClient.fetchQuery({
          ...billingQueryOptions(),
          staleTime: 0,
        })
        if (fresh.plan === 'pro') {
          toast.success(tRef.current.billing.upgraded)
          break
        }
        if (attempt === 0) toast.message(tRef.current.billing.processing)
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
      await router.navigate({ to: '/settings', search: {}, replace: true })
    }
    void run()
  }, [justUpgraded, queryClient, router])

  const upgrade = async () => {
    setBusy('upgrade')
    const { error } = await authClient.subscription.upgrade({
      plan: 'pro',
      annual: yearly,
      successUrl: '/settings?upgraded=1',
      cancelUrl: '/settings',
    })
    if (error) {
      toast.error(error.message ?? t.auth.errors.generic)
      setBusy(null)
    }
    // On success the browser is redirected to Stripe.
  }

  const manage = async () => {
    setBusy('manage')
    const { error } = await authClient.subscription.billingPortal({
      returnUrl: '/settings',
    })
    if (error) {
      toast.error(error.message ?? t.auth.errors.generic)
      setBusy(null)
    }
  }

  if (isPending || !data) {
    return (
      <div className="bg-card flex items-center justify-center rounded-2xl border p-6">
        <Spinner className="size-5" />
      </div>
    )
  }

  const isPro = data.plan === 'pro'
  const date = (iso: string | null) =>
    iso ? formatDate(iso, { language: locale }) : ''
  const statusLine = !isPro
    ? fill(t.billing.usage, {
        invoices: String(data.usage.invoices),
        estimates: String(data.usage.estimates),
        limit: String(data.limits.documentsPerMonth),
      })
    : data.status === 'past_due'
      ? t.billing.pastDue
      : data.cancelAtPeriodEnd
        ? fill(t.billing.cancelsOn, { date: date(data.periodEnd) })
        : data.status === 'trialing'
          ? fill(t.billing.trialing, { date: date(data.trialEnd) })
          : fill(t.billing.renews, { date: date(data.periodEnd) })

  return (
    <div className="bg-card rounded-2xl border p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t.billing.title}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {isPro ? (
              <Crown className="text-primary size-5" />
            ) : (
              <Sparkles className="text-muted-foreground size-5" />
            )}
            <span className="text-2xl font-bold tracking-tight">
              {isPro ? t.billing.pro : t.billing.free}
            </span>
          </div>
          <p
            className={cn(
              'mt-1 text-sm',
              data.status === 'past_due'
                ? 'text-destructive'
                : 'text-muted-foreground',
            )}
          >
            {statusLine}
          </p>
          {isPro && (
            <ul className="mt-3 space-y-1.5 text-sm">
              {t.pricing.proFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isPro ? (
          <Button
            variant="outline"
            onClick={manage}
            disabled={busy !== null || !data.stripeConfigured}
          >
            {busy === 'manage' && <Spinner />}
            {t.billing.manage}
          </Button>
        ) : (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div
              role="group"
              aria-label={`${t.billing.monthly} / ${t.billing.yearly}`}
              className="bg-muted inline-flex self-start rounded-md p-0.5 text-xs sm:self-end"
            >
              {[
                {
                  value: false,
                  label: `${t.billing.monthly} · $${PRO_MONTHLY_PRICE}${t.billing.perMonth}`,
                },
                {
                  value: true,
                  label: `${t.billing.yearly} · $${PRO_YEARLY_PRICE}${t.billing.perYear}`,
                },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setYearly(opt.value)}
                  className={cn(
                    'rounded px-2.5 py-1 font-medium transition-colors',
                    yearly === opt.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              onClick={upgrade}
              disabled={busy !== null || !data.stripeConfigured}
              title={
                data.stripeConfigured ? undefined : t.billing.notConfigured
              }
            >
              {busy === 'upgrade' && <Spinner />}
              {t.billing.upgrade}
            </Button>
            <span className="text-muted-foreground text-xs">
              {t.billing.trialNote}
            </span>
          </div>
        )}
      </div>

      {data.communityUrl && (
        <div className="bg-muted/50 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
          <div className="flex min-w-0 items-start gap-3">
            <MessageCircle className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold">{t.billing.communityTitle}</div>
              <p className="text-muted-foreground text-sm">
                {t.billing.communityBody}
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <a
              href={data.communityUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.billing.communityJoin}
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}

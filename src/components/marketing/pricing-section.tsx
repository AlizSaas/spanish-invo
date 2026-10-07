import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from '@/lib/constants'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Landing-page pricing: Gratis vs Pro with a monthly/yearly switch. */
export function PricingSection({ signedIn }: { signedIn: boolean }) {
  const t = useT()
  const [yearly, setYearly] = useState(true)
  const price = yearly ? PRO_YEARLY_PRICE : PRO_MONTHLY_PRICE
  const period = yearly ? t.pricing.perYear : t.pricing.perMonth

  return (
    <section id="precios" className="mx-auto w-full max-w-6xl px-5 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {t.pricing.title}
        </h2>
        <p className="text-muted-foreground mt-3 text-lg">
          {t.pricing.subtitle}
        </p>
        <div
          role="group"
          aria-label={`${t.pricing.monthly} / ${t.pricing.yearly}`}
          className="bg-muted mx-auto mt-6 inline-flex rounded-full p-1 text-sm"
        >
          {[
            { value: false, label: t.pricing.monthly },
            { value: true, label: t.pricing.yearly },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setYearly(opt.value)}
              className={cn(
                'rounded-full border border-transparent px-4 py-1.5 font-medium transition-colors',
                yearly === opt.value
                  ? 'bg-background text-foreground dark:border-input dark:bg-input/30 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <PlanCardShell
          name={t.pricing.freeName}
          price="$0"
          period=""
          features={t.pricing.freeFeatures}
          cta={
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link to={signedIn ? '/settings' : '/signup'}>
                {signedIn ? t.pricing.ctaSignedIn : t.pricing.ctaFree}
              </Link>
            </Button>
          }
        />
        <PlanCardShell
          highlighted
          badge={t.pricing.popular}
          name={t.pricing.proName}
          price={`$${price}`}
          period={period}
          note={yearly ? t.pricing.yearlyNote : t.billing.trialNote}
          features={t.pricing.proFeatures}
          cta={
            <Button asChild size="lg" className="w-full">
              <Link to={signedIn ? '/settings' : '/signup'}>
                {signedIn ? t.pricing.ctaSignedIn : t.pricing.ctaPro}
              </Link>
            </Button>
          }
        />
      </div>
      <p className="text-muted-foreground mt-6 text-center text-xs">
        {t.pricing.taxNote}
      </p>
    </section>
  )
}

function PlanCardShell({
  name,
  price,
  period,
  note,
  features,
  cta,
  highlighted = false,
  badge,
}: {
  name: string
  price: string
  period: string
  note?: string
  features: ReadonlyArray<string>
  cta: React.ReactNode
  highlighted?: boolean
  badge?: string
}) {
  return (
    <div
      className={cn(
        'bg-card relative flex flex-col rounded-2xl border p-6 shadow-sm',
        highlighted && 'border-primary ring-primary/20 ring-2',
      )}
    >
      {badge && (
        <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold">
          {badge}
        </span>
      )}
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight tabular-nums">
          {price}
        </span>
        {period && <span className="text-muted-foreground">{period}</span>}
      </div>
      <p className="text-muted-foreground mt-1 min-h-5 text-sm">{note}</p>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="text-primary mt-0.5 size-4 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  )
}

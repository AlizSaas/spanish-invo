import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { LanguageToggle } from '@/components/language-toggle'
import { AssistantDemo } from '@/components/marketing/assistant-demo'
import { DemoVideo } from '@/components/marketing/demo-video'
import { FaqSection } from '@/components/marketing/faq-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { TradesMarquee } from '@/components/marketing/trades-marquee'
import { SiteFooter } from '@/components/site-footer'
import { Button } from '@/components/ui/button'
import { checkSessionFn } from '@/data/session'
import { pageUrl } from '@/lib/constants'
import { useT } from '@/lib/i18n'
import { formatDate } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ property: 'og:url', content: pageUrl('/') }],
    links: [{ rel: 'canonical', href: pageUrl('/') }],
  }),
  loader: async () => {
    const session = await checkSessionFn()
    return { signedIn: Boolean(session) }
  },
  component: Landing,
})

function Landing() {
  const { signedIn } = Route.useLoaderData()
  const t = useT()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageToggle />
          {signedIn ? (
            <Button asChild size="sm">
              <Link to="/dashboard">{t.nav.dashboard}</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">{t.auth.login.submit}</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pt-10 pb-20 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pt-16 lg:gap-16">
          <div>
            <p className="text-primary mb-4 text-sm font-medium">
              {t.landing.forWho}
            </p>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t.landing.heroTitle}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-lg text-lg text-pretty">
              {t.landing.heroBody}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to={signedIn ? '/dashboard' : '/signup'}>
                  {t.landing.ctaPrimary}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {!signedIn && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 text-base"
                >
                  <Link to="/login">{t.landing.ctaSecondary}</Link>
                </Button>
              )}
            </div>
          </div>

          <AssistantDemo />
        </section>

        <AsksSection />

        <DemoVideo />

        <StepsSection />

        <TradesMarquee />

        <PricingSection signedIn={signedIn} />

        <FaqSection />
      </main>

      <SiteFooter />
    </div>
  )
}

/** Things people actually type to the assistant, shown as sent messages. */
function AsksSection() {
  const t = useT()
  return (
    <section className="bg-card border-y">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-14 md:grid-cols-[0.8fr_1.2fr] md:items-center md:py-20">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-balance">
            {t.landing.asksTitle}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md text-pretty">
            {t.landing.asksBody}
          </p>
        </div>
        <ul className="flex flex-wrap gap-2.5 md:justify-end">
          {t.landing.asks.map((ask) => (
            <li
              key={ask}
              className="bg-secondary text-secondary-foreground rounded-lg rounded-br-sm px-4 py-2.5 text-sm"
            >
              {ask}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function StepsSection() {
  const t = useT()
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:items-center md:py-24">
      <div className="md:order-2">
        <h2 className="text-3xl font-bold tracking-tight text-balance">
          {t.landing.stepsTitle}
        </h2>
        <ol className="mt-8 space-y-7">
          {t.landing.steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-1 max-w-md text-pretty">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-8 border-t pt-5 text-sm">
          {t.landing.stepsManual}
        </p>
      </div>
      <PhoneMock />
    </section>
  )
}

/**
 * Illustrative WhatsApp bubble with an invoice link, drawn with CSS only.
 * The copy is the real share-message template, so it follows the selected
 * language and always matches what a customer actually receives.
 */
function PhoneMock() {
  const t = useT()
  const locale = useUiStore((s) => s.locale)
  const sample = {
    number: 'INV-0042',
    business: 'Jardinería López',
    total: '$350.00',
    due: formatDate(new Date(2026, 9, 18), { language: locale }),
  }
  // Template shape is "<intro> {link}\n<footer>"; the link gets its own card.
  const [intro = '', footer = ''] = t.message.invoice.split('{link}')

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* The dark accent is an opaque green, so it would blur into a muddy blob. */}
      <div className="from-primary/15 to-accent dark:to-primary/5 absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br blur-2xl" />
      <div className="bg-card rounded-[2rem] border p-3 shadow-xl">
        <div className="bg-muted/60 rounded-[1.5rem] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-primary/20 size-9 rounded-full" />
            <div>
              <div className="bg-foreground/15 h-3 w-28 rounded" />
              <div className="bg-foreground/10 mt-1.5 h-2 w-16 rounded" />
            </div>
          </div>
          {/* WhatsApp's own bubble colors, light and dark. */}
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#d9fdd3] p-3 text-sm text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
            <p>{fillMockText(intro.trim(), sample)}</p>
            <div className="mt-2 rounded-lg border border-black/10 bg-white/70 p-2 dark:border-white/10 dark:bg-black/20">
              <div className="text-primary text-xs font-semibold">
                facturafacilapp.com/i/8k3…
              </div>
              <div className="mt-1 h-2 w-3/4 rounded bg-black/10 dark:bg-white/15" />
              <div className="mt-1 h-2 w-1/2 rounded bg-black/10 dark:bg-white/15" />
            </div>
            <p className="mt-2">{fillMockText(footer.trim(), sample)}</p>
            <div className="mt-1 text-right text-[10px] text-black/50 dark:text-white/60">
              10:42 ✓✓
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Fill `{placeholders}` like `fill()`, but bold the number and total as in the real preview. */
function fillMockText(template: string, vars: Record<string, string>) {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1]
    if (!key) return part
    const value = vars[key] ?? ''
    return key === 'number' || key === 'total' ? <b key={i}>{value}</b> : value
  })
}

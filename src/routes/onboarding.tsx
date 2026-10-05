import { createFileRoute, redirect } from '@tanstack/react-router'
import { Logo } from '@/components/brand/logo'
import { LanguageToggle } from '@/components/language-toggle'
import { OnboardingWizard } from '@/components/onboarding/wizard'
import { getSessionFn } from '@/data/session'
import { settingsQueryOptions } from '@/data/settings/queries'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async ({ context }) => {
    await getSessionFn()
    const settings = await context.queryClient.query(settingsQueryOptions())
    if (settings.onboardingCompletedAt) throw redirect({ to: '/dashboard' })
    return { settings }
  },
  head: () => ({ meta: [{ title: 'Configura tu negocio — Factura Fácil' }] }),
  component: OnboardingPage,
})

function OnboardingPage() {
  const { settings } = Route.useRouteContext()
  const t = useT()
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-4">
        <Logo />
        <LanguageToggle />
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t.onboarding.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.onboarding.subtitle}</p>
        </div>
        <div className="bg-card rounded-2xl border p-5 shadow-sm md:p-8">
          <OnboardingWizard settings={settings} />
        </div>
      </main>
    </div>
  )
}

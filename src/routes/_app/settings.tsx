import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { PlanCard } from '@/components/billing/plan-card'
import { PageHeader } from '@/components/page-header'
import { SettingsForm } from '@/components/settings/settings-form'
import { billingQueryOptions } from '@/data/billing/billing'
import { settingsQueryOptions } from '@/data/settings/queries'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/_app/settings')({
  // ?upgraded=1 is where Stripe Checkout sends people back after paying.
  validateSearch: z.object({ upgraded: z.coerce.boolean().optional() }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({
        ...settingsQueryOptions(),
        staleTime: 'static',
      }),
      context.queryClient.query(billingQueryOptions()),
    ]),
  component: SettingsPage,
})

function SettingsPage() {
  const t = useT()
  const { upgraded } = Route.useSearch()
  const { data: settings } = useSuspenseQuery(settingsQueryOptions())
  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <PlanCard justUpgraded={Boolean(upgraded)} />
      <SettingsForm key={settings.updatedAt.toString()} settings={settings} />
    </div>
  )
}

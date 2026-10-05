import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page-header'
import { SettingsForm } from '@/components/settings/settings-form'
import { settingsQueryOptions } from '@/data/settings/queries'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/_app/settings')({
  loader: ({ context }) =>
    context.queryClient.query({
      ...settingsQueryOptions(),
      staleTime: 'static',
    }),
  component: SettingsPage,
})

function SettingsPage() {
  const t = useT()
  const { data: settings } = useSuspenseQuery(settingsQueryOptions())
  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <SettingsForm key={settings.updatedAt.toString()} settings={settings} />
    </div>
  )
}

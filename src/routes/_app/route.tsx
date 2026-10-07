import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { AssistantButton } from '@/components/assistant/assistant-button'
import { AssistantPanel } from '@/components/assistant/assistant-panel'
import { UpgradeDialog } from '@/components/billing/upgrade-dialog'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { getSessionFn } from '@/data/session'
import { settingsQueryOptions } from '@/data/settings/queries'
import { useT } from '@/lib/i18n'
import { useUiStore } from '@/stores/ui-store'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const session = await getSessionFn()
    // query() honors staleTime (30s default), so an invalidated settings row is re-read.
    const settings = await context.queryClient.query(settingsQueryOptions())
    if (!settings.onboardingCompletedAt) throw redirect({ to: '/onboarding' })
    return { user: session.user, settings }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user, settings } = Route.useRouteContext()
  const t = useT()
  const location = useLocation()
  const setLocale = useUiStore((s) => s.setLocale)

  // Live view of the settings row. The route context is a snapshot taken in
  // beforeLoad, so the sidebar's language switch (which updates the query
  // cache optimistically) would otherwise not re-render until navigation.
  const { data: live } = useQuery({
    ...settingsQueryOptions(),
    initialData: settings,
    staleTime: 30_000,
  })
  const accountLocale = live.locale

  // The account's saved language is authoritative inside the signed-in shell.
  useEffect(() => {
    setLocale(accountLocale)
  }, [accountLocale, setLocale])

  const isBuilder =
    location.pathname.endsWith('/new') || location.pathname.endsWith('/edit')

  return (
    <SidebarProvider>
      <AppSidebar user={user} settings={live} />
      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:h-16 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4 md:hidden"
          />
          <Link to="/" className="md:hidden">
            <Logo compact />
          </Link>
          <div className="flex-1" />
          <AssistantButton />
          {!isBuilder && (
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/invoices/new">
                <Plus className="size-4" />
                <span className="hidden sm:inline">{t.nav.newInvoice}</span>
                <span className="sm:hidden">{t.docs.invoice}</span>
              </Link>
            </Button>
          )}
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </SidebarInset>
      <AssistantPanel />
      <UpgradeDialog />
    </SidebarProvider>
  )
}

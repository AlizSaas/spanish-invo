import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import {
  ChevronsUpDown,
  ClipboardList,
  FileText,
  Home,
  Languages,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
} from 'lucide-react'
import type { Settings as SettingsRow } from '@/db/schema'
import { Logo, LogoMark } from '@/components/brand/logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SETTINGS_QUERY_KEY } from '@/data/settings/queries'
import { updateSettingsFn } from '@/data/settings/settings'
import { signOut } from '@/lib/auth-client'
import { useT } from '@/lib/i18n'
import { useUiStore } from '@/stores/ui-store'

interface Props {
  user: { id: string; name: string; email: string }
  settings: SettingsRow
}

export function AppSidebar({ user, settings }: Props) {
  const t = useT()
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  const items = [
    { to: '/dashboard', label: t.nav.dashboard, icon: Home },
    { to: '/invoices', label: t.nav.invoices, icon: FileText },
    { to: '/estimates', label: t.nav.estimates, icon: ClipboardList },
    { to: '/clients', label: t.nav.clients, icon: Users },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ] as const

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-3 md:h-16">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
        >
          <LogoMark className="size-7 shrink-0" />
          <span className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">
            Factura<span className="text-primary">Fácil</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  pathname === item.to || pathname.startsWith(`${item.to}/`)
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      size="lg"
                      className="text-[0.95rem] group-data-[collapsible=icon]:justify-center"
                    >
                      <Link
                        to={item.to}
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <item.icon className="size-5 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} settings={settings} />
      </SidebarFooter>
    </Sidebar>
  )
}

function NavUser({ user, settings }: Props) {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const locale = useUiStore((s) => s.locale)
  const setLocale = useUiStore((s) => s.setLocale)

  const localeMutation = useMutation({
    mutationFn: (next: 'es' | 'en') =>
      updateSettingsFn({ data: { locale: next } }),
    // Optimistic: flip the UI store right away and update the settings cache
    // (which the layout also watches); both revert if the save fails.
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY })
      const previous = queryClient.getQueryData<SettingsRow>(SETTINGS_QUERY_KEY)
      setLocale(next)
      if (previous) {
        queryClient.setQueryData<SettingsRow>(SETTINGS_QUERY_KEY, {
          ...previous,
          locale: next,
        })
      }
      return { previous }
    },
    onError: (_err, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, context.previous)
        setLocale(context.previous.locale)
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
  })

  const initials = (settings.businessName || user.name)
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const logout = async () => {
    await signOut()
    queryClient.clear()
    await router.navigate({ to: '/login' })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="bg-primary/15 text-primary rounded-lg text-xs font-semibold">
                  {initials || <Logo compact />}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">
                  {settings.businessName || user.name}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings />
                {t.nav.settings}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                localeMutation.mutate(locale === 'es' ? 'en' : 'es')
              }}
            >
              <Languages />
              {t.common.language}:{' '}
              {locale === 'es' ? t.common.english : t.common.spanish}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
              {t.common.theme}:{' '}
              {theme === 'dark' ? t.common.light : t.common.dark}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} variant="destructive">
              <LogOut />
              {t.nav.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

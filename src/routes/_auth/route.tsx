import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Logo, LogoMark } from '@/components/brand/logo'
import { LanguageToggle } from '@/components/language-toggle'
import { SiteFooter } from '@/components/site-footer'
import { checkSessionFn } from '@/data/session'
import { useT } from '@/lib/i18n'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const session = await checkSessionFn()
    if (session) throw redirect({ to: '/dashboard' })
  },
  component: AuthLayout,
})

function AuthLayout() {
  const t = useT()
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <aside className="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div className="absolute -top-32 -right-32 size-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-black/10 blur-3xl" />
        <Link
          to="/"
          className="relative inline-flex items-center gap-2 text-lg font-semibold"
        >
          <LogoMark className="[&_rect]:fill-white [&_path]:stroke-primary" />
          Factura Fácil
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight font-bold tracking-tight text-balance">
            {t.landing.heroTitle}
          </h2>
          <p className="mt-4 text-lg/relaxed text-white/80">
            {t.common.tagline}
          </p>
        </div>
        <p className="relative text-sm text-white/60">{t.landing.forWho}</p>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <LanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
        <SiteFooter className="max-w-none py-5" />
      </main>
    </div>
  )
}

import { Link } from '@tanstack/react-router'
import { SUPPORT_EMAIL } from '@/lib/constants'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Copyright line plus Privacy / Terms / Contact links. Used outside the signed-in shell. */
export function SiteFooter({ className }: { className?: string }) {
  const t = useT()
  return (
    <footer
      className={cn(
        'text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-8 text-sm',
        className,
      )}
    >
      <span>© {new Date().getFullYear()} Factura Fácil</span>
      <nav className="flex flex-wrap gap-x-5 gap-y-2">
        <Link to="/privacy" className="hover:text-foreground">
          {t.legal.privacy}
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          {t.legal.terms}
        </Link>
        <Link to="/sms-consent" className="hover:text-foreground">
          {t.legal.sms}
        </Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground">
          {t.legal.contact}
        </a>
      </nav>
    </footer>
  )
}

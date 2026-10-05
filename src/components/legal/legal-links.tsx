import { Link } from '@tanstack/react-router'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** "By creating an account you agree to the Terms and the Privacy Policy." with links. */
export function LegalAgreement({ className }: { className?: string }) {
  const t = useT()
  const parts = t.legal.agree.split(/(\{terms\}|\{privacy\})/)
  return (
    <p className={cn('text-muted-foreground text-center text-xs', className)}>
      {parts.map((part, i) => {
        if (part === '{terms}') {
          return (
            <Link
              key={i}
              to="/terms"
              className="hover:text-foreground underline"
            >
              {t.legal.terms}
            </Link>
          )
        }
        if (part === '{privacy}') {
          return (
            <Link
              key={i}
              to="/privacy"
              className="hover:text-foreground underline"
            >
              {t.legal.privacy}
            </Link>
          )
        }
        return part
      })}
    </p>
  )
}

import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

/**
 * ES / EN switch for the app shell. Outside the signed-in area this is the
 * only source of truth; inside, Settings keeps it in sync with the account.
 */
export function LanguageToggle({
  className,
  onChange,
}: {
  className?: string
  onChange?: (locale: 'es' | 'en') => void
}) {
  const locale = useUiStore((s) => s.locale)
  const setLocale = useUiStore((s) => s.setLocale)
  const next = locale === 'es' ? 'en' : 'es'
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('gap-1.5 font-medium', className)}
      onClick={() => {
        setLocale(next)
        onChange?.(next)
      }}
      aria-label={locale === 'es' ? 'Switch to English' : 'Cambiar a español'}
    >
      <Languages className="size-4" />
      <span className="uppercase tabular-nums">{next}</span>
    </Button>
  )
}

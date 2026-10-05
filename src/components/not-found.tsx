import { Link } from '@tanstack/react-router'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

export function NotFound() {
  const t = useT()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-2xl">
        <FileQuestion className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.common.notFoundTitle}
      </h1>
      <p className="text-muted-foreground max-w-sm">{t.common.notFoundBody}</p>
      <Button asChild>
        <Link to="/">{t.common.goHome}</Link>
      </Button>
    </div>
  )
}

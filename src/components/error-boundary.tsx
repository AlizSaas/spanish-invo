import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

export function ErrorBoundary({ error, reset }: ErrorComponentProps) {
  const t = useT()
  const router = useRouter()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-2xl">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.common.errorTitle}
      </h1>
      <p className="text-muted-foreground max-w-sm">{t.common.errorBody}</p>
      {import.meta.env.DEV && (
        <pre className="bg-muted max-w-full overflow-auto rounded-lg p-3 text-left text-xs">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          {t.common.retry}
        </Button>
        <Button asChild>
          <Link to="/">{t.common.goHome}</Link>
        </Button>
      </div>
    </div>
  )
}

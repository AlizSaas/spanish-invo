import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

export function AssistantButton({ className }: { className?: string }) {
  const t = useT()
  const openAssistant = useUiStore((s) => s.openAssistant)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('gap-1.5', className)}
      onClick={() => openAssistant()}
    >
      <Sparkles className="text-primary size-4" />
      <span className="hidden sm:inline">{t.assistant.open}</span>
      <kbd className="text-muted-foreground hidden rounded border px-1 text-[10px] lg:inline">
        ⌘K
      </kbd>
    </Button>
  )
}

import type { DocumentType, InvoiceStatus } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-transparent',
  sent: 'bg-sky-100 text-sky-800 border-transparent dark:bg-sky-950 dark:text-sky-200',
  viewed:
    'bg-violet-100 text-violet-800 border-transparent dark:bg-violet-950 dark:text-violet-200',
  paid: 'bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-200',
  void: 'bg-muted text-muted-foreground line-through border-transparent',
  overdue:
    'bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-200',
}

export function StatusBadge({
  status,
  type = 'invoice',
  className,
}: {
  status: InvoiceStatus
  type?: DocumentType
  className?: string
}) {
  const t = useT()
  const label =
    type === 'estimate'
      ? t.docs.estimateStatuses[status]
      : t.docs.statuses[status]
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', STYLES[status], className)}
    >
      {label}
    </Badge>
  )
}

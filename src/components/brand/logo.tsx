import { cn } from '@/lib/utils'

/** Wordmark: a receipt with a check, in brand green. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('size-8', className)}
      fill="none"
    >
      <rect
        x="4"
        y="2"
        width="24"
        height="28"
        rx="5"
        className="fill-primary"
      />
      <path
        d="M10 10h12M10 15h8"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M10.5 22.5l3 3 7-7"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-semibold tracking-tight',
        className,
      )}
    >
      <LogoMark />
      {!compact && (
        <span className="text-lg">
          Factura<span className="text-primary">Fácil</span>
        </span>
      )}
    </span>
  )
}

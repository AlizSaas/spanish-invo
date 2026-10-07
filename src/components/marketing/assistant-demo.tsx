import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from 'motion/react'
import {
  ArrowUp,
  CheckCircle2,
  FileText,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useT } from '@/lib/i18n'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

type Phase =
  | 'idle'
  | 'typing'
  | 'sent'
  | 'thinking'
  | 'confirm'
  | 'approving'
  | 'saving'
  | 'done'

const ORDER: Array<Phase> = [
  'idle',
  'typing',
  'sent',
  'thinking',
  'confirm',
  'approving',
  'saving',
  'done',
]

/** How long each step stays on screen before the next one. Typing is per character. */
const NEXT: Partial<Record<Phase, [Phase, number]>> = {
  idle: ['typing', 700],
  sent: ['thinking', 450],
  thinking: ['confirm', 1300],
  confirm: ['approving', 2600],
  approving: ['saving', 450],
  saving: ['done', 1000],
}
const TYPE_MS = 26

const PRICES = [120, 80]
const DUE = new Date(Date.UTC(2026, 9, 21))
const enter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { type: 'spring', stiffness: 260, damping: 26 },
} as const

/**
 * The hero's one moving piece: a replay of the real assistant turning a typed
 * message into an invoice. It mirrors the in-app panel and cards (same
 * wording, same confirm step) but is static markup, since the real cards need
 * a signed-in account. Plays once when scrolled into view; reduced motion
 * shows the finished state.
 */
export function AssistantDemo() {
  const t = useT()
  const locale = useUiStore((s) => s.locale)
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const [typed, setTyped] = useState(0)
  const prompt = t.landing.chat.prompt

  useEffect(() => {
    if (reduce) {
      setPhase('done')
      return
    }
    if (!inView) return
    if (phase === 'typing') {
      const id = setTimeout(
        () => (typed >= prompt.length ? setPhase('sent') : setTyped(typed + 1)),
        typed >= prompt.length ? 350 : TYPE_MS,
      )
      return () => clearTimeout(id)
    }
    const next = NEXT[phase]
    if (!next) return
    const id = setTimeout(() => setPhase(next[0]), next[1])
    return () => clearTimeout(id)
  }, [reduce, inView, phase, typed, prompt.length])

  const reached = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p)
  const money = (n: number) => formatCurrency(n, 'USD', locale)
  const due = formatDate(DUE, { language: locale, timezone: 'UTC' })
  const total = money(PRICES.reduce((a, b) => a + b, 0))

  return (
    <figure ref={ref} className="relative mx-auto w-full max-w-md">
      <figcaption className="sr-only">{t.landing.chat.label}</figcaption>
      {/* Illustration only: none of the buttons inside are real controls. */}
      <div
        aria-hidden
        className="bg-card shadow-primary/15 overflow-hidden rounded-2xl border shadow-[0_32px_64px_-32px]"
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="leading-tight font-semibold">
              {t.assistant.title}
            </div>
            <div className="text-muted-foreground text-xs">
              {t.assistant.subtitle}
            </div>
          </div>
        </div>

        <div className="flex h-[26rem] flex-col justify-end gap-3 overflow-hidden p-4 [mask-image:linear-gradient(to_bottom,transparent,black_2.5rem)] sm:h-[27rem]">
          <AnimatePresence initial={false}>
            {reached('sent') && (
              <motion.div
                key="prompt"
                {...enter}
                className="bg-secondary ml-auto max-w-[85%] rounded-lg px-4 py-3 text-sm"
              >
                {prompt}
              </motion.div>
            )}
            {phase === 'thinking' && (
              <motion.div key="thinking" {...enter} className="text-sm">
                <Shimmer as="span">{t.assistant.thinking}</Shimmer>
              </motion.div>
            )}
            {reached('confirm') && (
              <motion.p key="reply" {...enter} className="text-sm">
                {t.landing.chat.reply}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {(phase === 'confirm' || phase === 'approving') && (
              <motion.div
                key="confirm"
                {...enter}
                className="border-primary/40 bg-card space-y-3 rounded-xl border-2 p-3 text-sm shadow-sm"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <FileText className="text-primary size-4" />
                  {t.assistant.write.confirmInvoice}
                </div>
                <dl className="space-y-1.5">
                  <div className="flex gap-3">
                    <dt className="text-muted-foreground w-20 shrink-0">
                      {t.assistant.write.client}
                    </dt>
                    <dd className="flex min-w-0 items-center gap-2">
                      {t.landing.chat.client}
                      <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                        {t.landing.chat.newClient}
                      </span>
                    </dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="text-muted-foreground w-20 shrink-0">
                      {t.docs.dueDate}
                    </dt>
                    <dd>{due}</dd>
                  </div>
                </dl>
                <ul className="divide-y rounded-md border text-xs">
                  {t.landing.chat.items.map((item, i) => (
                    <li key={item} className="flex gap-3 px-2 py-1.5">
                      <span className="flex-1">{item}</span>
                      <span className="font-medium tabular-nums">
                        {money(PRICES[i] ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">
                    {t.docs.builder.total}{' '}
                    <span className="tabular-nums">{total}</span>
                  </span>
                  <div className="flex gap-2">
                    <span className="inline-flex h-8 items-center rounded-md px-3 font-medium">
                      {t.common.cancel}
                    </span>
                    <span
                      className={cn(
                        'bg-primary text-primary-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-medium transition-transform duration-200',
                        phase === 'approving' &&
                          'ring-primary/30 scale-95 ring-4',
                      )}
                    >
                      <CheckCircle2 className="size-4" />
                      {t.assistant.write.approve}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
            {phase === 'saving' && (
              <motion.div
                key="saving"
                {...enter}
                className="bg-card/70 text-muted-foreground flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
              >
                <Spinner className="size-3.5" />
                <Shimmer as="span">{t.assistant.write.saving}</Shimmer>
              </motion.div>
            )}
            {phase === 'done' && (
              <motion.div
                key="done"
                {...enter}
                className="bg-card space-y-3 rounded-xl border p-3 text-sm"
              >
                <div className="text-primary flex items-center gap-2 text-xs font-medium">
                  <CheckCircle2 className="size-3.5" />
                  {t.assistant.write.invoiceCreated}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold tabular-nums">INV-0043</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {t.landing.chat.client} · {t.docs.dueDate} {due}
                    </div>
                  </div>
                  <div className="text-lg font-bold tabular-nums">{total}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-primary text-primary-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-medium">
                    <Send className="size-4" />
                    {t.common.share}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t.assistant.write.shareHint}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t p-3">
          <div className="bg-background flex items-end gap-2 rounded-xl border px-3 py-2.5 text-sm">
            <span className="min-h-10 flex-1">
              {phase === 'typing' ? (
                <>
                  {prompt.slice(0, typed)}
                  <span className="bg-primary ml-px inline-block h-4 w-0.5 translate-y-0.5 animate-pulse" />
                </>
              ) : (
                <span className="text-muted-foreground">
                  {t.assistant.placeholder}
                </span>
              )}
            </span>
            <span
              className={cn(
                'bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg transition-opacity',
                phase !== 'typing' && 'opacity-40',
              )}
            >
              <ArrowUp className="size-4" />
            </span>
          </div>
        </div>
      </div>

      {phase === 'done' && !reduce && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground absolute -bottom-11 left-1/2 -translate-x-1/2"
          onClick={() => {
            setTyped(0)
            setPhase('idle')
          }}
        >
          <RotateCcw />
          {t.landing.chat.replay}
        </Button>
      )}
    </figure>
  )
}

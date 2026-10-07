import {
  Hammer,
  HardHat,
  PaintRoller,
  SprayCan,
  Sprout,
  Truck,
  Wrench,
} from 'lucide-react'
import { useT } from '@/lib/i18n'

/** One per entry of `t.landing.trades`, in the same order. */
const ICONS = [Sprout, SprayCan, Wrench, HardHat, PaintRoller, Hammer, Truck]

/**
 * Use-case cards drifting left to right. These describe what the app does
 * for each trade; swap in real customer quotes once there are some.
 */
export function TradesMarquee() {
  const t = useT()
  const cards = t.landing.trades.map((c, i) => ({
    ...c,
    icon: ICONS[i % ICONS.length],
  }))

  return (
    <section className="py-16">
      <div className="mx-auto max-w-2xl px-5 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {t.landing.tradesTitle}
        </h2>
        <p className="text-muted-foreground mt-3 text-lg">
          {t.landing.tradesSubtitle}
        </p>
      </div>

      <div className="group mt-10 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] motion-reduce:overflow-x-auto">
        <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[false, true].map((copy) => (
            // The second copy only exists to make the loop seamless.
            <ul
              key={String(copy)}
              aria-hidden={copy || undefined}
              className="flex gap-4 pr-4 motion-reduce:[&[aria-hidden]]:hidden"
            >
              {cards.map((c) => (
                <li
                  key={c.trade}
                  className="bg-card flex w-72 shrink-0 flex-col gap-3 rounded-2xl border p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-lg">
                      <c.icon className="size-4" />
                    </div>
                    <span className="font-semibold">{c.trade}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">{c.body}</p>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}

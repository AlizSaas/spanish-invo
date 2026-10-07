import { Play } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { useUiStore } from '@/stores/ui-store'

/**
 * YouTube video IDs (the part after `v=`) for the demo, per language. Upload
 * as "Unlisted" if it shouldn't show on the channel. With only one filled in,
 * both languages use it; with neither, the section is hidden in production.
 */
const DEMO_VIDEO: Record<'es' | 'en', string> = {
  es: '',
  en: '',
}

/**
 * Click-to-play demo: only a thumbnail loads up front, and YouTube's player
 * (and its cookies, via youtube-nocookie) loads when someone presses play.
 */
export function DemoVideo() {
  const t = useT()
  const locale = useUiStore((s) => s.locale)
  const [playing, setPlaying] = useState(false)
  const id = DEMO_VIDEO[locale] || DEMO_VIDEO.es || DEMO_VIDEO.en

  if (!id && !import.meta.env.DEV) return null

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-16">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {t.landing.demoTitle}
        </h2>
        <p className="text-muted-foreground mt-3 text-lg">
          {t.landing.demoSubtitle}
        </p>
      </div>

      <div className="bg-muted relative aspect-video overflow-hidden rounded-3xl border shadow-xl">
        {!id ? (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
            {t.landing.demoSoon}
          </div>
        ) : playing ? (
          <iframe
            className="size-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={t.landing.demoCta}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center"
          >
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            <span className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />
            <span className="bg-primary text-primary-foreground relative flex items-center gap-2.5 rounded-full py-3 pr-6 pl-4 text-base font-semibold shadow-lg transition-transform group-hover:scale-105">
              <span className="bg-primary-foreground/20 flex size-8 items-center justify-center rounded-full">
                <Play className="size-4 fill-current" />
              </span>
              {t.landing.demoCta}
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

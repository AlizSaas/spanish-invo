import { ChevronDown } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/lib/constants'
import { useT } from '@/lib/i18n'

/**
 * Landing-page FAQ. Native <details> so answers are in the server HTML
 * (crawlable, works before hydration) and keyboard/screen-reader support
 * comes from the browser.
 */
export function FaqSection() {
  const t = useT()
  const [before = '', after = ''] = t.landing.faqContact.split('{email}')

  return (
    <section
      id="preguntas"
      className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:gap-12 md:py-24"
    >
      <div className="md:sticky md:top-8 md:self-start">
        <h2 className="text-3xl font-bold tracking-tight text-balance">
          {t.landing.faqTitle}
        </h2>
        <p className="text-muted-foreground mt-3 max-w-sm text-pretty">
          {before}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-foreground font-medium underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>
          {after}
        </p>
      </div>
      <div className="divide-y border-y">
        {t.landing.faq.map((item) => (
          <details key={item.q} className="group">
            <summary className="focus-visible:ring-ring/50 flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-5 font-medium outline-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                aria-hidden
                className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="text-muted-foreground max-w-2xl pr-9 pb-5 text-pretty">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}

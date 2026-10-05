import { Link } from '@tanstack/react-router'
import type { LegalContent } from '@/content/legal'
import { Logo } from '@/components/brand/logo'
import { LanguageToggle } from '@/components/language-toggle'
import { SiteFooter } from '@/components/site-footer'
import { getLegal } from '@/content/legal'
import { SUPPORT_EMAIL } from '@/lib/constants'
import { useT } from '@/lib/i18n'
import { useUiStore } from '@/stores/ui-store'

/** Renders one legal document (privacy, terms, SMS consent) in the current UI language. */
export function LegalPage({ doc }: { doc: keyof LegalContent }) {
  const t = useT()
  const locale = useUiStore((s) => s.locale)
  const content = getLegal(locale)[doc]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
        <Link to="/" aria-label="Factura Fácil">
          <Logo />
        </Link>
        <LanguageToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {content.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t.legal.updated}: {content.updated}
        </p>
        <p className="mt-6 text-lg leading-relaxed text-pretty">
          {withEmailLink(content.intro)}
        </p>

        {content.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              {section.heading}
            </h2>
            {section.body.map((paragraph, i) => (
              <p
                key={i}
                className="text-muted-foreground mt-3 leading-relaxed text-pretty"
              >
                {withEmailLink(paragraph)}
              </p>
            ))}
          </section>
        ))}
      </main>

      <SiteFooter className="max-w-3xl" />
    </div>
  )
}

/** Replace `{email}` with a mailto link so the address lives in one constant. */
function withEmailLink(text: string) {
  return text.split('{email}').flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a
            key={i}
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-primary underline"
          >
            {SUPPORT_EMAIL}
          </a>,
          part,
        ],
  )
}

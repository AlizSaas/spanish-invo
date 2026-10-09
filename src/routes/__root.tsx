import { useEffect } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { LANGUAGES, pageUrl } from '@/lib/constants'
import { useUiStore } from '@/stores/ui-store'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Factura Fácil: facturas hechas con IA, enviadas por WhatsApp' },
      {
        name: 'description',
        content:
          'Cuéntale el trabajo a la IA: ella prepara el cliente y la factura. Revísala y mándala por WhatsApp o Messenger, en español o inglés.',
      },
      { name: 'theme-color', content: '#2f7a4f' },
      // Link previews (WhatsApp, iMessage, social) when the site URL is shared.
      { property: 'og:site_name', content: 'Factura Fácil' },
      { property: 'og:type', content: 'website' },
      {
        property: 'og:title',
        content: 'Factura Fácil: facturas hechas con IA, enviadas por WhatsApp',
      },
      {
        property: 'og:description',
        content:
          'Cuéntale el trabajo a la IA: ella prepara el cliente y la factura. Revísala y mándala por WhatsApp o Messenger, en español o inglés.',
      },
      // og:url and the canonical link are set per public page (pageUrl).
      { property: 'og:locale', content: 'es_US' },
      { property: 'og:locale:alternate', content: 'en_US' },
      // Share card for WhatsApp, Messenger and Facebook — the channels this
      // product is actually passed around in. Overridden per invoice on /i/.
      { property: 'og:image', content: pageUrl('/og-cover.png') },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content:
          'Factura Fácil: facturas y presupuestos en español, enviados por WhatsApp.',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: pageUrl('/og-cover.png') },
      // Chrome's page translation rewrites text nodes into <font> tags before
      // React hydrates, which crashes React (removeChild/insertBefore errors).
      // The app ships its own ES/EN toggle, so opt out of browser translation.
      { name: 'google', content: 'notranslate' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://rsms.me/' },
      { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootComponent() {
  const locale = useUiStore((s) => s.locale)

  // Read persisted UI prefs (language, sidebar) only after mount to keep SSR markup stable.
  // A ?lang=es|en link then overrides the saved language, so English readers
  // (Google's OAuth reviewers) can be sent straight to the English pages.
  useEffect(() => {
    void Promise.resolve(useUiStore.persist.rehydrate()).then(() => {
      const lang = new URLSearchParams(window.location.search).get('lang')
      const match = LANGUAGES.find((l) => l === lang)
      if (match) useUiStore.getState().setLocale(match)
    })
  }, [])

  // Keep <html lang> in step with the UI language (screen readers, spell-check).
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <Outlet />
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" translate="no" suppressHydrationWarning>
      <head>
        {/* Google Ads tag. Keep it the only one: a second tag double-counts conversions. */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18504097095" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'AW-18504097095');",
          }}
        />
        <HeadContent />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

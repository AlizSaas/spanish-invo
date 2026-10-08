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
import { LANGUAGES } from '@/lib/constants'
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
      { title: 'Factura Fácil: AI invoices, sent by WhatsApp' },
      {
        name: 'description',
        content:
          'Tell the AI about the job and it prepares the client and the invoice. Review it and send it by WhatsApp or Messenger, in English or Spanish.',
      },
      { name: 'theme-color', content: '#2f7a4f' },
      // Link previews (WhatsApp, iMessage, social) when the site URL is shared.
      { property: 'og:site_name', content: 'Factura Fácil' },
      { property: 'og:type', content: 'website' },
      {
        property: 'og:title',
        content: 'Factura Fácil: AI invoices, sent by WhatsApp',
      },
      {
        property: 'og:description',
        content:
          'Tell the AI about the job and it prepares the client and the invoice. Review it and send it by WhatsApp or Messenger, in English or Spanish.',
      },
      // og:url and the canonical link are set per public page (pageUrl).
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:locale:alternate', content: 'es_US' },
      { name: 'twitter:card', content: 'summary' },
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
        <HeadContent />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { TURNSTILE_HEADER } from '@/lib/constants'
import { useUiStore } from '@/stores/ui-store'

// Local dev uses Cloudflare's always-pass test key (its secret is in .dev.vars).
const SITE_KEY = import.meta.env.DEV
  ? '1x00000000000000000000AA'
  : '0x4AAAAAAFQnLbs8Q8SD7KW_'
const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      action: string
      language: string
      theme: 'light' | 'dark'
      size: 'flexible'
      appearance: 'interaction-only'
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    },
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let script: Promise<TurnstileApi> | undefined
function loadTurnstile(): Promise<TurnstileApi> {
  script ??= new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SCRIPT_URL
    el.async = true
    el.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('Turnstile did not load'))
    }
    el.onerror = () => {
      script = undefined
      reject(new Error('Turnstile did not load'))
    }
    document.head.appendChild(el)
  })
  return script
}

/**
 * Turnstile for one auth form. Render `<div ref={turnstile.ref} />` inside the
 * form and send `turnstile.headers` with the request. Usually invisible: it
 * only shows a checkbox when Cloudflare isn't sure. Tokens are single-use, so
 * call `reset()` after every attempt that keeps the form on screen.
 */
export function useTurnstile(action: 'login' | 'signup' | 'reset') {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const locale = useUiStore((s) => s.locale)
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !ref.current) return
        widgetId.current = api.render(ref.current, {
          sitekey: SITE_KEY,
          action,
          language: locale,
          theme,
          size: 'flexible',
          appearance: 'interaction-only',
          callback: setToken,
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        })
      })
      // Blocked script (ad blocker, offline): the form explains on submit.
      .catch(() => {})
    return () => {
      cancelled = true
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
      setToken(null)
    }
  }, [action, locale, theme])

  const reset = useCallback(() => {
    setToken(null)
    if (widgetId.current) window.turnstile?.reset(widgetId.current)
  }, [])

  return {
    ref,
    token,
    reset,
    headers: token ? { [TURNSTILE_HEADER]: token } : undefined,
  }
}

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FieldSeparator } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { signIn } from '@/lib/auth-client'
import { LOCALE_COOKIE } from '@/lib/constants'
import { useT } from '@/lib/i18n'
import { useUiStore } from '@/stores/ui-store'

/**
 * "Continue with Google" plus the "or" divider above the email form. Works for
 * both sign-in and sign-up: Better Auth creates the account on first use, and
 * the app layout sends anyone without a finished setup to /onboarding.
 */
export function GoogleSignIn({
  errorPath,
  onError,
}: {
  /** Where Google failures land (Better Auth appends ?error=...). */
  errorPath: '/login' | '/signup'
  onError: (message: string) => void
}) {
  const t = useT()
  const locale = useUiStore((s) => s.locale)
  const [pending, setPending] = useState(false)

  const start = async () => {
    setPending(true)
    // Welcome emails go out in this language (see languageFromHeaders).
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=600; samesite=lax`
    const { error } = await signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
      errorCallbackURL: errorPath,
    })
    // On success the browser is already leaving for Google; keep the spinner.
    if (error) {
      setPending(false)
      onError(t.auth.errors.google)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full text-base"
        disabled={pending}
        onClick={start}
      >
        {pending ? <Spinner /> : <GoogleMark />}
        {t.auth.google}
      </Button>
      <FieldSeparator>{t.auth.or}</FieldSeparator>
    </>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.11C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  )
}

/** Google redirects back with ?error=...; "access_denied" is just the user backing out. */
export function googleErrorFromSearch(
  error: string | undefined,
  message: string,
): string | null {
  return error && error !== 'access_denied' ? message : null
}

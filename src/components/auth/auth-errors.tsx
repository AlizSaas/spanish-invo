import type { Dictionary } from '@/lib/i18n'

/** Better Auth errors → friendly copy in the active UI language. */
export function authErrorMessage(
  t: Dictionary,
  error: { code?: string; status?: number },
): string {
  // Both limiters (ours at the edge, Better Auth's) answer 429; only ours has a code.
  if (error.status === 429) return t.auth.errors.tooMany
  switch (error.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
    case 'USER_NOT_FOUND':
      return t.auth.errors.invalidCredentials
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return t.auth.errors.emailInUse
    case 'PASSWORD_TOO_SHORT':
      return t.auth.errors.weakPassword
    case 'INVALID_TOKEN':
      return t.auth.reset.invalidToken
    case 'CAPTCHA_FAILED':
      return t.auth.errors.captcha
    default:
      return t.auth.errors.generic
  }
}

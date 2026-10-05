import type { Dictionary } from '@/lib/i18n'

/** Better Auth error codes → friendly copy in the active UI language. */
export function authErrorMessage(t: Dictionary, code?: string): string {
  switch (code) {
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
    default:
      return t.auth.errors.generic
  }
}

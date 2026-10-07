import { en } from './en'
import { es } from './es'
import type { Dictionary } from './es'
import type { Language } from '@/lib/constants'
import { useUiStore } from '@/stores/ui-store'

export type { Dictionary }

const dictionaries: Record<Language, Dictionary> = { es, en }

/** Server-safe lookup (PDF template, SMS/WhatsApp message bodies). */
export function getDictionary(lang: Language): Dictionary {
  return dictionaries[lang]
}

/** App-shell strings in the owner's UI language. */
export function useT(): Dictionary {
  const locale = useUiStore((s) => s.locale)
  return dictionaries[locale]
}

/** Replace `{name}` placeholders in a message template. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
}

/**
 * Validators emit dictionary paths ("clients.invalidPhone") instead of prose so
 * one schema serves both languages. Unknown paths pass through unchanged.
 */
export function resolveMessage(
  dict: Dictionary,
  message?: string,
): string | undefined {
  if (!message) return undefined
  let cur: unknown = dict
  for (const part of message.split('.')) {
    if (cur && typeof cur === 'object' && part in cur) {
      cur = (cur as Record<string, unknown>)[part]
    } else {
      return message
    }
  }
  return typeof cur === 'string' ? cur : message
}

/** Map server-side error codes (thrown as Error.message) to friendly copy. */
export function errorMessage(dict: Dictionary, err: unknown): string {
  const code = err instanceof Error ? err.message : String(err)
  const map: Partial<Record<string, string>> = {
    NOT_FOUND: dict.common.notFoundBody,
    CLIENT_HAS_DOCUMENTS: dict.clients.hasInvoices,
    CLIENT_NO_PHONE: dict.docs.share.noPhone,
    SMS_NOT_CONFIGURED: dict.docs.share.smsComingSoonHelp,
    SMS_FAILED: dict.auth.errors.generic,
    SMS_TOO_LONG: dict.docs.share.smsTooLong,
    SMS_DAILY_LIMIT: dict.docs.share.smsDailyLimit,
    PLAN_LIMIT: dict.billing.limitReached,
    LOCKED: dict.docs.detail.voidBody,
  }
  return map[code] ?? resolveMessage(dict, code) ?? dict.auth.errors.generic
}

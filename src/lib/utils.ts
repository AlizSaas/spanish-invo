import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DEFAULT_CURRENCY } from './constants'
import type { ClassValue } from 'clsx'
import type { Language } from './constants'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

const LOCALE_FOR_LANGUAGE: Record<Language, string> = {
  es: 'es-US',
  en: 'en-US',
}

/** Format a numeric string/number from the DB as currency in the document's language. */
export function formatCurrency(
  amount: string | number,
  currency: string = DEFAULT_CURRENCY,
  language: Language = 'es',
): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  return new Intl.NumberFormat(LOCALE_FOR_LANGUAGE[language], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatDate(
  date: Date | string,
  opts: { language?: Language; timezone?: string } = {},
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(LOCALE_FOR_LANGUAGE[opts.language ?? 'es'], {
    timeZone: opts.timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/** wa.me wants digits only, no "+" */
export function toWhatsAppNumber(e164: string): string {
  return e164.replace(/\D/g, '')
}

/** URL-safe random token for public invoice links. */
export function generateToken(bytes = 24): string {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** "INV" + 1 → "INV-0001" */
export function formatDocumentNumber(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, '0')}`
}

import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/max'
import type { CountryCode } from 'libphonenumber-js/max'

/**
 * Phone numbers are stored as E.164 ("+15025550100") so wa.me and Twilio
 * accept them. The country code is required: a bare national number is
 * ambiguous (a Mexican mobile has as many digits as a US number), and a wrong
 * code is what makes WhatsApp answer "number not found".
 *
 * Everything imports libphonenumber's `max` metadata (also PhoneInput), so the
 * digits are checked against each country's numbering plan, not just the
 * length, and only one metadata set ends up in the bundle.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith('+')) return null
  // WhatsApp still shows Mexican mobiles the pre-2019 way, "+52 1 55 …", and
  // owners copy numbers from there. Mexico dropped that "1" (no area code
  // starts with 1), so strip it.
  const digits = trimmed.replace(/\D/g, '')
  const text = /^521\d{10}$/.test(digits) ? `+52${digits.slice(3)}` : trimmed
  const parsed = parsePhoneNumberFromString(text)
  return parsed?.isValid() ? parsed.number : null
}

/**
 * The picker's country + what was typed → the value the form validates.
 * Typing "+…" overrides the picker. Without a country the text passes through
 * untouched, so validation asks for one instead of guessing.
 */
export function composePhone(
  country: CountryCode | undefined,
  text: string,
): string {
  const trimmed = text.trim()
  if (!trimmed || !country || trimmed.startsWith('+')) return trimmed
  // Parsing (not concatenating) drops trunk prefixes: UK "07911…" → +447911…
  return (
    parsePhoneNumberFromString(trimmed, country)?.number ??
    `+${getCountryCallingCode(country)}${trimmed.replace(/\D/g, '')}`
  )
}

/** Stored value → the picker's country and the number as written locally. */
export function splitPhone(value: string): {
  country: CountryCode | undefined
  national: string
} {
  const parsed = value.startsWith('+')
    ? parsePhoneNumberFromString(value)
    : undefined
  return parsed?.country
    ? { country: parsed.country, national: parsed.formatNational() }
    : { country: undefined, national: value }
}

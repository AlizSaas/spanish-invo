import { legalEn } from './en'
import { legalEs } from './es'
import type { LegalContent } from './types'
import type { Language } from '@/lib/constants'

export type { LegalContent, LegalDoc, LegalSection } from './types'

/** Privacy Policy and Terms of Service in the given UI language. */
export function getLegal(lang: Language): LegalContent {
  return lang === 'en' ? legalEn : legalEs
}

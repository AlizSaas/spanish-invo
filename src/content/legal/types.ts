export interface LegalSection {
  heading: string
  /** Paragraphs. `{email}` is replaced with a mailto link to SUPPORT_EMAIL. */
  body: Array<string>
}

export interface LegalDoc {
  title: string
  /** Human-readable date in the document's language. */
  updated: string
  intro: string
  sections: Array<LegalSection>
}

export interface LegalContent {
  privacy: LegalDoc
  terms: LegalDoc
  /** Public SMS opt-in disclosure required by carriers / Twilio registration. */
  smsConsent: LegalDoc
}

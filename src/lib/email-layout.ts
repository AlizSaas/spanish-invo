/**
 * Renders transactional emails from a list of content blocks into a branded
 * HTML version and a plain-text fallback, so the copy lives in one place.
 *
 * Inline markup in block text: `**bold**` and `[label](url)`. All text is
 * HTML-escaped before markup is applied.
 */

import type { Language } from '@/lib/constants'

export type EmailBlock =
  | { type: 'p'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'steps'; items: Array<string> }
  | { type: 'checklist'; items: Array<string> }
  | {
      type: 'button'
      label: string
      url: string
      /** HTML only: small line under the button followed by the raw URL. */
      fallback?: string
    }
  | { type: 'summary'; rows: Array<[label: string, value: string]> }

export interface RenderedEmail {
  subject: string
  text: string
  html: string
}

const C = {
  page: '#f4f3ef',
  card: '#ffffff',
  border: '#e4e1da',
  ink: '#1f1c19',
  body: '#3a3531',
  muted: '#7a7269',
  green: '#2f7a4f',
  greenSoft: '#eef6f0',
  greenInk: '#1d4a31',
}
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g
const BOLD_RE = /\*\*(.+?)\*\*/g

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const inlineHtml = (s: string) =>
  esc(s)
    .replace(
      LINK_RE,
      `<a href="$2" style="color:${C.green};font-weight:600;text-decoration:underline;">$1</a>`,
    )
    .replace(BOLD_RE, `<strong style="color:${C.ink};">$1</strong>`)

const inlineText = (s: string) =>
  s
    .replace(LINK_RE, (_, label: string, url: string) =>
      label === url ? url : `${label} (${url})`,
    )
    .replace(BOLD_RE, '$1')

function blockText(block: EmailBlock, language: Language): string {
  switch (block.type) {
    case 'p':
      return inlineText(block.text)
    case 'heading':
      return block.text.toLocaleUpperCase(language)
    case 'steps':
      return block.items.map((s, i) => `${i + 1}. ${inlineText(s)}`).join('\n')
    case 'checklist':
      return block.items.map((s) => `- ${inlineText(s)}`).join('\n')
    case 'button':
      return `${block.label}: ${block.url}`
    case 'summary':
      return block.rows.map(([l, v]) => `- ${l}: ${v}`).join('\n')
  }
}

function listRow(marker: string, html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;"><tr>
<td width="24" valign="top" style="padding-top:1px;">${marker}</td>
<td style="padding-left:12px;font-size:16px;line-height:1.55;color:${C.body};">${html}</td>
</tr></table>`
}

function blockHtml(block: EmailBlock): string {
  switch (block.type) {
    case 'p':
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.body};">${inlineHtml(block.text)}</p>`
    case 'heading':
      return `<h2 style="margin:28px 0 12px;font-size:16px;line-height:1.4;font-weight:700;color:${C.ink};">${esc(block.text)}</h2>`
    case 'steps':
      return `<div style="margin:4px 0 8px;">${block.items
        .map((s, i) =>
          listRow(
            `<div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:${C.green};color:#ffffff;font-size:13px;font-weight:700;text-align:center;">${i + 1}</div>`,
            inlineHtml(s),
          ),
        )
        .join('')}</div>`
    case 'checklist':
      return `<div style="margin:0 0 8px;">${block.items
        .map((s) =>
          listRow(
            `<div style="font-size:16px;line-height:1.55;font-weight:700;color:${C.green};text-align:center;">&#10003;</div>`,
            inlineHtml(s),
          ),
        )
        .join('')}</div>`
    case 'button': {
      const button = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr>
<td style="border-radius:8px;background:${C.green};">
<a href="${esc(block.url)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(block.label)}</a>
</td></tr></table>`
      if (!block.fallback) return button
      return `${button}<p style="margin:-8px 0 20px;font-size:13px;line-height:1.55;color:${C.muted};word-break:break-all;">${esc(block.fallback)}<br><a href="${esc(block.url)}" style="color:${C.green};">${esc(block.url)}</a></p>`
    }
    case 'summary':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;background:${C.greenSoft};border-radius:10px;"><tr><td style="padding:14px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${block.rows
        .map(
          ([label, value]) => `<tr>
<td style="padding:6px 12px 6px 0;font-size:14px;line-height:1.4;color:${C.muted};">${esc(label)}</td>
<td align="right" style="padding:6px 0;font-size:15px;line-height:1.4;font-weight:700;color:${C.greenInk};">${esc(value)}</td>
</tr>`,
        )
        .join('')}</table>
</td></tr></table>`
  }
}

const FOOTER: Record<Language, (appName: string) => string> = {
  es: (appName) =>
    `Recibes este correo porque tienes una cuenta en ${appName}.`,
  en: (appName) =>
    `You're getting this email because you have a ${appName} account.`,
}

export function renderEmail(opts: {
  language: Language
  appName: string
  appUrl: string
  subject: string
  /** Large heading at the top of the HTML version. */
  title: string
  /** Inbox preview line shown next to the subject. */
  preheader: string
  blocks: Array<EmailBlock>
}): RenderedEmail {
  const { language, appName, appUrl } = opts
  const text = opts.blocks.map((b) => blockText(b, language)).join('\n\n')

  // "Factura Fácil" → "Factura" in ink, "Fácil" in green, like the site logo.
  const split = appName.lastIndexOf(' ')
  const wordmark =
    split > 0
      ? `${esc(appName.slice(0, split))} <span style="color:${C.green};">${esc(appName.slice(split + 1))}</span>`
      : esc(appName)
  const host = new URL(appUrl).host

  const html = `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(opts.subject)}</title>
<style>
@media (max-width:480px){.card{padding:28px 22px !important}.outer{padding:20px 10px !important}}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};font-family:${FONT};">
<tr><td align="center" class="outer" style="padding:36px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px;">
<a href="${esc(appUrl)}" style="text-decoration:none;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><img src="${esc(appUrl)}/email-logo.png" width="40" height="40" alt="" style="display:block;border:0;"></td>
<td valign="middle" style="padding-left:10px;font-size:22px;font-weight:700;letter-spacing:-0.3px;color:${C.ink};">${wordmark}</td>
</tr></table>
</a>
</td></tr>
<tr><td class="card" style="background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:36px 36px 24px;">
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.4px;color:${C.ink};">${esc(opts.title)}</h1>
${opts.blocks.map(blockHtml).join('\n')}
</td></tr>
<tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:${C.muted};">
${esc(FOOTER[language](appName))}<br>
<a href="${esc(appUrl)}" style="color:${C.muted};text-decoration:underline;">${esc(host)}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  return { subject: opts.subject, text, html }
}

# Production deployment checklist — facturafacilapp.com

Everything here is a manual step you do once (or when it changes). The code side
(domain routes, security headers, legal pages, robots/sitemap) is already in the repo.
Run `pnpm check` before every deploy; deploy with `pnpm deploy`.

## 1. Domain and Cloudflare account

- [ ] Add the zone `facturafacilapp.com` to this Cloudflare account and point the
      registrar's nameservers at the two Cloudflare nameservers it gives you.
      Wait until the zone shows **Active**. The Worker's Custom Domains in
      `wrangler.jsonc` (`facturafacilapp.com` and `www.facturafacilapp.com`) are created
      on deploy and will fail loudly if the zone is not active yet.
- [ ] `workers_dev` is `false`, so the old `spanish-invo.alizdevs.workers.dev` URL stops
      serving the app after the first deploy. That is intended: auth cookies and
      `BETTER_AUTH_URL` now assume one origin, `https://facturafacilapp.com`.
- [ ] SSL/TLS mode for the zone: **Full (strict)**. Enable **Always Use HTTPS**.

## 2. Secrets (never in wrangler.jsonc or git)

```bash
wrangler secret put BETTER_AUTH_SECRET     # new random value: openssl rand -base64 48
wrangler secret put OPENAIAPIKEY           # AI assistant
wrangler secret put TWILIO_ACCOUNT_SID     # optional: SMS fallback
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER
```

- [ ] Use a different `BETTER_AUTH_SECRET` than the one in `.dev.vars`.
- [ ] Rotate any key that has ever been pasted into a chat, a screenshot or a commit.

## 3. Database (Neon)

- [ ] Production branch/database exists and the Hyperdrive config
      `spanish-invo-hyperdrive` points at it (id is in `wrangler.jsonc`).
- [ ] Run migrations against production: `DATABASE_URL=<prod direct url> pnpm db:migrate`.
- [ ] Note Neon's restore window on your plan (24 h on Free, 7 days on Launch). That is
      your backup; take a `pg_dump` before risky migrations.

## 4. Email

- [ ] Verify `facturafacilapp.com` for **Email Sending** in the Cloudflare dashboard
      (adds SPF/DKIM/DMARC records). Until then `EMAIL_FROM` stays
      `no-reply@alizmail.com`, which is already verified.
- [ ] After verification set `EMAIL_FROM` in `wrangler.jsonc` to
      `no-reply@facturafacilapp.com`.
- [ ] Create the support inbox used by the footer, legal pages and
      `/.well-known/security.txt`: **Email Routing** → forward
      `support@facturafacilapp.com` to your real mailbox. Or change `SUPPORT_EMAIL`
      in `src/lib/constants.ts` to an address you already read.

## 5. Legal

- [ ] Read `/privacy` and `/terms` (`src/content/legal/es.ts`, `en.ts`). They describe
      what the code actually does today (Cloudflare, Neon, OpenAI, Twilio, public
      invoice links, no payment processing). Have a lawyer review them before launch.
- [ ] Fill in the governing-law state in the Terms (both languages) and the legal
      entity name if you operate as an LLC.
- [ ] Any time the text changes, update the `updated` date in both files.

## 6. Security hardening in the dashboard (no code)

- [ ] **WAF → Rate limiting rules**: one rule is free. Suggested: path starts with
      `/api/auth/` and method `POST` → 10 requests per 10 seconds per IP → block for
      1 minute. Better Auth's built-in limiter is per Worker isolate, so this is the
      real brute-force protection.
- [ ] **Bot Fight Mode** on (Security → Bots).
- [ ] Optional: Cloudflare **Turnstile** on signup if you see spam accounts.
- [ ] Workers **observability** is on; add a **Notification** for Worker error rate.

- [ ] **Twilio**: restrict Geo Permissions to the countries you actually serve and set a
      spend alert. The app already caps SMS at 480 characters and 50 per account per day
      and forces the invoice link into every message, but the account-level limits are
      your backstop.

### Security review notes (2026-10-05)

Fixed in code: AI chat history writes are ownership-checked and client "system" turns
are dropped; the AI API has a same-origin check, a 256 KB body limit, a 4,000-character
message cap and a 60-messages-per-hour budget per account; reindex is once per 10 min;
internal error text is no longer returned to clients; the logo URL can only be the app's
own `/api/logo/<id>` path and is never taken from forms; Twilio errors no longer log the
destination number; `returnTo` rejects protocol-relative URLs; number prefixes are
limited to `A-Z 0-9 -` so PDF filenames can't break.

Still open, by design or product decision:

- [ ] **Email verification is off.** Anyone can sign up with someone else's address and
      that address receives the welcome and reminder emails. Turn on
      `requireEmailVerification` in Better Auth once you have a verification email + UI.
- [ ] **Public invoice links never expire** and voiding an invoice does not revoke its
      link. Consider rotating the token on void and an optional expiry.
- [ ] The public payload includes the invoice id and owner id (the owner id is already
      visible in the logo URL). Harmless today because every endpoint is user-scoped.
- [ ] Anonymous opens of a shared link each write a `viewed` event; add de-duplication
      if a customer refreshing a page ever becomes a problem.

## 7. After the first deploy, verify

- [ ] `https://facturafacilapp.com` loads; `https://www.facturafacilapp.com` 301s to it.
- [ ] `/robots.txt`, `/sitemap.xml`, `/privacy`, `/terms`, `/.well-known/security.txt`
      respond. If `security.txt` 404s, static assets are not serving the dot-folder:
      move it to a server route.
- [ ] Response headers include `Strict-Transport-Security`, `X-Content-Type-Options`,
      `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; `/i/<token>` and
      `/api/*` include `X-Robots-Tag: noindex`.
- [ ] Sign up → welcome email arrives (Workflow); password reset email arrives.
- [ ] Share an invoice: the WhatsApp message and PDF link use `https://facturafacilapp.com/i/…`.
- [ ] Google Search Console: add the domain property (DNS TXT), submit `/sitemap.xml`.

## 8. Dependencies

`pnpm audit --prod` (2026-10-05): 4 advisories, none reachable from the deployed Worker.

- `extract-zip`, `basic-ftp`, `tar-fs` paths come from `@cloudflare/puppeteer` →
  `@puppeteer/browsers`, which downloads browsers on a developer machine. The Worker
  uses the `BROWSER` binding, never that code.
- `esbuild` ≤0.24 comes from `drizzle-kit` (dev-only CLI).

Re-run the audit before each release; bump `@cloudflare/puppeteer` and `drizzle-kit`
when they ship updated dependencies.

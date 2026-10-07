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
- [x] SSL/TLS mode for the zone: **Full (strict)**. Enable **Always Use HTTPS**.
      Minimum TLS version **1.2**. (Set via API on 2026-10-07.)

## 2. Secrets (never in wrangler.jsonc or git)

```bash
wrangler secret put BETTER_AUTH_SECRET     # new random value: openssl rand -base64 48
wrangler secret put OPENAIAPIKEY           # AI assistant
wrangler secret put TWILIO_ACCOUNT_SID     # optional: SMS fallback
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER
wrangler secret put GOOGLE_CLIENT_ID       # "Continue with Google"
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put TURNSTILE_SECRET_KEY   # bot check on login, signup, password reset
```

- [ ] `TURNSTILE_SECRET_KEY` is the secret of the widget whose site key is in
      `src/components/auth/turnstile.tsx`. Without it the app lets every login through
      unchecked and logs `turnstile: TURNSTILE_SECRET_KEY is not set`. Local dev uses
      Cloudflare's always-pass test keys (`.dev.vars`).

- [ ] Use a different `BETTER_AUTH_SECRET` than the one in `.dev.vars`.
- [ ] Google OAuth client: authorized origin `https://facturafacilapp.com`, redirect URI
      `https://facturafacilapp.com/api/auth/callback/google`; consent screen published ("In production").
- [ ] Rotate any key that has ever been pasted into a chat, a screenshot or a commit.

## 3. Database (Neon)

- [ ] Production branch/database exists and the Hyperdrive config
      `spanish-invo-hyperdrive` points at it (id is in `wrangler.jsonc`).
- [ ] Run migrations against production: `DATABASE_URL=<prod direct url> pnpm db:migrate`.
      `0005_ai_usage` (the AI budget table) must be applied before deploying the
      version that reads it, or every assistant message fails.
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

- [x] Billing added to `/privacy` and `/terms` (`src/content/legal/es.ts`, `en.ts`) on
      2026-10-07: Free/Pro limits, prices and taxes, the 14-day trial (once per account),
      automatic renewal, cancellation (Pro stays until the end of the paid period),
      refunds, failed payments, Stripe as a processor, Google sign-in, Turnstile, cookies,
      state privacy rights. The pricing dialog and plan card say the trial renews
      automatically (`trialNote`).
- [ ] Confirm the choices the text makes for you, in both languages:
      **refunds** (no refunds for partial periods; refund within 30 days for a double
      charge or a long outage on our side), **governing law Kentucky** with Kentucky
      courts, **the English version controls** if the two differ, a **30-day notice**
      before price changes and a **15-day notice** before material changes to the terms.
- [ ] Add the legal entity name if you operate as an LLC.
- [ ] Have a lawyer review both documents before charging real customers.
- [ ] Any time the text changes, update the `updated` date in both files and the page's
      `<lastmod>` in `public/sitemap.xml`.

## 6. Security hardening in the dashboard (no code)

The Worker rate-limits itself with the `RL_STRICT` (10/min) and `RL_GENERAL` (300/min)
bindings in `wrangler.jsonc` (see `src/lib/rate-limit.ts`): per IP (IPv6 by /64) on
sign-in, sign-up, password reset, logo upload and PDF renders, per account on the AI
chat, and 300/min per IP on everything else. The Stripe webhook is exempt. Those
requests still reach the Worker, so the dashboard rules below are the layer that stops
a flood before it costs anything.

- [ ] The `namespace_id`s `72001` and `72002` must not be used by another Worker on
      this account (they would share counters).
- [x] **WAF → Rate limiting rules**: one rule is free. On the Free plan the period and
      the block are both fixed at 10 seconds. Created 2026-10-07: URI path is one of
      `/api/auth/sign-in/email`, `/api/auth/sign-up/email`,
      `/api/auth/request-password-reset` → 5 requests per 10 seconds per IP → block.
      If you add a sign-in method (magic link, phone), add its path to this rule.
- [x] **Bot Fight Mode** on (Security → Bots).
- [ ] **Turnstile** is in code on login, signup and forgot-password (managed widget,
      invisible unless Cloudflare is unsure). The widget's hostname list must include
      `facturafacilapp.com`; the server rejects tokens issued for any other hostname.
- [ ] Workers **observability** is on; add a **Notification** for Worker error rate.

- [ ] **Twilio**: SMS is switched off in code until Twilio approves the verification:
      `SMS_ENABLED` in `src/lib/constants.ts` hides the SMS button and the server refuses
      the channel. After approval, set it to `true` and redeploy.
      Restrict Geo Permissions to the countries you actually serve and set a
      spend alert. The app already caps SMS at 480 characters and 50 per account per day
      and forces the invoice link into every message, but the account-level limits are
      your backstop. For A2P 10DLC or toll-free verification, use
      `https://facturafacilapp.com/sms-consent` as the opt-in / consent URL and
      the sample message shown on that page.

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

### Security review notes (2026-10-07)

Fixed in code: edge rate limiting (section 6); the AI budget is counted in an
append-only `ai_usage` table, so deleting chats or replaying message ids no longer
resets it, and approval follow-ups are capped at twice the budget; users can only send
the AI text (no file URLs); model output is capped per step; the PDF renderer runs
with JavaScript off and refuses every network request (logos are inlined), and answers
503 when Browser Rendering is busy; `viewed` / `pdf_downloaded` events are written at
most once per hour per invoice; a password reset signs out every session; reset emails
are sent at most once per 2 minutes per address; account names are stripped of
control characters; logos are checked by their bytes, not the declared type, and
served with a sandbox CSP; the assistant's markdown can't load images; percent
discounts are capped at 100 % and impossible dates are rejected; every validated
string and number has an upper bound.

Still open:

- [ ] **Document limit race**: two simultaneous creates on Free can both pass the
      monthly check. Low impact (one extra document); fix with an advisory lock if it
      ever matters. Deleting a draft also frees its slot in the count.
- [ ] Sessions are cached in a cookie for 5 minutes, so a revoked session can keep
      working for up to 5 minutes.
- [ ] Stripe retries a webhook it didn't get a 2xx for; a retry after a slow success
      can send the thank-you email twice.

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
- [ ] Messenger preview: paste an invoice link into the Facebook Sharing Debugger
      (https://developers.facebook.com/tools/debug/) and click **Scrape Again**. It should
      show "Invoice INV-… from <business>" with the total and due date, not the homepage
      title. If it reports a robots.txt block or a 403, check that `/robots.txt` is the
      new version and that Bot Fight Mode isn't challenging `facebookexternalhit`.
- [ ] Upload a logo in Settings. Worker logs should not show `logo transform skipped`; if
      they do, enable Cloudflare Images for the account (Images → Get started, 5,000 free
      transformations a month). Logos still work without it, just not resized to WebP.
- [ ] Google Search Console (https://search.google.com/search-console): add a **Domain**
      property for `facturafacilapp.com`. The `google-site-verification` TXT record is
      already in DNS, so **Verify** should pass at once. Then **Sitemaps** → enter
      `sitemap.xml` → **Submit**, and **URL Inspection** → `https://facturafacilapp.com/`
      → **Request indexing**. See `docs/SITEMAP-VALIDATION-REPORT.md`.

## 8. Dependencies

`pnpm audit --prod` (2026-10-05): 4 advisories, none reachable from the deployed Worker.

- `extract-zip`, `basic-ftp`, `tar-fs` paths come from `@cloudflare/puppeteer` →
  `@puppeteer/browsers`, which downloads browsers on a developer machine. The Worker
  uses the `BROWSER` binding, never that code.
- `esbuild` ≤0.24 comes from `drizzle-kit` (dev-only CLI).

Re-run the audit before each release; bump `@cloudflare/puppeteer` and `drizzle-kit`
when they ship updated dependencies.

## 9. Stripe billing (Gratis + Pro)

Subscriptions run through the Better Auth Stripe plugin. Stripe owns the money; the app
only reads the `subscription` table it fills from webhooks.

- [ ] Secrets: `wrangler secret put STRIPE_SECRET_KEY` and `wrangler secret put STRIPE_WEBHOOK_SECRET`.
      Start with **test-mode** keys; switch both to live keys at launch.
- [ ] Prices: `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_PRO_YEARLY` in `wrangler.jsonc`
      must match the mode of the secret key (test IDs with test key, live IDs with live key).
      Both live on the same Pro product: $19.99 recurring **monthly** and $199 recurring **yearly**.
      Check the billing period on each price; it cannot be edited after creation.
- [ ] Webhook endpoint in the Stripe dashboard: `https://facturafacilapp.com/api/auth/stripe/webhook`
      with events `checkout.session.completed`, `customer.subscription.created`,
      `customer.subscription.updated`, `customer.subscription.deleted`. Create it separately
      for test and live mode; each has its own signing secret.
- [ ] Customer portal enabled (cancel, update card, switch monthly/yearly).
- [ ] Settings → Billing → Subscriptions and emails → **Customer emails**: turn on
      "Send emails about upcoming renewals" (the Terms promise a reminder before each
      yearly renewal) and "Send emails about expiring cards".
- [ ] Database: run the migration that adds `subscription` and `user.stripe_customer_id`
      (`pnpm db:migrate`) before deploying this version.
- [ ] Kentucky sales tax (6% on SaaS, in-state seller): register for a KY sales and use tax
      permit, activate Stripe Tax with the Louisville origin address, set the Pro product's
      tax code to "SaaS – business use", then set `STRIPE_AUTOMATIC_TAX` to `"true"`.
      Until then leave it `"false"` or Checkout errors.
- [ ] Local testing: `stripe listen --forward-to localhost:3000/api/auth/stripe/webhook --events "checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted"`
      (newer CLI versions require `--events`; keep the quotes, PowerShell splits a bare
      comma list) and card `4242 4242 4242 4242`.

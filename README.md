# spanish-invo

Spanish-first invoicing for small Hispanic-owned service businesses. Owners build invoices
and estimates, then share them over WhatsApp or Messenger (SMS once Twilio approves the
number). No card processing in v1: the invoice shows how to pay (Zelle, Cash App, cash,
Venmo, check) and the owner marks it paid.

## Stack

- TanStack Start (React, file routing, server functions)
- Cloudflare Workers via `@cloudflare/vite-plugin` + Wrangler
- Drizzle ORM + Postgres on Neon, reached through a Cloudflare Hyperdrive binding (postgres.js driver)
- Better Auth (email + password)
- Cloudflare Browser Rendering for PDFs, Cloudflare Email Sending for auth emails, Twilio for SMS fallback

## Setup

```bash
pnpm install
cp .dev.vars.example .dev.vars   # fill in DATABASE_URL, CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE, BETTER_AUTH_SECRET
pnpm cf-typegen                  # generates worker-configuration.d.ts (Env type) from wrangler.jsonc + .dev.vars
pnpm db:generate                 # drizzle migration from src/db/schema.ts
pnpm db:migrate                  # apply to DATABASE_URL (direct Neon connection)
pnpm dev                         # http://localhost:3000 — loads .dev.vars into the process so Hyperdrive dev works
```

Going to production: follow [DEPLOY.md](DEPLOY.md) (domain, secrets, email, legal review, WAF rules).

Cloudflare resources (all prefixed `spanish-invo-`):

| Binding      | Resource                                           |
| ------------ | -------------------------------------------------- |
| `HYPERDRIVE` | Hyperdrive config `spanish-invo-hyperdrive` → Neon |
| `KV`         | KV namespace `spanish-invo-kv`                     |
| `STORAGE`    | R2 bucket `spanish-invo-storage` (logos)           |
| `BROWSER`    | Browser Rendering (PDFs)                           |
| `SEND_EMAIL` | Email Sending (password resets)                    |

Production secrets:

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER
```

Email: password-reset mail goes through the `SEND_EMAIL` binding (Cloudflare Email Sending).
Verify the domain of `EMAIL_FROM` under Email in the Cloudflare dashboard before deploying.
In local dev the binding does not deliver real mail; wrangler logs the message instead.

## AI assistant

"Preguntar a la IA" (⌘K) opens a read-only chat over the owner's own data. It streams
answers and renders the records it looked up as cards (clients, invoices, estimates,
balances, business summary). Side panel or full width; language follows the app.

- Endpoint: `POST /api/ai/chat`, served by the Hono app in `src/worker/` (server.ts forwards
  every `/api/ai/*` request there). Session cookie required; tools are scoped to the user.
- Model: OpenAI via the AI SDK. Key is the `OPENAIAPIKEY` secret; model id is `OPENAI_MODEL`
  in `wrangler.jsonc` (default `gpt-5-mini`).
- Tools live in `src/worker/ai/tools.ts`; the system prompt in `src/worker/ai/instructions.ts`.
- UI: `src/components/assistant/*` on top of AI Elements (`src/components/ai-elements/*`).
- Chat history is saved in Postgres (`ai_conversations`, `ai_messages`) and listed under the
  History button; conversations are per owner.
- Semantic search: one vector per invoice/estimate in the Vectorize index
  `spanish-invo-documents` (Workers AI `@cf/baai/bge-m3` embeddings, filtered by `userId`).
  Documents are indexed on save; `POST /api/ai/reindex` backfills the signed-in owner.

```bash
wrangler secret put OPENAIAPIKEY
```

## Signup emails (Cloudflare Workflow)

`spanish-invo-welcome-email` (`src/workflows/welcome-email.ts`) starts from the Better Auth
"user created" hook: it sends the bilingual welcome email, sleeps one day, and sends an
onboarding reminder only if the business is still not set up. Durable and retried by
Cloudflare; local dev runs it in-process and writes emails to `.wrangler/tmp/email/`.

## Layout

```
src/
  server.ts            Worker entry: creates db (via Hyperdrive) + auth per request, daily overdue cron
  start.tsx            TanStack Start instance + request context types
  db/schema.ts         Drizzle schema (auth tables, settings, clients, invoices, items, events, public tokens)
  db/relations.ts      Drizzle relational-query metadata
  lib/constants.ts     Enum sources of truth (statuses, languages, payment methods, timezones)
  lib/auth.ts          Better Auth server instance
  lib/validators/      zod schemas shared by server functions and forms
  middlewares/         dependency + auth middleware for server functions
  data/                server functions + TanStack Query options, grouped by feature
```

## Build order

1. Scaffold, auth, settings/onboarding ← current
2. Clients CRUD
3. Invoice builder + totals
4. Public invoice page + PDF
5. WhatsApp share + Twilio SMS
6. Mark as paid + dashboard
7. Estimates → invoices

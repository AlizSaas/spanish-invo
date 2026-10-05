import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Wrangler keeps local secrets in .dev.vars; drizzle-kit reads them from here too.
config({ path: ['.dev.vars', '.env.local', '.env'] })

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy .dev.vars.example to .dev.vars and fill it in.',
  )
}

export default defineConfig({
  out: './drizzle',
  schema: ['./src/db/schema.ts'],
  dialect: 'postgresql',
  dbCredentials: { url },
})

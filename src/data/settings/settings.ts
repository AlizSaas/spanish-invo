import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import type { Database } from '@/db'
import { settings } from '@/db/schema'
import { authMiddleware } from '@/middlewares/dependencies'
import {
  onboardingSchema,
  updateSettingsSchema,
} from '@/lib/validators/settings'

/** Returns the owner's settings row, creating it with Spanish/US defaults on first call. */
async function getOrCreateSettings(db: Database, userId: string) {
  const existing = await db.query.settings.findFirst({
    where: eq(settings.userId, userId),
  })
  if (existing) return existing

  const inserted = await db
    .insert(settings)
    .values({ userId })
    .onConflictDoNothing({ target: settings.userId })
    .returning()
  if (inserted.length > 0) return inserted[0]

  // A concurrent request created the row first (onConflictDoNothing returned no rows).
  const row = await db.query.settings.findFirst({
    where: eq(settings.userId, userId),
  })
  if (!row) throw new Error(`Settings row missing for user ${userId}`)
  return row
}

export const getSettingsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return getOrCreateSettings(context.db, context.user.id)
  })

/** First-run wizard: business name, logo, currency, timezone, payment instructions. */
export const completeOnboardingFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(onboardingSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    await getOrCreateSettings(db, user.id)

    // logoUrl is deliberately not taken from the form: /api/settings/logo
    // writes it when a file is uploaded or removed.
    const [updated] = await db
      .update(settings)
      .set({
        businessName: data.businessName,
        businessPhone: data.businessPhone ?? null,
        defaultCurrency: data.defaultCurrency,
        timezone: data.timezone,
        locale: data.locale,
        defaultInvoiceLanguage: data.locale,
        paymentInstructions: data.paymentInstructions,
        onboardingCompletedAt: new Date(),
      })
      .where(eq(settings.userId, user.id))
      .returning()

    return updated
  })

export const updateSettingsFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(updateSettingsSchema)
  .handler(async ({ context, data }) => {
    const { db, user } = context
    await getOrCreateSettings(db, user.id)

    // Drop undefined keys so a partial form never nulls out untouched columns.
    const { defaultTaxRate, businessEmail, ...rest } = data
    const patch = Object.fromEntries(
      Object.entries(rest as Record<string, unknown>).filter(
        ([, v]) => v !== undefined,
      ),
    ) as Partial<typeof settings.$inferInsert>
    // The logo is owned by /api/settings/logo; a form must not set it to an arbitrary URL.
    delete patch.logoUrl

    // numeric columns travel as strings in Drizzle
    if (defaultTaxRate !== undefined)
      patch.defaultTaxRate = defaultTaxRate.toFixed(2)
    if (businessEmail !== undefined)
      patch.businessEmail = businessEmail === '' ? null : businessEmail

    const [updated] = await db
      .update(settings)
      .set(patch)
      .where(eq(settings.userId, user.id))
      .returning()

    return updated
  })

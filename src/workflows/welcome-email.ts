import { WorkflowEntrypoint } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import type { Language } from '@/lib/constants'
import { createDb } from '@/db'
import { settings } from '@/db/schema'
import { DEFAULT_LANGUAGE } from '@/lib/constants'
import { sendEmail } from '@/lib/email'
import { onboardingReminderEmail, welcomeEmail } from '@/lib/email-templates'

export interface WelcomeEmailParams {
  userId: string
  email: string
  name: string
  /** UI language at signup. Optional: instances queued before it existed. */
  language?: Language
}

/**
 * spanish-invo-welcome-email
 * Started from the Better Auth "user created" hook. Durable: each step is
 * retried and checkpointed by Cloudflare Workflows, and the day-long sleep
 * costs nothing while waiting.
 */
export class WelcomeEmailWorkflow extends WorkflowEntrypoint<
  Env,
  WelcomeEmailParams
> {
  async run(event: WorkflowEvent<WelcomeEmailParams>, step: WorkflowStep) {
    const { userId, email, name } = event.payload
    const language = event.payload.language ?? DEFAULT_LANGUAGE
    const env = this.env
    const appUrl = env.BETTER_AUTH_URL.replace(/\/$/, '')

    await step.do(
      'send welcome email',
      { retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' } },
      async () => {
        await sendEmail(env, {
          to: email,
          ...welcomeEmail({ appName: env.APP_NAME, name, appUrl, language }),
        })
      },
    )

    await step.sleep('wait a day before nudging', '1 day')

    const onboarded = await step.do('check onboarding', async () => {
      const db = createDb(env.HYPERDRIVE.connectionString)
      const row = await db.query.settings.findFirst({
        where: eq(settings.userId, userId),
        columns: { onboardingCompletedAt: true },
      })
      return Boolean(row?.onboardingCompletedAt)
    })

    if (!onboarded) {
      await step.do(
        'send onboarding reminder',
        { retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' } },
        async () => {
          await sendEmail(env, {
            to: email,
            ...onboardingReminderEmail({
              appName: env.APP_NAME,
              name,
              appUrl,
              language,
            }),
          })
        },
      )
    }

    return { onboarded }
  }
}

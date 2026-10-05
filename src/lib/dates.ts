/**
 * Document dates (issue / due) are calendar dates, not instants. We store them
 * at 12:00 UTC so they render as the same calendar day in every US time zone.
 */

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export function dateOnlyToDb(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T12:00:00.000Z`)
}

export function dbToDateOnly(d: Date | string): string {
  return (typeof d === 'string' ? new Date(d) : d).toISOString().slice(0, 10)
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(yyyyMmDd: string, days: number): string {
  const d = dateOnlyToDb(yyyyMmDd)
  d.setUTCDate(d.getUTCDate() + days)
  return dbToDateOnly(d)
}

/** A document is past due once the day after its due date has started. */
export function isPastDue(dueDate: Date | string): boolean {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  return Date.now() - due.getTime() > 24 * 60 * 60 * 1000
}

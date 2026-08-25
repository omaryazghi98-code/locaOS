/**
 * Rental time policy. Business durations are calculated centrally so quotes,
 * contracts, alerts, and UI do not invent their own day-count rules.
 *
 * Instants remain UTC in storage. The timezone is carried for rendering and for
 * future wall-clock/DST-sensitive policies; the default billing policy is a
 * 24-hour rental period with configurable grace minutes.
 */
export interface RentalTimePolicy {
  minimumDays: number;
  graceMinutes: number;
}

export interface RentalTimeResult {
  elapsedMs: number;
  elapsedHours: number;
  billableDays: number;
  graceUsed: boolean;
  overdue: boolean;
}

export const DEFAULT_RENTAL_TIME_POLICY: RentalTimePolicy = {
  minimumDays: 1,
  graceMinutes: 120,
};

export function calculateRentalTime(
  pickupAt: Date,
  returnAt: Date,
  policy: RentalTimePolicy = DEFAULT_RENTAL_TIME_POLICY,
  now: Date = new Date(),
): RentalTimeResult {
  const elapsedMs = returnAt.getTime() - pickupAt.getTime();
  if (elapsedMs <= 0) {
    throw new RangeError('Return time must be after pickup time');
  }
  if (policy.minimumDays < 1 || policy.graceMinutes < 0) {
    throw new RangeError('Invalid rental time policy');
  }

  const elapsedHours = elapsedMs / 3_600_000;
  const wholeDays = Math.floor(elapsedHours / 24);
  const remainderMinutes = (elapsedHours - wholeDays * 24) * 60;
  const graceUsed = wholeDays === 0 || remainderMinutes >= policy.graceMinutes;
  const billableDays = Math.max(
    policy.minimumDays,
    wholeDays + (graceUsed ? 1 : 0),
  );

  return {
    elapsedMs,
    elapsedHours,
    billableDays,
    graceUsed,
    overdue: now.getTime() > returnAt.getTime(),
  };
}

export function formatInAgencyTime(instant: Date, timeZone: string, locale = 'fr-MA'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(instant);
}

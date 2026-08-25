import { describe, expect, it } from 'vitest';
import { calculateRentalTime, formatInAgencyTime } from './time.js';

describe('rental time engine', () => {
  it('bills an exact ten-day rental as ten days', () => {
    const pickup = new Date('2026-08-25T14:00:00.000Z');
    const returned = new Date('2026-09-04T14:00:00.000Z');
    expect(calculateRentalTime(pickup, returned).billableDays).toBe(10);
  });

  it('uses the configured grace period for a partial final day', () => {
    const pickup = new Date('2026-08-25T14:00:00.000Z');
    const returned = new Date('2026-08-26T15:30:00.000Z');
    expect(calculateRentalTime(pickup, returned, { minimumDays: 1, graceMinutes: 120 }).billableDays).toBe(1);
    expect(calculateRentalTime(pickup, returned, { minimumDays: 1, graceMinutes: 60 }).billableDays).toBe(2);
  });

  it('does not hide an overdue return behind the day-count calculation', () => {
    const pickup = new Date('2026-08-25T14:00:00.000Z');
    const returned = new Date('2026-08-26T14:00:00.000Z');
    const now = new Date('2026-08-27T14:00:00.000Z');
    expect(calculateRentalTime(pickup, returned, undefined, now).overdue).toBe(true);
  });

  it('renders an instant in the agency timezone', () => {
    const instant = new Date('2026-08-25T12:30:00.000Z');
    expect(formatInAgencyTime(instant, 'Africa/Casablanca', 'fr-MA')).toContain('25/08/2026');
  });
});

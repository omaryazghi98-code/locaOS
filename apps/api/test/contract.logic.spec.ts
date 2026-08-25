import { describe, expect, it } from 'vitest';
import { rentalDaysFromPeriod } from '../src/modules/contracts/contracts.service.js';

describe('contract rental-day logic', () => {
  it('derives a ten-day rental from exact ten-day timestamps', () => {
    expect(rentalDaysFromPeriod(
      new Date('2026-08-25T15:51:00.000Z'),
      new Date('2026-09-04T15:51:00.000Z'),
    )).toBe(10);
  });

  it('rounds a partial 24-hour period up to one billable day', () => {
    expect(rentalDaysFromPeriod(
      new Date('2026-08-25T15:51:00.000Z'),
      new Date('2026-08-26T12:00:00.000Z'),
    )).toBe(1);
  });

  it('rejects an invalid period', () => {
    expect(() => rentalDaysFromPeriod(
      new Date('2026-08-26T12:00:00.000Z'),
      new Date('2026-08-25T12:00:00.000Z'),
    )).toThrow('Période de location invalide');
  });
});

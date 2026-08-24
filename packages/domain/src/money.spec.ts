import { describe, expect, it } from 'vitest';
import { computeQuote } from './pricing.js';
import { formatMoney, parseAmountInput, rentalDays, sumAmounts, toMadEquivalent } from './money.js';

describe('money', () => {
  it('parses French-style amount input to centimes', () => {
    expect(parseAmountInput('1 234,50')).toBe(123450n);
    expect(parseAmountInput('450')).toBe(45000n);
    expect(parseAmountInput('0,99')).toBe(99n);
    expect(() => parseAmountInput('12,34,5')).toThrow();
    expect(() => parseAmountInput('abc')).toThrow();
  });

  it('converts EUR to MAD equivalent deterministically', () => {
    expect(toMadEquivalent(100_00n, 10.85)).toBe(1085_00n);
    expect(() => toMadEquivalent(100n, 0)).toThrow();
    expect(() => toMadEquivalent(100n, -1)).toThrow();
  });

  it('sums bigint amounts', () => {
    expect(sumAmounts([1, 2n, 3])).toBe(6n);
  });

  it('formats MAD in fr-MA', () => {
    const s = formatMoney(123450n, 'MAD');
    expect(s).toMatch(/1[.\s\u202f]?234,50/);
  });

  it('rental days with grace', () => {
    const d = (days: number, hours = 0) => new Date(2026, 7, 20, 10, 0 + 0, 0).getTime() + 0 + days * 86400000 + hours * 3600000;
    expect(rentalDays(new Date(d(0)), new Date(d(3)))).toBe(3);
    expect(rentalDays(new Date(d(0)), new Date(d(2, 1)))).toBe(2);   // 1h remainder < grace
    expect(rentalDays(new Date(d(0)), new Date(d(2, 3)))).toBe(3);   // 3h remainder ≥ grace
    expect(rentalDays(new Date(d(0)), new Date(d(0, 1)))).toBe(1);   // minimum
  });
});

describe('quote computation', () => {
  const base = {
    dailyRate: 350_00n,
    pickupAt: new Date('2026-08-20T10:00:00Z'),
    returnAt: new Date('2026-08-23T10:00:00Z'),
    depositAmount: 5000_00n,
  };

  it('computes rental + extras + total', () => {
    const q = computeQuote({ ...base, deliveryFee: 150_00n, extras: [{ code: 'GPS', label: 'GPS', unitAmount: 50_00n, qty: 3 }] });
    expect(q.days).toBe(3);
    expect(q.total).toBe(350_00n * 3n + 150_00n + 50_00n * 3n);
    expect(q.depositRequired).toBe(5000_00n);
  });

  it('applies discount as a separate line value', () => {
    const q = computeQuote({ ...base, discountPercent: 10 });
    expect(q.discount).toBe(105_00n); // 10% of 1050.00
    expect(q.total).toBe(945_00n);
  });

  it('flags below-floor pricing (MAP)', () => {
    const q = computeQuote({ ...base, floorDailyRate: 400_00n });
    expect(q.belowFloor).toBe(true);
    const ok = computeQuote({ ...base, floorDailyRate: 300_00n });
    expect(ok.belowFloor).toBe(false);
  });
});

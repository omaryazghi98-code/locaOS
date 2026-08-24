/**
 * Money — integer centimes only. Floats never touch money paths (ADR-0008).
 * Amounts are bigint-safe; JSON transport uses string.
 */
export const CURRENCIES = ['MAD', 'EUR', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export type MoneyAmount = { amount: number | bigint; currency: Currency }; // amount = centimes

export function assertCurrency(c: string): asserts c is Currency {
  if (!(CURRENCIES as readonly string[]).includes(c)) {
    throw new MoneyError(`Unsupported currency: ${c}`);
  }
}

export class MoneyError extends Error {}

/** Multiply a foreign-currency centimes amount by a MAD-per-unit rate (human-confirmed). */
export function toMadEquivalent(amountCents: bigint, rate: number): bigint {
  if (!(rate > 0) || !Number.isFinite(rate)) throw new MoneyError('FX rate must be > 0');
  return BigInt(Math.round(Number(amountCents) * rate));
}

/** Parse user input "1 234,50" / "1234.50" → centimes. Throws MoneyError on junk. */
export function parseAmountInput(input: string): bigint {
  const cleaned = input.replace(/\s/gu, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new MoneyError(`Invalid amount: ${input}`);
  const [whole, frac = ''] = cleaned.split('.');
  const cents = frac.padEnd(2, '0');
  return BigInt(whole + cents);
}

export function formatMoney(amount: number | bigint, currency: Currency | string, locale = 'fr-MA'): string {
  const value = Number(amount) / 100;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** Daily rate × days with grace: partial last day counts if >= 2 hours (agency practice, configurable upstream). */
export function rentalDays(from: Date, to: Date, minDays = 1, graceHours = 2): number {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return minDays;
  const days = ms / 86_400_000;
  const rounded = Math.floor(days);
  const remainderHours = (days - rounded) * 24;
  return Math.max(minDays, remainderHours >= graceHours ? rounded + 1 : Math.max(rounded, 1));
}

export function sumAmounts(amounts: (number | bigint)[]): bigint {
  return amounts.reduce<bigint>((acc, a) => acc + BigInt(a), 0n);
}

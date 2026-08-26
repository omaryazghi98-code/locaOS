import type { ContractContent } from './contract.js';

function cents(value: string | null): bigint {
  if (value == null || value === '') return 0n;
  const normalized = value.replace(',', '.');
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2) || '0');
}

function money(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const abs = value < 0n ? -value : value;
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

/** Recomputes serialized contract pricing from its immutable line snapshot. */
export function recalculateContractPricing(
  pricing: ContractContent['pricing'],
  options: { days?: number; dailyRate?: string } = {},
): ContractContent['pricing'] {
  const lines = [...(pricing.lines ?? [])];
  const rental = lines.find((line) => line.code === 'RENTAL');
  const days = Math.max(1, options.days ?? Number(pricing.days ?? rental?.qty ?? 1));
  const dailyRate = options.dailyRate ?? pricing.dailyRate ?? rental?.unitAmount ?? '0';

  const nextLines = lines.length > 0
    ? lines.map((line) => {
        if (line.code !== 'RENTAL') return line;
        const total = cents(dailyRate) * BigInt(days);
        return { ...line, qty: days, unitAmount: dailyRate, total: money(total) };
      })
    : [{ code: 'RENTAL', label: `Location (${days} j)`, qty: days, unitAmount: dailyRate, total: money(cents(dailyRate) * BigInt(days)) }];

  const subtotal = nextLines.reduce((sum, line) => sum + cents(line.total), 0n);
  const discount = cents(pricing.discount);
  return {
    ...pricing,
    lines: nextLines,
    dailyRate,
    days: String(days),
    subtotal: money(subtotal),
    total: money(subtotal - discount),
  };
}

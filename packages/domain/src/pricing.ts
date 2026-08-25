/**
 * Deterministic, versioned quote computation (pure function of its inputs).
 * The Quote row persists inputs + output so any price can be explained later.
 */
import { calculateRentalTime } from './time.js';

export interface QuoteLine {
  code: string;            // RENTAL | DELIVERY | EXTRA_<code> | DISCOUNT
  label: string;
  qty: number;
  unitAmount: bigint;      // centimes
  total: bigint;            // centimes
}

export interface QuoteInput {
  dailyRate: bigint;       // centimes/day
  floorDailyRate?: bigint; // MAP floor (config per category) — quotes below warn
  pickupAt: Date;
  returnAt: Date;
  extras?: { code: string; label: string; unitAmount: bigint; qty: number }[];
  deliveryFee?: bigint;
  discountPercent?: number; // 0–100, requires permission upstream
  depositAmount: bigint;
}

export interface QuoteOutput {
  lines: QuoteLine[];
  days: number;
  subtotal: bigint;
  discount: bigint;
  total: bigint;
  depositRequired: bigint;
  belowFloor: boolean;
}

export function computeQuote(input: QuoteInput): QuoteOutput {
  const days = calculateRentalTime(input.pickupAt, input.returnAt).billableDays;
  const lines: QuoteLine[] = [];
  const rentalTotal = input.dailyRate * BigInt(days);
  lines.push({ code: 'RENTAL', label: `Location (${days} j)`, qty: days, unitAmount: input.dailyRate, total: rentalTotal });
  let subtotal = rentalTotal;
  if (input.deliveryFee && input.deliveryFee > 0n) {
    lines.push({ code: 'DELIVERY', label: 'Livraison / livraison-retour', qty: 1, unitAmount: input.deliveryFee, total: input.deliveryFee });
    subtotal += input.deliveryFee;
  }
  for (const e of input.extras ?? []) {
    const total = e.unitAmount * BigInt(Math.max(1, e.qty));
    lines.push({ code: `EXTRA_${e.code}`, label: e.label, qty: e.qty, unitAmount: e.unitAmount, total });
    subtotal += total;
  }
  let discount = 0n;
  if (input.discountPercent && input.discountPercent > 0) {
    discount = BigInt(Math.round(Number(subtotal) * (input.discountPercent / 100)));
  }
  const total = subtotal - discount;
  const belowFloor = input.floorDailyRate !== undefined && input.dailyRate < input.floorDailyRate;
  return { lines, days, subtotal, discount, total, depositRequired: input.depositAmount, belowFloor };
}

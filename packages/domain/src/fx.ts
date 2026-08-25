import type { Currency } from './money.js';

export const FX_SOURCES = [
  'BANK_AL_MAGHRIB_REFERENCE',
  'AGENCY_MANUAL',
  'CARD_PROCESSOR',
  'PROVIDER_REFERENCE',
] as const;
export type FxSource = (typeof FX_SOURCES)[number];

export interface FxRateSnapshot {
  base: 'MAD';
  quote: Currency;
  rateMadPerUnit: string;
  source: FxSource;
  observedAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export function foreignAmountForMad(madMinorUnits: bigint, rateMadPerUnit: number): bigint {
  if (!(rateMadPerUnit > 0) || !Number.isFinite(rateMadPerUnit)) {
    throw new RangeError('FX rate must be > 0');
  }
  return BigInt(Math.round(Number(madMinorUnits) / rateMadPerUnit));
}

export function madEquivalentForForeign(foreignMinorUnits: bigint, rateMadPerUnit: number): bigint {
  if (!(rateMadPerUnit > 0) || !Number.isFinite(rateMadPerUnit)) {
    throw new RangeError('FX rate must be > 0');
  }
  return BigInt(Math.round(Number(foreignMinorUnits) * rateMadPerUnit));
}

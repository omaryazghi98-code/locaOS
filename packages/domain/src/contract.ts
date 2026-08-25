/**
 * Contract engine domain types (ADR-0007).
 * Content is structured JSON — never hand-assembled HTML. Renderers live in the API.
 */
import { z } from 'zod';

export const CONTRACT_LANGUAGES = ['fr', 'ar', 'en'] as const;
export type ContractLanguage = (typeof CONTRACT_LANGUAGES)[number];

export const CONTRACT_STATUSES = [
  'BLANK_ISSUED', 'DRAFT', 'SIGNED', 'ACTIVE', 'CLOSED', 'AMENDED', 'VOIDED',
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const AMENDMENT_KINDS = ['VEHICLE_REPLACEMENT', 'PERIOD', 'DRIVER', 'PRICE', 'OTHER'] as const;
export type AmendmentKind = (typeof AMENDMENT_KINDS)[number];

const empty = z.string().nullable();
const optionalEmpty = empty.default(null);

export const InsuranceBlock = z.object({
  franchiseAmount: z.preprocess((v) => (typeof v === 'string' ? BigInt(v) : v), z.bigint().nullable()),
  cdw: z.boolean().nullable(),
  superCdw: z.boolean().nullable(),
  exclusions: z.array(z.string()).nullable(),
});
export type InsuranceBlock = z.infer<typeof InsuranceBlock>;

export const CrossBorderBlock = z.object({
  authorized: z.boolean().nullable(),
  zones: z.array(z.string()).nullable(),
  admissionTemporaireRef: empty,
});

const Snapshot = z.object({
  capturedAt: z.string(),
  reservationId: empty,
  quoteId: empty,
  quoteVersion: optionalEmpty,
  departureInspectionId: empty,
  returnInspectionId: empty,
});

export const ContractContent = z.object({
  header: z.object({
    agencyName: z.string(),
    agencyIce: z.string().nullable(),
    branchName: z.string().nullable(),
    contractNumber: z.string(),
    issuedAt: z.string().nullable(),
    language: z.enum(CONTRACT_LANGUAGES),
    mode: z.enum(['FULL', 'BLANK']),
  }),
  // Defaults keep historical contract_versions readable after the snapshot schema was tightened.
  snapshot: Snapshot.default({
    capturedAt: '', reservationId: null, quoteId: null, quoteVersion: null,
    departureInspectionId: null, returnInspectionId: null,
  }),
  customer: z.object({
    name: empty, cinOrPassport: empty, licenseNumber: empty, licenseIssuedOn: empty,
    phone: empty, email: empty, address: empty, birthDate: empty,
  }),
  drivers: z.array(z.object({ name: empty, licenseNumber: empty, birthDate: empty })).nullable(),
  vehicle: z.object({
    plate: empty, makeModel: empty, category: empty, mileageOut: empty, fuelOut: empty,
    vin: empty,
  }),
  period: z.object({ pickupAt: empty, returnAt: empty, days: empty, pickupBranch: empty, returnBranch: empty }),
  pricing: z.object({
    subtotal: optionalEmpty, dailyRate: empty, days: empty, discount: empty, total: empty, currency: z.string().default('MAD'),
  }),
  deposit: z.object({ amount: empty, method: empty, status: optionalEmpty, heldAt: empty }),
  insurance: InsuranceBlock,
  crossBorder: CrossBorderBlock,
  mileageFuel: z.object({
    mileageOut: empty, mileageIn: empty, fuelOut: empty, fuelIn: empty,
    extraKmRate: empty, includedKmPerDay: empty,
  }),
  references: z.object({
    reservationId: empty, quoteId: empty, departureInspectionId: empty, returnInspectionId: empty,
  }),
  consents: z.array(z.object({ purpose: z.string(), granted: z.boolean().nullable() })).nullable(),
  signatures: z.object({
    customer: z.object({ present: z.boolean(), name: empty, at: empty }),
    agent: z.object({ present: z.boolean(), name: empty, at: empty }),
  }),
});
export type ContractContent = z.infer<typeof ContractContent>;

/** Deterministic per-agency numbering: <PREFIX>-<YEAR>-<SEQ 5 digits> (DB sequence is the authority). */
export function formatContractNumber(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
}

/** Blank Slate: same schema, every designated handwriting field empty. */
export function blankContractContent(args: {
  agencyName: string; agencyIce: string | null; branchName: string | null;
  contractNumber: string; language: ContractLanguage;
}): ContractContent {
  const b = (v: string | null = null) => v;
  const capturedAt = new Date().toISOString();
  return ContractContent.parse({
    header: { ...args, issuedAt: capturedAt, mode: 'BLANK' },
    snapshot: {
      capturedAt, reservationId: b(), quoteId: b(), quoteVersion: null,
      departureInspectionId: b(), returnInspectionId: b(),
    },
    customer: { name: b(), cinOrPassport: b(), licenseNumber: b(), licenseIssuedOn: b(), phone: b(), email: b(), address: b(), birthDate: b() },
    drivers: [],
    vehicle: { plate: b(), makeModel: b(), category: b(), mileageOut: b(), fuelOut: b(), vin: b() },
    period: { pickupAt: b(), returnAt: b(), days: b(), pickupBranch: b(), returnBranch: b() },
    pricing: { subtotal: b(), dailyRate: b(), days: b(), discount: b(), total: b(), currency: 'MAD' },
    deposit: { amount: b(), method: b(), status: b(), heldAt: b() },
    insurance: { franchiseAmount: null, cdw: null, superCdw: null, exclusions: null },
    crossBorder: { authorized: null, zones: null, admissionTemporaireRef: b() },
    mileageFuel: { mileageOut: b(), mileageIn: b(), fuelOut: b(), fuelIn: b(), extraKmRate: b(), includedKmPerDay: b() },
    references: { reservationId: b(), quoteId: b(), departureInspectionId: b(), returnInspectionId: b() },
    consents: [],
    signatures: { customer: { present: false, name: b(), at: b() }, agent: { present: false, name: b(), at: b() } },
  });
}

export const BLANK_RECONCILE_DEADLINE_HOURS = 72;

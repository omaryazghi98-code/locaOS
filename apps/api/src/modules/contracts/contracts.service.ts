/**
 * Contract engine service (ADR-0007 + research reconciliation §2):
 * numbering authority (row-locked sequence), structured assembly, immutable versions,
 * Blank Slate lifecycle (issue → print → reconcile/void), amendments with liability
 * continuity on vehicle replacement.
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  blankContractContent, ContractContent, formatContractNumber, type ContractLanguage,
} from '@locaos/domain';
import { type Tx } from '../../db/client';
import {
  agencies, branches, contractSequences, contractVersions, contracts,
  customers, deposits, identityDocuments, quotes, reservations,
  vehicleCategories, vehicleModels, vehicles,
} from '../../db/schema.js';
import { contentHash } from '../crypto/crypto.js';

/** Row-locked per-agency sequence — the single numbering authority. */
export async function nextContractNumber(tx: Tx, agencyId: string): Promise<{ number: number; formatted: string }> {
  const rows = await tx.select().from(contractSequences).where(eq(contractSequences.agencyId, agencyId)).for('update');
  if (!rows[0]) {
    await tx.insert(contractSequences).values({ agencyId, nextValue: 2 }).onConflictDoNothing();
    return { number: 1, formatted: formatContractNumber('L', new Date().getFullYear(), 1) };
  }
  const number = rows[0].nextValue;
  await tx.update(contractSequences).set({ nextValue: number + 1 }).where(eq(contractSequences.agencyId, agencyId));
  const a = await tx.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
  const prefix = a[0]?.contractPrefix ?? 'L';
  return { number, formatted: formatContractNumber(prefix, new Date().getFullYear(), number) };
}

export async function newVersion(tx: Tx, agencyId: string, contractId: string, content: ContractContent, userId: string): Promise<string> {
  const last = await tx.select({ v: contractVersions.version }).from(contractVersions)
    .where(eq(contractVersions.contractId, contractId)).orderBy(desc(contractVersions.version)).limit(1);
  const version = (last[0]?.v ?? 0) + 1;
  const id = globalThis.crypto.randomUUID();
  await tx.insert(contractVersions).values({
    id, agencyId, contractId, version, content: JSON.parse(JSON.stringify(content)) as never,
    contentHash: contentHash(content), createdBy: userId,
  });
  await tx.update(contracts).set({ currentVersionId: id, updatedAt: new Date() }).where(eq(contracts.id, contractId));
  return id;
}

export interface AssemblyData {
  agencyName: string; agencyIce: string | null; branchName: string | null;
  agency?: unknown;
  reservation: typeof reservations.$inferSelect | null;
  customer: typeof customers.$inferSelect;
  identityDocs: (typeof identityDocuments.$inferSelect)[];
  vehicle: typeof vehicles.$inferSelect | null;
  vehicleModel: typeof vehicleModels.$inferSelect | null;
  category: typeof vehicleCategories.$inferSelect | null;
  quote: typeof quotes.$inferSelect | null;
  deposit: typeof deposits.$inferSelect | null;
  branchOut: typeof branches.$inferSelect | null;
  branchIn: typeof branches.$inferSelect | null;
  contractNumber: string; language: ContractLanguage; mode: 'FULL' | 'BLANK';
  [extra: string]: unknown;
}

const masked = (docs: AssemblyData['identityDocs'], type: string) =>
  docs.find((d) => d.type === type)?.numberLast4 ? `••••••${docs.find((d) => d.type === type)!.numberLast4}` : null;

export function assembleContent(data: AssemblyData): ContractContent {
  const c = blankContractContent({
    agencyName: data.agencyName, agencyIce: data.agencyIce, branchName: data.branchName,
    contractNumber: data.contractNumber, language: data.language,
  });
  if (data.mode === 'BLANK') return c;

  const r = data.reservation;
  const cust = data.customer;
  const q = data.quote;
  const v = data.vehicle;
  const d = data.deposit;

  c.header.mode = 'FULL';
  c.customer = {
    name: [cust.firstName, cust.lastName].filter(Boolean).join(' ') || cust.companyName || null,
    cinOrPassport: masked(data.identityDocs, 'CIN') ?? masked(data.identityDocs, 'PASSPORT'),
    licenseNumber: masked(data.identityDocs, 'DRIVER_LICENSE'),
    licenseIssuedOn: data.identityDocs.find((x) => x.type === 'DRIVER_LICENSE')?.issueDate ?? null,
    phone: cust.phone, email: cust.email, address: null,
    birthDate: data.identityDocs.find((x) => x.type === 'CIN')?.issueDate ?? null,
  };
  if (v && data.vehicleModel && data.category) {
    c.vehicle = {
      plate: v.plate, makeModel: `${data.vehicleModel.make} ${data.vehicleModel.model} (${data.vehicleModel.year})`,
      category: data.category.name, mileageOut: String(v.currentMileageKm),
      fuelOut: `${v.fuelLevelPct}%`, vin: v.vin,
    };
  }
  if (r) {
    c.period = {
      pickupAt: r.pickupAt.toISOString(), returnAt: r.returnAt.toISOString(),
      days: q ? String(q.days) : null,
      pickupBranch: data.branchOut?.name ?? null, returnBranch: data.branchIn?.name ?? null,
    };
  }
  if (q) {
    const inputs = q.inputs as { dailyRate?: string };
    c.pricing = {
      dailyRate: inputs.dailyRate ? String(Number(inputs.dailyRate) / 100) : null,
      days: String(q.days),
      discount: String(Number(q.discount) / 100),
      total: String(Number(q.total) / 100),
      currency: 'MAD',
    };
  }
  if (d) {
    c.deposit = { amount: String(Number(d.amount) / 100), method: d.method, heldAt: d.heldBy ? d.createdAt.toISOString() : null };
  }
  // Insurance block — agency practice defaults (configurable upstream; not legal advice)
  c.insurance = { franchiseAmount: 8_000_00n, cdw: true, superCdw: false, exclusions: ['Pneumatiques', 'Glace', 'Sous-bassement'] };
  c.crossBorder = { authorized: false, zones: ['Ceuta', 'Melilla', 'Tanger Med'], admissionTemporaireRef: null };
  if (r) {
    c.references.reservationId = r.id;
    c.references.quoteId = r.quoteId;
  }
  c.consents = [
    { purpose: 'GPS_TRACKING', granted: false },
    { purpose: 'MARKETING', granted: false },
    { purpose: 'DATA_PROCESSING', granted: true },
  ];
  return ContractContent.parse(c);
}

export async function loadContract(tx: Tx, agencyId: string, contractId: string) {
  const rows = await tx.select().from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.agencyId, agencyId))).limit(1);
  if (!rows[0]) throw new NotFoundException('Contrat introuvable');
  return rows[0];
}

export async function loadVersionContent(tx: Tx, contractId: string, versionId: string | null): Promise<ContractContent> {
  const rows = versionId
    ? await tx.select().from(contractVersions).where(eq(contractVersions.id, versionId)).limit(1)
    : await tx.select().from(contractVersions).where(eq(contractVersions.contractId, contractId)).orderBy(desc(contractVersions.version)).limit(1);
  if (!rows[0]) throw new NotFoundException('Version introuvable');
  return ContractContent.parse(rows[0].content);
}

export { sql };

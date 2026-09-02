import { and, eq } from 'drizzle-orm';
import { calculateSettlement, type ContractContent, type SettlementResult } from '@locaos/domain';
import { contracts, damages, depositCharges, deposits, inspections, payments } from '../../db/schema.js';
import type { Tx } from '../../db/client.js';

export class SettlementAssemblyError extends Error {}

type SettlementAssembly = {
  settlement: SettlementResult;
  returnInspectionId: string;
  unresolvedDamageIds: string[];
  depositStatus: string | null;
};

/**
 * Builds the authoritative close-time settlement from the contract snapshot plus
 * return-time financial evidence. Dynamic charges that do not yet have a stored
 * policy/source are deliberately not invented here.
 */
export async function assembleContractSettlement(
  tx: Tx,
  agencyId: string,
  contract: typeof contracts.$inferSelect,
  content: ContractContent,
): Promise<SettlementAssembly> {
  if (!contract.currentVersionId) throw new SettlementAssemblyError('Le contrat ne possède pas de version courante');
  if (!contract.vehicleId) throw new SettlementAssemblyError('Le contrat ne possède pas de véhicule');

  const returnInspections = await tx.select().from(inspections)
    .where(and(
      eq(inspections.agencyId, agencyId),
      eq(inspections.contractId, contract.id),
      eq(inspections.kind, 'RETURN'),
    ));
  if (!returnInspections.length) throw new SettlementAssemblyError('Inspection retour obligatoire avant décompte final');
  const returnInspection = returnInspections.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0]!;

  const deposit = contract.depositId
    ? (await tx.select().from(deposits)
      .where(and(eq(deposits.id, contract.depositId), eq(deposits.agencyId, agencyId))).limit(1))[0] ?? null
    : null;

  const charges = deposit
    ? await tx.select().from(depositCharges)
      .where(and(eq(depositCharges.depositId, deposit.id), eq(depositCharges.agencyId, agencyId)))
    : [];

  const returnDamages = await tx.select().from(damages)
    .where(and(
      eq(damages.agencyId, agencyId),
      eq(damages.vehicleId, contract.vehicleId),
      eq(damages.discoveredInspectionId, returnInspection.id),
    ));
  const unresolvedDamageIds = returnDamages
    .filter((damage) => !damage.preexisting && damage.resolution === 'NONE')
    .map((damage) => damage.id);

  const pricingLines = content.pricing.lines.map((line) => ({
    code: line.code,
    label: line.label,
    kind: settlementKind(line.code),
    amount: parseMajorAmount(line.total ?? '0'),
  }));

  const damageLines = charges.map((charge) => ({
    code: charge.damageId ? 'DAMAGE' : 'DEPOSIT_CHARGE',
    label: charge.reason,
    kind: charge.damageId ? ('DAMAGE' as const) : ('OTHER' as const),
    amount: charge.amount,
    sourceId: charge.id,
  }));

  const paymentRows = await tx.select().from(payments)
    .where(and(eq(payments.contractId, contract.id), eq(payments.agencyId, agencyId)));

  const depositPaymentIds = new Set(charges.map((charge) => charge.paymentId).filter((id): id is string => Boolean(id)));
  const settlementPayments = paymentRows.map((payment) => {
    const settlementAmount = payment.currency === content.pricing.currency
      ? payment.amount
      : payment.madEquivalent ?? undefined;
    if (payment.currency !== content.pricing.currency && settlementAmount == null) {
      throw new SettlementAssemblyError(`Paiement ${payment.id} sans équivalent ${content.pricing.currency}`);
    }
    return {
      id: payment.id,
      amount: payment.amount,
      direction: payment.direction,
      currency: payment.currency,
      settlementAmount,
      purpose: payment.purpose,
      reversesPaymentId: payment.reversesPaymentId,
      countsTowardCharges: !depositPaymentIds.has(payment.id),
    };
  });

  const chargedAmount = charges.reduce((sum, charge) => sum + charge.amount, 0n);
  const settlement = calculateSettlement({
    currency: content.pricing.currency,
    lines: [...pricingLines, ...damageLines],
    payments: settlementPayments,
    deposit: deposit ? {
      id: deposit.id,
      heldAmount: deposit.amount,
      chargedAmount,
      releasedAmount: ['RELEASED', 'SETTLED'].includes(deposit.status)
        ? deposit.amount - chargedAmount
        : undefined,
    } : null,
  });

  return {
    settlement,
    returnInspectionId: returnInspection.id,
    unresolvedDamageIds,
    depositStatus: deposit?.status ?? null,
  };
}

function settlementKind(code: string) {
  const normalized = code.toUpperCase();
  const known = {
    RENTAL: 'RENTAL', EXTENSION: 'EXTENSION', LATE_RETURN: 'LATE_RETURN',
    MILEAGE: 'MILEAGE', FUEL: 'FUEL', EXTRA: 'EXTRA', FEE: 'FEE',
    FINE: 'FINE', DAMAGE: 'DAMAGE', DISCOUNT: 'DISCOUNT',
  } as const;
  return known[normalized as keyof typeof known] ?? 'OTHER';
}

function parseMajorAmount(value: string): bigint {
  const normalized = value.replace(/\s/gu, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw new SettlementAssemblyError(`Montant contrat invalide: ${value}`);
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ''] = unsigned.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -minor : minor;
}

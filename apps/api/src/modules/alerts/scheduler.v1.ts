/** V1 scheduled checks: maintenance due, telematics signals, transfer recommendations, compliance registry. */
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { Tx } from '../../db/client';
import { complianceRules, contracts, reservations, vehicleTransfers, vehicles } from '../../db/schema';
import { raiseAlert } from './evaluator.js';
import { detectMaintenanceDue } from '../maintenance/maintenance.controller.js';
import { evaluateTelematicsSignals } from '../telematics/telematics.controller.js';

export async function runV1Checks(tx: Tx, agencyId: string): Promise<void> {
  await detectMaintenanceDue(tx, agencyId);
  await evaluateTelematicsSignals(tx, agencyId);
  await recommendTransfers(tx, agencyId);
  await checkComplianceRegistry(tx, agencyId);
}

/**
 * Multi-branch intelligence (V1 §6): tomorrow's departures whose vehicle sits at another
 * branch → create a RECOMMENDED transfer (deduped). The system recommends; humans execute.
 */
export async function recommendTransfers(tx: Tx, agencyId: string): Promise<void> {
  const rows = await tx.select({
    r: reservations, plate: vehicles.plate, currentBranchId: vehicles.currentBranchId,
  }).from(reservations).innerJoin(vehicles, eq(vehicles.id, reservations.vehicleId))
    .where(and(
      eq(reservations.agencyId, agencyId),
      inArray(reservations.status, ['VEHICLE_ASSIGNED', 'READY']),
      gte(reservations.pickupAt, new Date()), lte(reservations.pickupAt, new Date(Date.now() + 48 * 3_600_000)),
    ));
  for (const { r, plate, currentBranchId } of rows) {
    if (!currentBranchId || currentBranchId === r.branchOutId) continue;
    const existing = await tx.select({ id: vehicleTransfers.id }).from(vehicleTransfers)
      .where(and(eq(vehicleTransfers.reservationId, r.id), inArray(vehicleTransfers.status, ['RECOMMENDED', 'APPROVED', 'IN_PROGRESS']))).limit(1);
    if (existing[0]) continue;
    const inserted = await tx.insert(vehicleTransfers).values({
      agencyId, vehicleId: r.vehicleId!, fromBranchId: currentBranchId, toBranchId: r.branchOutId,
      reason: `Réservation ${r.reference} part de l'agence de départ — véhicule ${plate} actuellement sur une autre agence`,
      reservationId: r.id,
    }).returning();
    await raiseAlert({ tx, agencyId, ruleKey: 'BRANCH_MISMATCH', severity: 'HIGH', sourceKind: 'SCHEDULE',
      category: 'OPERATIONS', entityType: 'reservation', entityId: r.id,
      title: `Véhicule requis sur une autre agence — ${plate}`,
      message: `La réservation ${r.reference} part de l'agence de départ; ${plate} est ailleurs. Transfert recommandé (à exécuter par un employé).`,
      evidence: { transferId: inserted[0]!.id, reservationId: r.id, pickupAt: r.pickupAt.toISOString() } });
  }
}

/** Compliance monitors from the registry (source + effective date + config per rule — V1 §16). */
export async function checkComplianceRegistry(tx: Tx, agencyId: string): Promise<void> {
  const rules = await tx.select().from(complianceRules)
    .where(and(eq(complianceRules.agencyId, agencyId), eq(complianceRules.enabled, true)));
  const fleet = await tx.select().from(vehicles)
    .where(and(eq(vehicles.agencyId, agencyId), eq(vehicles.fleetStatus, 'IN_FLEET'), sql`${vehicles.deletedAt} is null`));

  for (const rule of rules) {
    const cfg = (rule.config ?? {}) as Record<string, number>;
    if (rule.key === 'FLEET_MINIMUM' && cfg.minimum != null && fleet.length < cfg.minimum) {
      await raiseAlert({ tx, agencyId, ruleKey: 'FLEET_BELOW_MINIMUM', severity: 'CRITICAL', sourceKind: 'SIGNAL',
        category: 'COMPLIANCE', entityType: 'agency', entityId: agencyId,
        title: `Flotte sous le minimum (${fleet.length}/${cfg.minimum})`,
        message: `Règle « ${rule.label} » — source: ${rule.sourceRef}${rule.effectiveDate ? ` (effective ${rule.effectiveDate})` : ''}. Vérifiez avec votre comptable.`,
        evidence: { ruleKey: rule.key, activeVehicles: fleet.length, minimum: cfg.minimum, sourceRef: rule.sourceRef } });
    }
    if (rule.key === 'VEHICLE_AGE_CAP') {
      for (const v of fleet) {
        if (!v.firstRegistrationDate) continue;
        const age = (Date.now() - new Date(v.firstRegistrationDate).getTime()) / (365.25 * 86_400_000);
        const cap = Number(cfg.ice ?? 0) || undefined;
        if (cap && age >= cap - 0.5) {
          await raiseAlert({ tx, agencyId, ruleKey: 'VEHICLE_AGE_CAP_APPROACHING', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
            category: 'COMPLIANCE', entityType: 'vehicle', entityId: v.id,
            title: `${v.plate} proche du plafond d'âge (${age.toFixed(1)}/${cap} ans)`,
            message: `Source: ${rule.sourceRef}. Planifier la cession — vérifiez avec votre comptable.`,
            evidence: { vehicleId: v.id, ageYears: Number(age.toFixed(2)), capYears: cap, sourceRef: rule.sourceRef } });
        }
      }
    }
    void contracts;
  }
}

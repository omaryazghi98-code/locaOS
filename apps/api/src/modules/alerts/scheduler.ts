/**
 * Scheduled checks (ADR-0009 'SCHEDULE' channel) + system-owned transitions (ADR-0010):
 * OVERDUE entry and the preparation-window AVAILABLE→RESERVED flip. Thin checks — one
 * function per rule; everything flows through raiseAlert() with dedup + lifecycle.
 */
import { and, eq, gte, lte, lt, inArray, isNull, sql } from 'drizzle-orm';
import { db, withTenant, type Tx } from '../../db/client';
import {
  agencies, complianceRuleSets, contracts, customers, deposits, identityDocuments,
  inspections, maintenanceWindows, reservations, vehicleDocuments, vehicleModels, vehicles, cashSessions,
} from '../../db/schema';
import { PREPARATION_WINDOW_HOURS } from '@locaos/domain';
import { raiseAlert } from './evaluator.js';
import { transitionVehicle } from '../fleet/fleet.service.js';

export type SchedTx = Tx;

async function eachAgency(fn: (agencyId: string) => Promise<void>): Promise<void> {
  const rows = await db.select({ id: agencies.id }).from(agencies);
  for (const a of rows) await fn(a.id);
}

export async function runAllChecks(): Promise<void> {
  await eachAgency((agencyId) => withTenant(agencyId, async (tx) => {
    await checkDocExpiry(tx as SchedTx, agencyId, 'VT', 30, 'VT_EXPIRING');
    await checkDocExpiry(tx as SchedTx, agencyId, 'INSURANCE', 15, 'INSURANCE_EXPIRING');
    await checkDocExpiry(tx as SchedTx, agencyId, 'VIGNETTE', 30, 'VIGNETTE_EXPIRING');
    await checkIdentityExpiry(tx as SchedTx, agencyId);
    await checkOverdueRentals(tx as SchedTx, agencyId);
    await checkDepartureReadiness(tx as SchedTx, agencyId);
    await checkMaintenanceConflicts(tx as SchedTx, agencyId);
    await checkBlankAging(tx as SchedTx, agencyId);
    await checkCashSessions(tx as SchedTx, agencyId);
    await checkDepositPreauth(tx as SchedTx, agencyId);
    await checkCompliance(tx as SchedTx, agencyId);
    await applyPreparationWindow(tx as SchedTx, agencyId);
  }));
}

const DUMMY_ID = '00000000-0000-0000-0000-000000000000';

async function checkDocExpiry(tx: SchedTx, agencyId: string, type: 'VT' | 'INSURANCE' | 'VIGNETTE', days: number, ruleKey: string) {
  const horizon = new Date(Date.now() + days * 86_400_000);
  const rows = await tx.select({ doc: vehicleDocuments, plate: vehicles.plate })
    .from(vehicleDocuments).innerJoin(vehicles, eq(vehicles.id, vehicleDocuments.vehicleId))
    .where(and(
      eq(vehicleDocuments.agencyId, agencyId),
      eq(vehicleDocuments.type, type),
      gte(vehicleDocuments.expiresAt, new Date().toISOString().slice(0, 10)),
      lte(vehicleDocuments.expiresAt, horizon.toISOString().slice(0, 10)),
    ));
  for (const r of rows) {
    const daysLeft = Math.ceil((new Date(r.doc.expiresAt!).getTime() - Date.now()) / 86_400_000);
    await raiseAlert({
      tx, agencyId, ruleKey, severity: ruleKey === 'INSURANCE_EXPIRING' ? 'CRITICAL' : ruleKey === 'VT_EXPIRING' ? 'ATTENTION' : 'INFO',
      sourceKind: 'SCHEDULE', entityType: 'vehicle', entityId: r.doc.vehicleId,
      title: `${type === 'VT' ? 'Visite technique' : type === 'INSURANCE' ? 'Assurance' : 'Vignette'} — ${r.plate} expire dans ${daysLeft} j`,
      message: `Document ${type} ${r.doc.refNumber ?? ''} échéance ${r.doc.expiresAt}`,
      evidence: { documentId: r.doc.id, expiresAt: r.doc.expiresAt, daysLeft },
    });
  }
}

async function checkIdentityExpiry(tx: SchedTx, agencyId: string) {
  const horizon = new Date(Date.now() + 30 * 86_400_000);
  const rows = await tx.select({ doc: identityDocuments, firstName: customers.firstName, lastName: customers.lastName })
    .from(identityDocuments).innerJoin(customers, eq(customers.id, identityDocuments.customerId))
    .where(and(eq(identityDocuments.agencyId, agencyId), gte(identityDocuments.expiryDate, new Date().toISOString().slice(0, 10)), lte(identityDocuments.expiryDate, horizon.toISOString().slice(0, 10))));
  for (const r of rows) {
    const daysLeft = Math.ceil((new Date(r.doc.expiryDate!).getTime() - Date.now()) / 86_400_000);
    await raiseAlert({
      tx, agencyId, ruleKey: 'LICENSE_EXPIRING', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
      entityType: 'customer', entityId: r.doc.customerId,
      title: `${r.doc.type} de ${r.firstName ?? ''} ${r.lastName ?? ''} expire dans ${daysLeft} j`,
      message: 'Vérifier la validité pendant la période de location avant départ',
      evidence: { identityDocumentId: r.doc.id, expiresAt: r.doc.expiryDate, daysLeft },
    });
  }
}

async function checkOverdueRentals(tx: SchedTx, agencyId: string) {
  const grace = new Date(Date.now() - 60 * 60_000);
  const overdue = await tx.select({ contract: contracts, plate: vehicles.plate })
    .from(contracts).innerJoin(vehicles, eq(vehicles.id, contracts.vehicleId))
    .where(and(eq(contracts.agencyId, agencyId), eq(contracts.status, 'ACTIVE'), lt(contracts.periodEnd, grace)));
  for (const r of overdue) {
    const hoursOverdue = Math.floor((Date.now() - new Date(r.contract.periodEnd!).getTime()) / 3_600_000);
    if (r.contract.vehicleId) {
      await transitionVehicle(tx as never as Tx, agencyId, {
        vehicleId: r.contract.vehicleId, to: 'OVERDUE', actorKind: 'SCHEDULER',
        reason: `Fin de contrat ${r.contract.number} dépassée`,
        sourceType: 'contract', sourceId: r.contract.id,
      }).catch(() => undefined); // already OVERDUE etc.
    }
    await raiseAlert({
      tx, agencyId, ruleKey: 'RENTAL_OVERDUE', severity: 'CRITICAL', sourceKind: 'SCHEDULE',
      entityType: 'contract', entityId: r.contract.id,
      title: `Location en retard — ${r.plate} (contrat ${r.contract.number})`,
      message: `Retour attendu le ${r.contract.periodEnd?.toISOString()} — ${hoursOverdue} h de retard. Rappel courtois puis escalade (décision humaine).`,
      evidence: { contractId: r.contract.id, hoursOverdue },
    });
  }
  const late = await tx.select().from(reservations)
    .where(and(eq(reservations.agencyId, agencyId), eq(reservations.status, 'READY'), lt(reservations.pickupAt, new Date(Date.now() - 30 * 60_000))));
  for (const r of late) {
    await raiseAlert({
      tx, agencyId, ruleKey: 'RESERVATION_LATE_DEPARTURE', severity: 'INFO', sourceKind: 'SCHEDULE',
      entityType: 'reservation', entityId: r.id,
      title: `Départ en retard — ${r.reference}`,
      message: `Prise en charge prévue ${r.pickupAt.toISOString()} — départ non effectué`,
      evidence: { minutesPast: Math.floor((Date.now() - r.pickupAt.getTime()) / 60_000) },
    });
  }
}

export async function computeBlockers(tx: SchedTx, r: { vehicleId: string | null; status: string; id: string; reference: string }): Promise<string[]> {
  const blockers: string[] = [];
  if (!r.vehicleId) blockers.push('vehicle_unassigned');
  else {
    const v = await tx.select().from(vehicles).where(eq(vehicles.id, r.vehicleId)).limit(1);
    const veh = v[0];
    if (!veh || !['RESERVED', 'PREPARING', 'CONTRACT_READY', 'IN_TRANSIT'].includes(veh.operationalStatus)) blockers.push('vehicle_not_ready');
  }
  const c = await tx.select().from(contracts)
    .where(and(eq(contracts.reservationId, r.id), inArray(contracts.status, ['SIGNED', 'ACTIVE', 'CLOSED', 'AMENDED']))).limit(1);
  if (!c[0]) blockers.push('contract_unsigned');
  const dep = await tx.select().from(deposits)
    .where(and(eq(deposits.contractId, c[0]?.id ?? DUMMY_ID), inArray(deposits.status, ['HELD', 'PRE_AUTHORIZED', 'PARTIALLY_CHARGED']))).limit(1);
  if (!dep[0]) blockers.push('deposit_unsecured');
  const insp = await tx.select().from(inspections)
    .where(and(eq(inspections.reservationId, r.id), eq(inspections.kind, 'DEPARTURE'))).limit(1);
  if (!insp[0]) blockers.push('inspection_missing');
  return blockers;
}

async function checkDepartureReadiness(tx: SchedTx, agencyId: string) {
  const soon = new Date(Date.now() + 2 * 3_600_000);
  const rows = await tx.select().from(reservations)
    .where(and(
      eq(reservations.agencyId, agencyId),
      inArray(reservations.status, ['CONFIRMED', 'VEHICLE_ASSIGNED', 'READY']),
      gte(reservations.pickupAt, new Date()), lte(reservations.pickupAt, soon),
    ));
  for (const r of rows) {
    const blockers = await computeBlockers(tx, r);
    if (blockers.length === 0) continue;
    await raiseAlert({
      tx, agencyId, ruleKey: 'DEPARTURE_UNPREPARED', severity: 'CRITICAL', sourceKind: 'SCHEDULE',
      entityType: 'reservation', entityId: r.id,
      title: `Départ non prêt — ${r.reference}`,
      message: `Départ à ${r.pickupAt.toISOString()} — blocages: ${blockers.join(', ')}`,
      evidence: { blockers, pickupAt: r.pickupAt.toISOString() },
    });
    if (blockers.includes('deposit_unsecured')) {
      await raiseAlert({ agencyId, ruleKey: 'MISSING_DEPOSIT_BEFORE_DEPARTURE', severity: 'CRITICAL', sourceKind: 'SCHEDULE', entityType: 'reservation', entityId: r.id, title: `Caution manquante — ${r.reference}`, message: 'La caution n’est pas sécurisée avant le départ imminent', evidence: { reservationId: r.id } });
    }
    if (blockers.includes('contract_unsigned')) {
      await raiseAlert({ agencyId, ruleKey: 'MISSING_CONTRACT_BEFORE_DEPARTURE', severity: 'CRITICAL', sourceKind: 'SCHEDULE', entityType: 'reservation', entityId: r.id, title: `Contrat non signé — ${r.reference}`, message: 'Aucun contrat signé avant le départ imminent', evidence: { reservationId: r.id } });
    }
  }
}

async function checkMaintenanceConflicts(tx: SchedTx, agencyId: string) {
  const rows = await tx.select({ r: reservations, plate: vehicles.plate })
    .from(reservations)
    .innerJoin(vehicles, eq(vehicles.id, reservations.vehicleId))
    .innerJoin(maintenanceWindows, and(
      eq(maintenanceWindows.vehicleId, reservations.vehicleId),
      sql`(${reservations.pickupAt}, ${reservations.returnAt}) overlaps (${maintenanceWindows.windowStart}, ${maintenanceWindows.windowEnd})`,
    ))
    .where(and(eq(reservations.agencyId, agencyId), inArray(reservations.status, ['DRAFT', 'CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS'])))
    .limit(10);
  for (const row of rows) {
    await raiseAlert({
      tx, agencyId, ruleKey: 'MAINTENANCE_CONFLICT', severity: 'ATTENTION', sourceKind: 'SIGNAL',
      entityType: 'vehicle', entityId: row.r.vehicleId ?? undefined,
      title: `Conflit maintenance/réservation — ${row.plate}`,
      message: `La réservation ${row.r.reference} chevauche une fenêtre de maintenance`,
      evidence: { reservationId: row.r.id, reference: row.r.reference, vehicleId: row.r.vehicleId ?? undefined },
    });
  }
}

async function checkBlankAging(tx: SchedTx, agencyId: string) {
  const rows = await tx.select().from(contracts)
    .where(and(eq(contracts.agencyId, agencyId), eq(contracts.status, 'BLANK_ISSUED'), lt(contracts.blankIssuedAt, new Date(Date.now() - 72 * 3_600_000))));
  for (const c of rows) {
    await raiseAlert({
      tx, agencyId, ruleKey: 'BLANK_CONTRACT_UNRECONCILED', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
      entityType: 'contract', entityId: c.id,
      title: `Contrat vierge non réconcilié — n° ${c.number}`,
      message: `Émis le ${c.blankIssuedAt?.toISOString()} — réconcilier le papier ou l'annuler avec motif`,
      evidence: { contractId: c.id, hoursSinceIssue: Math.floor((Date.now() - c.blankIssuedAt!.getTime()) / 3_600_000) },
    });
  }
}

async function checkCashSessions(tx: SchedTx, agencyId: string) {
  const rows = await tx.select().from(cashSessions)
    .where(and(eq(cashSessions.agencyId, agencyId), eq(cashSessions.status, 'OPEN'), lt(cashSessions.openedAt, new Date(Date.now() - 24 * 3_600_000))));
  for (const s of rows) {
    await raiseAlert({
      tx, agencyId, ruleKey: 'CASH_SESSION_OPEN_TOO_LONG', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
      entityType: 'cash_session', entityId: s.id,
      title: 'Session de caisse ouverte depuis plus de 24 h',
      message: `Ouverte le ${s.openedAt.toISOString()} — clôturer et compter`,
      evidence: { hoursOpen: Math.floor((Date.now() - s.openedAt.getTime()) / 3_600_000) },
    });
  }
}

async function checkDepositPreauth(tx: SchedTx, agencyId: string) {
  const rows = await tx.select().from(deposits)
    .where(and(eq(deposits.agencyId, agencyId), eq(deposits.status, 'PRE_AUTHORIZED'), lt(deposits.preauthExpiresAt, new Date(Date.now() + 48 * 3_600_000))));
  for (const d of rows) {
    await raiseAlert({
      tx, agencyId, ruleKey: 'DEPOSIT_PREAUTH_EXPIRING', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
      entityType: 'deposit', entityId: d.id,
      title: 'Pré-autorisation de caution expirante',
      message: `La pré-autorisation expire le ${d.preauthExpiresAt?.toISOString()} — renouveler avant la fin de location`,
      evidence: { depositId: d.id, contractId: d.contractId, preauthExpiresAt: d.preauthExpiresAt },
    });
  }
}

async function checkCompliance(tx: SchedTx, agencyId: string) {
  const sets = await tx.select().from(complianceRuleSets).where(and(eq(complianceRuleSets.agencyId, agencyId), eq(complianceRuleSets.enabled, true)));
  const set = sets[0];
  if (!set) return; // G.2: OFF by default
  const fleet = await tx.select().from(vehicles).where(and(eq(vehicles.agencyId, agencyId), eq(vehicles.fleetStatus, 'IN_FLEET'), isNull(vehicles.deletedAt)));
  if (set.minFleetSize && fleet.length < set.minFleetSize) {
    await raiseAlert({
      tx, agencyId, ruleKey: 'FLEET_BELOW_MINIMUM', severity: 'CRITICAL', sourceKind: 'SIGNAL',
      entityType: 'agency', entityId: agencyId,
      title: `Flotte sous le minimum réglementaire (${fleet.length}/${set.minFleetSize})`,
      message: 'Risque vis-à-vis du cahier des charges (sources secondaires) — vérifiez avec votre comptable',
      evidence: { activeVehicles: fleet.length, minimum: set.minFleetSize },
    });
  }
  const models = await tx.select().from(vehicleModels).where(eq(vehicleModels.agencyId, agencyId));
  const fuelById = new Map(models.map((m) => [m.id, m.fuelType] as const));
  const now = Date.now();
  for (const v of fleet) {
    if (!v.firstRegistrationDate) continue;
    const age = (now - new Date(v.firstRegistrationDate).getTime()) / (365.25 * 86_400_000);
    const fuel = fuelById.get(v.modelId) ?? 'PETROL';
    const cap = fuel === 'EV' ? set.ageCapEvYears : fuel === 'HYBRID' ? set.ageCapHybridYears : set.ageCapIceYears;
    if (cap && age >= cap - 0.5) {
      await raiseAlert({
        tx, agencyId, ruleKey: 'VEHICLE_AGE_CAP_APPROACHING', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
        entityType: 'vehicle', entityId: v.id,
        title: `${v.plate} proche du plafond d'âge (${age.toFixed(1)}/${cap} ans)`,
        message: 'Planifier la cession (sources secondaires — vérifiez avec votre comptable)',
        evidence: { vehicleId: v.id, ageYears: Number(age.toFixed(2)), capYears: cap },
      });
    }
  }
}

async function applyPreparationWindow(tx: SchedTx, agencyId: string) {
  const rows = await tx.select().from(reservations)
    .where(and(
      eq(reservations.agencyId, agencyId),
      eq(reservations.status, 'VEHICLE_ASSIGNED'),
      gte(reservations.pickupAt, new Date()),
      lte(reservations.pickupAt, new Date(Date.now() + PREPARATION_WINDOW_HOURS * 3_600_000)),
      sql`${reservations.vehicleId} is not null`,
    ));
  for (const r of rows) {
    const v = await tx.select().from(vehicles).where(eq(vehicles.id, r.vehicleId!)).limit(1);
    if (v[0]?.operationalStatus === 'AVAILABLE') {
      await transitionVehicle(tx as never as Tx, agencyId, {
        vehicleId: r.vehicleId!, to: 'RESERVED', actorKind: 'RESERVATION_SERVICE',
        reason: `Fenêtre de préparation — réservation ${r.reference}`,
        sourceType: 'reservation', sourceId: r.id,
      }).catch(() => undefined);
    }
  }
}

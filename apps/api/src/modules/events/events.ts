/**
 * Event spine (ADR-0009): domain events are appended to outbox_events in the same
 * transaction as the state change, then evaluated by the alert engine. For MVP the
 * evaluator runs in-process after commit (documented simplification, ADR-0011); the
 * outbox remains the reliable record and the relay re-evaluates stragglers.
 */
import { eq, isNull, lt, and } from 'drizzle-orm';
import { db, type Tx } from '../../db/client';
import { outboxEvents } from '../../db/schema';

export type DomainEventMap = {
  UserLoggedIn: { userId: string; email: string; at: string; outOfHours: boolean };
  VehicleTransitioned: { vehicleId: string; plate: string; from: string; to: string; reason?: string; actorName?: string };
  ReservationCreated: { reservationId: string; reference: string; vehicleId: string | null; pickupAt: string };
  ReservationStatusChanged: { reservationId: string; reference: string; from: string; to: string };
  ReservationConflictRejected: { vehicleId: string | null; pickupAt: string; returnAt: string; conflictType: 'RESERVATION' | 'MAINTENANCE' };
  QuoteBelowFloor: { reservationId: string; reference: string; dailyRate: string; floor: string };
  ContractSigned: { contractId: string; number: string; language: string };
  ContractClosed: {
    contractId: string;
    number: string;
    reservationId: string;
    vehicleId: string;
    vehicleStatus: string;
    returnInspectionId: string;
  };
  BlankContractIssued: { contractId: string; number: string };
  BlankContractReconciled: { contractId: string; number: string };
  ContractVoided: { contractId: string; number: string; reason: string };
  ContractAmended: { contractId: string; number: string; kind: string };
  DepositReleased: { depositId: string; contractId: string; returnInspectionExists: boolean; reason?: string };
  DepositPreauthExpiring: { depositId: string; contractId: string; preauthExpiresAt: string };
  PaymentRecorded: { paymentId: string; method: string; amount: string; currency: string; contractId: string | null; allocated: boolean };
  RefundIssued: { paymentId: string; reversesPaymentId: string; amount: string; approvedBy: string };
  CashSessionClosed: { sessionId: string; branchId: string; varianceMad: string; expectedMad: string };
  CashVarianceNonZero: { sessionId: string; branchId: string; varianceMad: string };
  InspectionSubmitted: { inspectionId: string; kind: string; vehicleId: string; durationSeconds: number | null };
  InspectionTooFast: { inspectionId: string; durationSeconds: number };
  DamageNewOnReturn: { damageId: string; vehicleId: string; zoneCode: string; severity: string; contractId: string | null };
  FuelLowOnReturn: { inspectionId: string; vehicleId: string; fuelLevelPct: number };
  ExportAttempted: { userId: string; scope: string; blocked: boolean };
  PriceOverridden: { contractId: string | null; reservationId: string | null; from: string; to: string; reason: string };
  CleaningTaskCreated: { taskId: string; vehicleId: string; nextPickupAt: string | null };
  DocumentExpiring: { documentId: string; vehicleId: string; type: string; expiresAt: string; daysLeft: number };
  IdentityDocumentExpiring: { identityDocumentId: string; customerId: string; type: string; expiresAt: string; daysLeft: number };
  RentalOverdue: { reservationId: string; reference: string; vehicleId: string; hoursOverdue: number };
  DepartureUnprepared: { reservationId: string; reference: string; blockers: string[]; pickupAt: string };
  BlankContractAging: { contractId: string; number: string; hoursSinceIssue: number };
  FleetBelowMinimum: { activeVehicles: number; minimum: number };
  VehicleAgeCapApproaching: { vehicleId: string; plate: string; ageYears: number; capYears: number };
  MaintenanceConflictDetected: { vehicleId: string; reference: string };
  CashSessionOpenTooLong: { sessionId: string; hoursOpen: number };
  LoginOutsideHours: { userId: string; email: string; at: string };
  ReservationLateDeparture: { reservationId: string; reference: string; minutesPast: number };
};

export type DomainEventType = keyof DomainEventMap;

export async function appendEvent<K extends DomainEventType>(
  tx: Tx, agencyId: string, eventType: K, payload: DomainEventMap[K],
): Promise<void> {
  await tx.insert(outboxEvents).values({ agencyId, eventType, payload: payload as never });
}

/** Post-commit dispatch: hand to the alert evaluator (imported lazily to avoid cycles). */
export async function dispatchPending(limit = 50): Promise<void> {
  const { handleOutbox } = await import('../alerts/evaluator.js');
  const rows = await db.select().from(outboxEvents)
    .where(and(isNull(outboxEvents.processedAt), lt(outboxEvents.createdAt, new Date())))
    .limit(limit);
  for (const row of rows) {
    await handleOutbox(row.id, row.agencyId, row.eventType, row.payload as Record<string, unknown>);
  }
}

/** Fire-and-forget wrapper — never let alert evaluation crash a request (or the process). */
export function dispatchPendingSafe(): void {
  dispatchPending().catch((e) => console.warn('[outbox] dispatch failed:', (e as Error).message));
}

export async function markProcessed(id: string): Promise<void> {
  await db.update(outboxEvents).set({ processedAt: new Date() }).where(eq(outboxEvents.id, id));
}

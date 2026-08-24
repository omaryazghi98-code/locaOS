/** Reservations — operational commitments, not calendar decorations. */
export const RESERVATION_STATUSES = [
  'DRAFT', 'CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Statuses whose calendar window actively blocks the vehicle (exclusion constraint WHERE clause). */
export const BLOCKING_STATUSES: readonly ReservationStatus[] = ['DRAFT', 'CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS'];

export const RESERVATION_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['VEHICLE_ASSIGNED', 'CANCELLED', 'NO_SHOW'],
  VEHICLE_ASSIGNED: ['READY', 'CANCELLED', 'NO_SHOW'],
  READY: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransitionReservation(from: ReservationStatus, to: ReservationStatus): boolean {
  return RESERVATION_TRANSITIONS[from].includes(to);
}

/** Grace period (minutes) after pickup_at before a READY/VEHICLE_ASSIGNED reservation is flagged late. */
export const DEPARTURE_GRACE_MINUTES = 30;

export interface ReadinessChecklist {
  vehicleAssigned: boolean;
  contractSigned: boolean;
  depositSecured: boolean;
  departureInspectionDone: boolean;
  vehicleReady: boolean;
}

export function readinessBlockers(c: ReadinessChecklist): string[] {
  const b: string[] = [];
  if (!c.vehicleAssigned) b.push('vehicle_unassigned');
  if (!c.contractSigned) b.push('contract_unsigned');
  if (!c.departureInspectionDone) b.push('inspection_missing');
  if (!c.depositSecured) b.push('deposit_unsecured');
  if (!c.vehicleReady) b.push('vehicle_not_ready');
  return b;
}

/** Preparation window: vehicle flips AVAILABLE→RESERVED this many hours before pickup (config). */
export const PREPARATION_WINDOW_HOURS = 24;

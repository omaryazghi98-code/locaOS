/**
 * NAVI read-model types — mirror existing API payloads exactly.
 * Sources: /api/ops/command-center, /api/ops/focus, /api/ops/tasks, /api/alerts, /api/fleet/vehicles
 * Nothing here is invented; fields not returned by the API are not modelled.
 */
import type { VehicleStatus } from '@locaos/domain';

export interface CommandCenter {
  happening: { activeRentals: number; available: number; fleetSize: number; departuresToday: number; returnsToday: number; utilizationPct: number; revenue30Mad: string; outstandingMad: string };
  wrong: { overdue: { id: string; plate: string }[]; unavailable: { id: string; plate: string; status: string }[]; openCritical: number; openHigh: number };
  willGoWrong: {
    branchMismatches: { id: string; reference: string; plate: string | null; vehicle_id?: string | null; pickup_at?: string }[];
    unassignedTomorrow: number;
    docsExpiring: { type: string; n: number }[];
    pendingTransfers: number;
  };
  actions: { priority: number; kind: string; label: string; href: string; reason: string }[];
}

export interface FocusPickup { reservationId: string; customerName: string | null; plate: string | null; categoryName: string; pickupAt: string; contractId: string | null; contractStatus: string | null; blockers: string[] }
export interface FocusReturn { reservationId: string; customerName: string | null; plate: string | null; categoryName: string; returnAt: string; contractId: string | null; contractStatus: string | null; returnInspectionDone: boolean }
export interface Focus {
  pickups: FocusPickup[];
  returns: FocusReturn[];
  overdueTasks: { reservationId: string; customerName: string | null; blockers: string[] }[];
  unresolvedBlockers: string[];
  inspectionsPending: boolean;
  contractActions: { id: string; reservationId: string; customerName: string | null; href: string }[];
}

export type TaskKind = 'PREPARATION_REVIEW' | 'CLEANING' | 'MAINTENANCE' | 'QA';
export type TaskStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export interface OpsTask {
  id: string; vehicle_id: string; plate: string; task_kind: TaskKind; title: string; description: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'; status: TaskStatus; assignee_name: string;
  reservation_id: string | null; source_inspection_id: string | null; created_at: string; completed_at: string | null; updated_at?: string;
}
export const OPEN_TASK_STATUSES: readonly TaskStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED'];

export interface Alert { id: string; ruleKey: string; severity: 'CRITICAL' | 'HIGH' | 'ATTENTION' | string; status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | string; title: string; message: string; createdAt: string; sourceKind: string; category?: string }

export interface Vehicle {
  id: string; plate: string; vin: string; operationalStatus: VehicleStatus; fleetStatus: string; currentMileageKm: number; fuelLevelPct: number; category: string;
  model?: { make: string; model: string; year: number; fuelType: string };
}

export type Loadable<T> = { status: 'loading'; data?: T } | { status: 'ready'; data: T; at: number } | { status: 'error'; error: string; data?: T };

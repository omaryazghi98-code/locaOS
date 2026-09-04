/**
 * Authoritative vehicle operational status machine (ADR-0010).
 *
 * - Exactly the 14 mandated states.
 * - Exceptional states are interrupting; the interrupted pipeline position is recorded
 *   on the transition row by the caller (not modeled here).
 * - OVERDUE is system-owned: only the scheduled evaluator may enter/exit it.
 * - Contradictions (GHOST_STATE etc.) are signals — they NEVER mutate status; they alert
 *   and may request a transition through a human Approval.
 */
export const VEHICLE_STATUSES = [
  'AVAILABLE', 'RESERVED', 'PREPARING', 'CONTRACT_READY', 'IN_TRANSIT', 'RENTED', 'OVERDUE',
  'AWAITING_INSPECTION', 'INSPECTED', 'CLEANING', 'MAINTENANCE', 'IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE',
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const FLEET_STATUSES = ['IN_FLEET', 'FOR_SALE', 'SOLD', 'RETIRED'] as const;
export type FleetStatus = (typeof FLEET_STATUSES)[number];

export type TransitionActor = 'USER' | 'RESERVATION_SERVICE' | 'CONTRACT_SERVICE' | 'INSPECTION_SERVICE' | 'OPS_SERVICE' | 'SCHEDULER';

export interface TransitionRule {
  from: VehicleStatus | 'ANY';
  to: VehicleStatus;
  actors: TransitionActor[] | 'ANY';
  reasonRequired?: boolean;
  note?: string;
}

/** Pipeline + return path, interrupting exceptions, and their explicit exits. */
export const TRANSITIONS: readonly TransitionRule[] = [
  { from: 'AVAILABLE', to: 'RESERVED', actors: ['RESERVATION_SERVICE', 'SCHEDULER'], note: 'Preparation window opens only' },
  { from: 'RESERVED', to: 'PREPARING', actors: ['USER', 'RESERVATION_SERVICE'] },
  { from: 'RESERVED', to: 'AVAILABLE', actors: ['USER', 'RESERVATION_SERVICE'], reasonRequired: true, note: 'Release / cancellation' },
  { from: 'PREPARING', to: 'CONTRACT_READY', actors: ['USER', 'RESERVATION_SERVICE'] },
  { from: 'PREPARING', to: 'AVAILABLE', actors: ['USER'], reasonRequired: true },
  { from: 'CONTRACT_READY', to: 'IN_TRANSIT', actors: ['USER', 'OPS_SERVICE'] },
  { from: 'CONTRACT_READY', to: 'RENTED', actors: ['USER', 'CONTRACT_SERVICE'], note: 'Handover at branch' },
  { from: 'IN_TRANSIT', to: 'RENTED', actors: ['USER', 'CONTRACT_SERVICE'], note: 'Handover complete' },
  { from: 'RENTED', to: 'OVERDUE', actors: ['SCHEDULER'], note: 'System-owned' },
  { from: 'OVERDUE', to: 'AWAITING_INSPECTION', actors: ['USER', 'INSPECTION_SERVICE'] },
  { from: 'RENTED', to: 'AWAITING_INSPECTION', actors: ['USER', 'INSPECTION_SERVICE'] },
  { from: 'AWAITING_INSPECTION', to: 'INSPECTED', actors: ['USER', 'INSPECTION_SERVICE'] },
  // Post-return availability is task-gated. Operations tasks own preparation completion.
  { from: 'INSPECTED', to: 'CLEANING', actors: ['OPS_SERVICE'], note: 'Preparation work starts' },
  { from: 'INSPECTED', to: 'MAINTENANCE', actors: ['OPS_SERVICE'], reasonRequired: true, note: 'Preparation maintenance starts' },
  { from: 'CLEANING', to: 'AVAILABLE', actors: ['OPS_SERVICE'], reasonRequired: true, note: 'Preparation complete / QA passed' },
  // Interrupts — allowed from any non-terminal exceptional state; never from→same.
  { from: 'ANY', to: 'MAINTENANCE', actors: ['USER', 'SCHEDULER'], reasonRequired: true },
  { from: 'ANY', to: 'IMMOBILIZED', actors: ['USER'], reasonRequired: true, note: 'Hold / seizure (Fourrière)' },
  { from: 'ANY', to: 'ACCIDENT', actors: ['USER'], reasonRequired: true },
  { from: 'ANY', to: 'UNAVAILABLE', actors: ['USER'], reasonRequired: true, note: 'Docs missing / voluntary' },
  // Explicit exits from exceptional states — never silent return to AVAILABLE.
  { from: 'MAINTENANCE', to: 'AVAILABLE', actors: ['USER'], reasonRequired: true },
  { from: 'MAINTENANCE', to: 'UNAVAILABLE', actors: ['USER'], reasonRequired: true },
  { from: 'ACCIDENT', to: 'MAINTENANCE', actors: ['USER'] },
  { from: 'ACCIDENT', to: 'AWAITING_INSPECTION', actors: ['USER'] },
  { from: 'ACCIDENT', to: 'UNAVAILABLE', actors: ['USER'], reasonRequired: true, note: 'Total loss' },
  { from: 'IMMOBILIZED', to: 'AVAILABLE', actors: ['USER'], reasonRequired: true, note: 'Explicit release' },
  { from: 'IMMOBILIZED', to: 'MAINTENANCE', actors: ['USER'] },
  { from: 'UNAVAILABLE', to: 'AVAILABLE', actors: ['USER'], reasonRequired: true, note: 'Documents restored' },
  { from: 'UNAVAILABLE', to: 'MAINTENANCE', actors: ['USER'] },
];

export type TransitionErrorCode =
  | 'SAME_STATE' | 'UNKNOWN_TRANSITION' | 'ACTOR_NOT_ALLOWED' | 'REASON_REQUIRED' | 'SYSTEM_ONLY';

export interface TransitionCheck {
  ok: boolean;
  code?: TransitionErrorCode;
  message?: string;
  rule?: TransitionRule;
}

export function checkTransition(
  from: VehicleStatus,
  to: VehicleStatus,
  actor: TransitionActor,
  opts: { reason?: string } = {},
): TransitionCheck {
  if (from === to) {
    return { ok: false, code: 'SAME_STATE', message: `Vehicle is already ${from}` };
  }
  const rule = TRANSITIONS.find((r) => r.to === to && (r.from === from || r.from === 'ANY'));
  if (!rule) {
    return { ok: false, code: 'UNKNOWN_TRANSITION', message: `Illegal transition ${from} → ${to}` };
  }
  if (rule.actors !== 'ANY' && !rule.actors.includes(actor)) {
    return { ok: false, code: 'ACTOR_NOT_ALLOWED', message: `Actor ${actor} may not perform ${from} → ${to}` };
  }
  if (rule.reasonRequired && !opts.reason?.trim()) {
    return { ok: false, code: 'REASON_REQUIRED', message: `A reason is required for ${from} → ${to}` };
  }
  if (to === 'OVERDUE' && actor !== 'SCHEDULER') {
    return { ok: false, code: 'SYSTEM_ONLY', message: 'OVERDUE is entered only by the scheduled evaluator' };
  }
  return { ok: true, rule };
}

/** Pipeline states that exceptional interrupts remember for the audit record. */
export const PIPELINE_STATES: readonly VehicleStatus[] = [
  'RESERVED', 'PREPARING', 'CONTRACT_READY', 'IN_TRANSIT', 'RENTED', 'OVERDUE', 'AWAITING_INSPECTION', 'INSPECTED', 'CLEANING',
];
export const EXCEPTIONAL_STATES: readonly VehicleStatus[] = ['MAINTENANCE', 'IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE'];
export const isExceptional = (s: VehicleStatus) => (EXCEPTIONAL_STATES as readonly string[]).includes(s);
export const rentableFrom = (s: VehicleStatus) => s === 'CONTRACT_READY' || s === 'IN_TRANSIT';

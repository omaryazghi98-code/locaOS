import { describe, expect, it } from 'vitest';
import {
  checkTransition, isExceptional, rentableFrom, TRANSITIONS, VEHICLE_STATUSES,
} from './vehicleStateMachine.js';

describe('vehicle state machine (ADR-0010)', () => {
  it('covers exactly the 14 mandated states', () => {
    expect(VEHICLE_STATUSES).toHaveLength(14);
  });

  it('happy path: AVAILABLE → … → AVAILABLE', () => {
    const path = ['AVAILABLE', 'RESERVED', 'PREPARING', 'CONTRACT_READY', 'IN_TRANSIT', 'RENTED',
      'AWAITING_INSPECTION', 'INSPECTED', 'CLEANING', 'AVAILABLE'] as const;
    const actors = ['USER', 'RESERVATION_SERVICE', 'CONTRACT_SERVICE', 'INSPECTION_SERVICE', 'OPS_SERVICE', 'SCHEDULER'] as const;
    for (let i = 0; i < path.length - 1; i++) {
      const legal = actors.some((a) => checkTransition(path[i]!, path[i + 1]!, a).ok);
      expect(legal, `${path[i]} → ${path[i + 1]} should be legal for some actor`).toBe(true);
    }
  });

  it('rejects illegal jumps', () => {
    expect(checkTransition('AVAILABLE', 'RENTED', 'USER').ok).toBe(false);
    expect(checkTransition('AVAILABLE', 'INSPECTED', 'USER').ok).toBe(false);
    expect(checkTransition('RENTED', 'AVAILABLE', 'USER').ok).toBe(false);
    expect(checkTransition('INSPECTED', 'AVAILABLE', 'USER').ok).toBe(false); // post-return tasks are mandatory
    expect(checkTransition('INSPECTED', 'AVAILABLE', 'OPS_SERVICE').ok).toBe(false); // tasks own this path
  });

  it('rejects same-state transitions', () => {
    const r = checkTransition('RENTED', 'RENTED', 'USER');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('SAME_STATE');
  });

  it('OVERDUE is system-owned', () => {
    expect(checkTransition('RENTED', 'OVERDUE', 'USER').ok).toBe(false);
    expect(checkTransition('RENTED', 'OVERDUE', 'SCHEDULER').ok).toBe(true);
  });

  it('exceptional interrupts require a reason', () => {
    expect(checkTransition('RENTED', 'ACCIDENT', 'USER').ok).toBe(false);
    const ok = checkTransition('RENTED', 'ACCIDENT', 'USER', { reason: 'Choc arrière signalé' });
    expect(ok.ok).toBe(true);
  });

  it('exceptional states never silently return to pipeline states', () => {
    for (const from of ['MAINTENANCE', 'IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE'] as const) {
      expect(checkTransition(from, 'RENTED', 'USER', { reason: 'x' }).ok).toBe(false);
      expect(checkTransition(from, 'RESERVED', 'USER', { reason: 'x' }).ok).toBe(false);
    }
  });

  it('interrupts allowed from any pipeline state with reason', () => {
    for (const from of ['AVAILABLE', 'RESERVED', 'RENTED', 'CLEANING'] as const) {
      expect(checkTransition(from, 'MAINTENANCE', 'USER', { reason: 'révision' }).ok).toBe(true);
      expect(isExceptional('MAINTENANCE')).toBe(true);
    }
  });

  it('rentable only from CONTRACT_READY or IN_TRANSIT', () => {
    expect(rentableFrom('CONTRACT_READY')).toBe(true);
    expect(rentableFrom('IN_TRANSIT')).toBe(true);
    expect(rentableFrom('AVAILABLE')).toBe(false);
    expect(rentableFrom('PREPARING')).toBe(false);
  });

  it('every non-exceptional state has at least one outgoing transition', () => {
    for (const s of VEHICLE_STATUSES) {
      const has = TRANSITIONS.some((t) => t.from === s || (t.from === 'ANY' && t.to !== s));
      expect(has, `${s} has no outgoing transition`).toBe(true);
    }
  });
});

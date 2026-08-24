import { describe, expect, it } from 'vitest';
import { blankContractContent, ContractContent, formatContractNumber } from './contract.js';
import { buildDedupKey, evaluateCondition } from './alerts.js';
import { canTransitionReservation, readinessBlockers } from './reservation.js';

describe('contract content', () => {
  it('blank contract (Blank Slate) validates against the structured schema', () => {
    const c = blankContractContent({
      agencyName: 'Atlas Rent SARL', agencyIce: '001234567800012', branchName: 'Aéroport CMN',
      contractNumber: formatContractNumber('L', 2026, 42), language: 'fr',
    });
    expect(() => ContractContent.parse(c)).not.toThrow();
    expect(c.header.mode).toBe('BLANK');
    expect(c.customer.name).toBeNull();
    expect(c.vehicle.plate).toBeNull();
    // the number is real and traceable — never an invisible record
    expect(c.header.contractNumber).toBe('L-2026-00042');
  });

  it('numbering format is deterministic and zero-padded', () => {
    expect(formatContractNumber('L', 2026, 7)).toBe('L-2026-00007');
    expect(formatContractNumber('L', 2027, 12345)).toBe('L-2027-12345');
  });

  it('fully populated contract validates', () => {
    const c = blankContractContent({ agencyName: 'A', agencyIce: null, branchName: null, contractNumber: 'L-2026-00001', language: 'ar' });
    c.customer = { name: 'يوسف العلوي', cinOrPassport: 'X123456', licenseNumber: 'AB123456', licenseIssuedOn: '2020-05-01', phone: '+212661234567', email: null, address: 'Casablanca', birthDate: '1992-03-10' };
    c.vehicle.plate = '12345-A-6';
    expect(() => ContractContent.parse(c)).not.toThrow();
  });
});

describe('alert conditions & dedup', () => {
  it('evaluates declarative conditions', () => {
    const payload = { vehicle: { status: 'AVAILABLE' }, speed: 172 };
    expect(evaluateCondition({ field: 'vehicle.status', op: 'eq', value: 'AVAILABLE' }, payload)).toBe(true);
    expect(evaluateCondition({ field: 'speed', op: 'gt', value: 160 }, payload)).toBe(true);
    expect(evaluateCondition({ field: 'ignition', op: 'exists' }, payload)).toBe(false);
  });

  it('dedup key is stable per rule/entity/day', () => {
    const a = buildDedupKey('VT_EXPIRING', 'vehicle', 'v1', new Date('2026-08-24T08:00:00Z'));
    const b = buildDedupKey('VT_EXPIRING', 'vehicle', 'v1', new Date('2026-08-24T18:00:00Z'));
    const c = buildDedupKey('VT_EXPIRING', 'vehicle', 'v1', new Date('2026-08-25T08:00:00Z'));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('reservations', () => {
  it('status transitions are guarded', () => {
    expect(canTransitionReservation('DRAFT', 'CONFIRMED')).toBe(true);
    expect(canTransitionReservation('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransitionReservation('IN_PROGRESS', 'COMPLETED')).toBe(true);
  });

  it('readiness blockers are explicit', () => {
    expect(readinessBlockers({ vehicleAssigned: true, contractSigned: false, depositSecured: true, departureInspectionDone: false, vehicleReady: true }))
      .toEqual(['contract_unsigned', 'inspection_missing']);
  });
});

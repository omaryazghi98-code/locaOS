import { describe, expect, it } from 'vitest';
import { canBecomeAvailableFromPostReturn, preparationRequirement } from './postReturnOps.js';

describe('post-return operations', () => {
  it('selects no preparation when there is no explicit requirement', () => {
    expect(preparationRequirement({})).toBe('NONE');
  });

  it('routes new damage to the cleaning/preparation lane', () => {
    expect(preparationRequirement({ hasNewDamages: true })).toBe('CLEANING');
  });

  it('routes maintenance need to maintenance', () => {
    expect(preparationRequirement({ hasMaintenanceNeed: true })).toBe('MAINTENANCE');
  });

  it('keeps mixed return requirements explicit', () => {
    expect(preparationRequirement({ hasNewDamages: true, hasMaintenanceNeed: true })).toBe('MIXED');
  });

  it('only allows post-return availability from INSPECTED with no open preparation', () => {
    expect(canBecomeAvailableFromPostReturn('INSPECTED', false)).toBe(true);
    expect(canBecomeAvailableFromPostReturn('INSPECTED', true)).toBe(false);
    expect(canBecomeAvailableFromPostReturn('CLEANING', false)).toBe(false);
    expect(canBecomeAvailableFromPostReturn('RENTED', false)).toBe(false);
  });
});

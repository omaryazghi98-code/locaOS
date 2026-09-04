import type { VehicleStatus } from './vehicleStateMachine.js';

export const POST_RETURN_PATH = ['INSPECTED', 'CLEANING', 'AVAILABLE'] as const;
export type PostReturnPathStatus = (typeof POST_RETURN_PATH)[number];

export type PreparationRequirement = 'NONE' | 'CLEANING' | 'MAINTENANCE' | 'MIXED';

/**
 * Determines the operational preparation lane after a completed return inspection.
 * This is intentionally deterministic: damage/maintenance policy stays in the API/domain
 * workflow, while this helper only maps explicit operational requirements to a lane.
 */
export function preparationRequirement(input: {
  hasNewDamages?: boolean;
  hasMaintenanceNeed?: boolean;
}): PreparationRequirement {
  if (input.hasMaintenanceNeed) return input.hasNewDamages ? 'MIXED' : 'MAINTENANCE';
  if (input.hasNewDamages) return 'CLEANING';
  return 'NONE';
}

/** A vehicle is rentable only after it has completed the post-return preparation path. */
export function canBecomeAvailableFromPostReturn(status: VehicleStatus, hasOpenPreparation: boolean): boolean {
  return status === 'INSPECTED' && !hasOpenPreparation;
}

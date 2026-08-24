import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  checkTransition, EXCEPTIONAL_STATES, PIPELINE_STATES, type TransitionActor,
  type VehicleStatus, isExceptional,
} from '@locaos/domain';
import { db, type Tx } from '../../db/client';
import { maintenanceWindows, vehicleDocuments, vehicleStateTransitions, vehicles } from '../../db/schema';
import { audit } from '../audit/audit.service.js';
import { appendEvent } from '../events/events.js';

export interface TransitionArgs {
  vehicleId: string; to: VehicleStatus;
  actorId?: string | null; actorName?: string | null;
  actorKind?: TransitionActor | string;
  reason?: string | null; sourceType?: string | null; sourceId?: string | null;
}

/**
 * The ONLY path that mutates vehicles.operational_status (§6/ADR-0010).
 * Validates via the domain state machine, writes the append-only transition row,
 * the audit event, and the domain event — all in the caller's transaction.
 */
export async function transitionVehicle(tx: Tx, agencyId: string, args: TransitionArgs) {
  const rows = await tx.select().from(vehicles)
    .where(and(eq(vehicles.id, args.vehicleId), eq(vehicles.agencyId, agencyId))).limit(1);
  const vehicle = rows[0];
  if (!vehicle) throw new NotFoundException('Véhicule introuvable');
  const actor = (args.actorKind ?? 'USER') as TransitionActor;
  const check = checkTransition(vehicle.operationalStatus as VehicleStatus, args.to, actor, { reason: args.reason ?? undefined });
  if (!check.ok) {
    throw new BadRequestException({ code: check.code, message: check.message });
  }
  const interrupted = isExceptional(vehicle.operationalStatus as VehicleStatus)
    && (PIPELINE_STATES as readonly string[]).includes(args.to) === false
    ? null
    : (EXCEPTIONAL_STATES as readonly string[]).includes(args.to)
      ? ((PIPELINE_STATES as readonly string[]).includes(vehicle.operationalStatus) ? vehicle.operationalStatus : null)
      : null;

  await tx.update(vehicles)
    .set({ operationalStatus: args.to, updatedAt: new Date() })
    .where(and(eq(vehicles.id, args.vehicleId), eq(vehicles.agencyId, agencyId)));

  await tx.insert(vehicleStateTransitions).values({
    agencyId, vehicleId: args.vehicleId,
    fromStatus: vehicle.operationalStatus as VehicleStatus, toStatus: args.to,
    interruptedStatus: interrupted as never,
    actorId: args.actorId ?? null, actorName: args.actorName ?? null, actorKind: String(actor),
    reason: args.reason ?? null, sourceType: args.sourceType ?? null, sourceId: args.sourceId ?? null,
  });

  await audit(tx, {
    agencyId, actor: { id: args.actorId ?? null, name: args.actorName ?? null },
    entityType: 'vehicle', entityId: args.vehicleId,
    action: 'VEHICLE_TRANSITION', before: { status: vehicle.operationalStatus }, after: { status: args.to },
    reason: args.reason ?? null,
  });

  await appendEvent(tx, agencyId, 'VehicleTransitioned', {
    vehicleId: args.vehicleId, plate: vehicle.plate,
    from: vehicle.operationalStatus, to: args.to,
    reason: args.reason ?? undefined, actorName: args.actorName ?? undefined,
  });
  return { from: vehicle.operationalStatus, to: args.to };
}

export async function listVehicles(agencyId: string) {
  return withTenant(agencyId, (tx) => tx.select({
    vehicle: vehicles,
    plateStatusUpdate: sql<string>`to_char(${vehicles.updatedAt}, 'YYYY-MM-DD HH24:MI')`,
  }).from(vehicles)
    .where(and(eq(vehicles.agencyId, agencyId), isNull(vehicles.deletedAt)))
    .orderBy(desc(vehicles.createdAt)));
}

import { vehicleCategories, vehicleModels } from '../../db/schema.js';
import { withTenant } from '../../db/client.js';
export { withTenant };

export async function vehicleDetail(agencyId: string, id: string) {
  return withTenant(agencyId, async (tx) => {
    const v = await tx.select().from(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.agencyId, agencyId))).limit(1);
    if (!v[0]) return null;
    const cat = await tx.select().from(vehicleCategories).where(eq(vehicleCategories.id, v[0].categoryId)).limit(1);
    const model = await tx.select().from(vehicleModels).where(eq(vehicleModels.id, v[0].modelId)).limit(1);
    const docs = await tx.select().from(vehicleDocuments).where(eq(vehicleDocuments.vehicleId, id));
    const transitions = await tx.select().from(vehicleStateTransitions)
      .where(eq(vehicleStateTransitions.vehicleId, id)).orderBy(desc(vehicleStateTransitions.createdAt)).limit(50);
    const windows = await tx.select().from(maintenanceWindows).where(eq(maintenanceWindows.vehicleId, id));
    return { vehicle: v[0], category: cat[0], model: model[0], documents: docs, transitions, maintenanceWindows: windows };
  });
}

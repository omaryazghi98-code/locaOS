import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { VEHICLE_STATUSES, type VehicleStatus } from '@locaos/domain';
import { db, withTenant } from '../../db/client';
import { maintenanceWindows, vehicleCategories, vehicleDocuments, vehicleModels, vehicles } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { dispatchPending, dispatchPendingSafe } from '../events/events.js';
import { transitionVehicle, vehicleDetail } from './fleet.service.js';

const VehicleSchema = z.object({
  plate: z.string().min(4).max(20),
  vin: z.string().length(17),
  categoryId: z.string().uuid(),
  modelId: z.string().uuid(),
  currentBranchId: z.string().uuid().nullable().optional(),
  currentMileageKm: z.number().int().min(0).default(0),
  fuelLevelPct: z.number().int().min(0).max(100).default(100),
  firstRegistrationDate: z.string().date().nullable().optional(),
});

const TransitionSchema = z.object({
  to: z.enum(VEHICLE_STATUSES as unknown as [VehicleStatus, ...VehicleStatus[]]),
  reason: z.string().max(500).optional(),
});

const DocumentSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.enum(['REGISTRATION', 'VT', 'INSURANCE', 'VIGNETTE']),
  refNumber: z.string().max(80).optional(),
  issuedAt: z.string().date().nullable().optional(),
  expiresAt: z.string().date().nullable().optional(),
});

const MaintenanceSchema = z.object({
  vehicleId: z.string().uuid(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  kind: z.string().default('PLANNED'),
  note: z.string().max(300).optional(),
});

@Controller('api/fleet')
@UseGuards(AuthGuard, PermissionsGuard)
export class FleetController {
  @Get('vehicles')
  @RequirePermission('fleet:read')
  async list(@Req() req: AuthedRequest) {
    const rows = await withTenant(req.ctx!.agencyId, (tx) => tx.select().from(vehicles)
      .where(and(eq(vehicles.agencyId, req.ctx!.agencyId), isNull(vehicles.deletedAt))));
    const cats = await withTenant(req.ctx!.agencyId, (tx) => tx.select().from(vehicleCategories));
    const models = await withTenant(req.ctx!.agencyId, (tx) => tx.select().from(vehicleModels));
    return rows.map((v) => ({
      ...v,
      category: cats.find((c) => c.id === v.categoryId)?.name ?? '',
      model: models.find((m) => m.id === v.modelId),
    }));
  }

  @Get('categories')
  @RequirePermission('fleet:read')
  async categories(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(vehicleCategories));
  }

  @Get('models')
  @RequirePermission('fleet:read')
  async models(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(vehicleModels));
  }

  @Post('vehicles')
  @RequirePermission('fleet:write')
  async create(@Body(new ZodValidationPipe(VehicleSchema)) body: z.infer<typeof VehicleSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const inserted = await tx.insert(vehicles).values({
        agencyId: req.ctx!.agencyId,
        plate: body.plate.toUpperCase().replace(/\s+/g, '-'),
        vin: body.vin.toUpperCase(),
        categoryId: body.categoryId, modelId: body.modelId,
        currentBranchId: body.currentBranchId ?? null,
        currentMileageKm: body.currentMileageKm, fuelLevelPct: body.fuelLevelPct,
        firstRegistrationDate: body.firstRegistrationDate ?? null,
        acquiredAt: new Date(),
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'vehicle', entityId: inserted[0]!.id, action: 'VEHICLE_CREATED', after: inserted[0],
      });
      return inserted[0];
    });
  }

  @Get('vehicles/:id')
  @RequirePermission('fleet:read')
  async detail(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    const r = await vehicleDetail(req.ctx!.agencyId, id);
    if (!r) throw new (await import('@nestjs/common')).NotFoundException('Véhicule introuvable');
    return r;
  }

  @Post('vehicles/:id/transition')
  @RequirePermission('vehicle:transition')
  async transition(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(TransitionSchema)) body: { to: VehicleStatus; reason?: string }, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, (tx) => transitionVehicle(tx, req.ctx!.agencyId, {
      vehicleId: id, to: body.to, actorId: req.ctx!.userId, actorName: req.ctx!.fullName,
      reason: body.reason, sourceType: 'manual',
    }));
    dispatchPendingSafe();
    return result;
  }

  @Post('documents')
  @RequirePermission('fleet:write')
  async addDocument(@Body(new ZodValidationPipe(DocumentSchema)) body: z.infer<typeof DocumentSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const inserted = await tx.insert(vehicleDocuments).values({
        agencyId: req.ctx!.agencyId, vehicleId: body.vehicleId, type: body.type,
        refNumber: body.refNumber ?? null,
        issuedAt: body.issuedAt ?? null, expiresAt: body.expiresAt ?? null,
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'vehicle_document', entityId: inserted[0]!.id, action: 'DOCUMENT_ADDED', after: inserted[0],
      });
      return inserted[0];
    });
  }

  @Post('maintenance-windows')
  @RequirePermission('fleet:write')
  async addMaintenance(@Body(new ZodValidationPipe(MaintenanceSchema)) body: z.infer<typeof MaintenanceSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      // If the vehicle is currently rentable/available, also move it into MAINTENANCE at window start;
      // the DB guard rejects overlaps with active reservations (LOCAOS_CONFLICT → 409).
      const inserted = await tx.insert(maintenanceWindows).values({
        agencyId: req.ctx!.agencyId, vehicleId: body.vehicleId,
        windowStart: new Date(body.windowStart), windowEnd: new Date(body.windowEnd),
        kind: body.kind, note: body.note ?? null,
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'maintenance_window', entityId: inserted[0]!.id, action: 'MAINTENANCE_WINDOW_ADDED', after: inserted[0],
      });
      return inserted[0];
    });
  }
}

import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { withTenant } from '../../db/client';
import { damages, inspections, inspectionPhotos, reservations, vehicles } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { appendEvent, dispatchPending, dispatchPendingSafe } from '../events/events.js';
import { storage, objectKey, sniffImage } from '../storage/storage.js';
import { transitionVehicle } from '../fleet/fleet.service.js';

const ChecklistSchema = z.record(z.string(), z.boolean());

const SubmitSchema = z.object({
  clientUuid: z.string().uuid(),            // offline idempotency key
  kind: z.enum(['DEPARTURE', 'RETURN']),
  contractId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  vehicleId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  startedAt: z.string().datetime().optional(), // for the <15s too-fast check (research #95)
  mileageKm: z.number().int().min(0).max(2_000_000).optional(),
  fuelLevelPct: z.number().int().min(0).max(100).optional(),
  checklist: ChecklistSchema.optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  customerAck: z.boolean().default(false),
  customerAckName: z.string().max(120).optional(),
  deviceInfo: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(1000).optional(),
  newDamages: z.array(z.object({
    zoneCode: z.string().min(2).max(30),
    severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).default('MINOR'),
    description: z.string().max(300).optional(),
  })).default([]),
});

@Controller('api/inspections')
@UseGuards(AuthGuard, PermissionsGuard)
export class InspectionsController {
  /** Idempotent submission — offline-first PWA replays are no-ops (ADR-0005). */
  @Post()
  @RequirePermission('inspections:write')
  async submit(@Body(new ZodValidationPipe(SubmitSchema)) body: z.infer<typeof SubmitSchema>, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const existing = await tx.select().from(inspections)
        .where(and(eq(inspections.agencyId, req.ctx!.agencyId), eq(inspections.clientUuid, body.clientUuid))).limit(1);
      if (existing[0]) return { inspection: existing[0], duplicate: true };

      const durationSeconds = body.startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(body.startedAt).getTime()) / 1000))
        : null;

      const inserted = await tx.insert(inspections).values({
        agencyId: req.ctx!.agencyId, clientUuid: body.clientUuid, kind: body.kind,
        contractId: body.contractId ?? null, reservationId: body.reservationId ?? null,
        vehicleId: body.vehicleId, customerId: body.customerId ?? null,
        performedBy: req.ctx!.userId, performedByName: req.ctx!.fullName,
        startedAt: body.startedAt ? new Date(body.startedAt) : null,
        durationSeconds, mileageKm: body.mileageKm ?? null, fuelLevelPct: body.fuelLevelPct ?? null,
        checklist: (body.checklist ?? {}) as never, location: (body.location ?? null) as never,
        customerAck: body.customerAck, customerAckName: body.customerAckName ?? null,
        deviceInfo: (body.deviceInfo ?? null) as never, notes: body.notes ?? null,
      }).returning();
      const inspection = inserted[0]!;

      if (body.mileageKm != null) {
        await tx.update(vehicles).set({ currentMileageKm: body.mileageKm, updatedAt: new Date() })
          .where(and(eq(vehicles.id, body.vehicleId), eq(vehicles.agencyId, req.ctx!.agencyId)));
      }
      if (body.fuelLevelPct != null) {
        await tx.update(vehicles).set({ fuelLevelPct: body.fuelLevelPct, updatedAt: new Date() })
          .where(and(eq(vehicles.id, body.vehicleId), eq(vehicles.agencyId, req.ctx!.agencyId)));
      }

      // New damage records — evidence first, billing always human-confirmed (§14)
      for (const d of body.newDamages) {
        const dmg = await tx.insert(damages).values({
          agencyId: req.ctx!.agencyId, vehicleId: body.vehicleId,
          discoveredInspectionId: inspection.id, preexisting: false,
          zoneCode: d.zoneCode, severity: d.severity, description: d.description ?? null,
        }).returning();
        await appendEvent(tx, req.ctx!.agencyId, 'DamageNewOnReturn', {
          damageId: dmg[0]!.id, vehicleId: body.vehicleId, zoneCode: d.zoneCode,
          severity: d.severity, contractId: body.contractId ?? null,
        });
      }
      if (body.kind === 'RETURN' && body.fuelLevelPct != null && body.fuelLevelPct < 25) {
        await appendEvent(tx, req.ctx!.agencyId, 'FuelLowOnReturn', {
          inspectionId: inspection.id, vehicleId: body.vehicleId, fuelLevelPct: body.fuelLevelPct,
        });
      }
      if (durationSeconds != null && durationSeconds < 15) {
        await appendEvent(tx, req.ctx!.agencyId, 'InspectionTooFast', {
          inspectionId: inspection.id, durationSeconds,
        });
      }
      await appendEvent(tx, req.ctx!.agencyId, 'InspectionSubmitted', {
        inspectionId: inspection.id, kind: body.kind, vehicleId: body.vehicleId, durationSeconds,
      });
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'inspection', entityId: inspection.id, action: 'INSPECTION_SUBMITTED',
        after: { kind: body.kind, mileageKm: body.mileageKm, fuelLevelPct: body.fuelLevelPct, newDamages: body.newDamages.length },
      });
      return { inspection, duplicate: false };
    });
    dispatchPendingSafe();
    return result;
  }

  @Post(':id/photos')
  @RequirePermission('inspections:write')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File, @Req() req: AuthedRequest & { body: { slot?: string } }) {
    const sniffed = sniffImage(file.buffer);
    if (!sniffed || file.size > 8 * 1024 * 1024) throw new ForbiddenException('Image invalide (JPG/PNG/WebP ≤ 8 Mo)');
    const slot = (req.body.slot ?? 'DAMAGE').toUpperCase();
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const insp = await tx.select().from(inspections)
        .where(and(eq(inspections.id, id), eq(inspections.agencyId, req.ctx!.agencyId))).limit(1);
      if (!insp[0]) throw new NotFoundException('Inspection introuvable');
      const key = objectKey(req.ctx!.agencyId, 'inspections', `${slot.toLowerCase()}.jpg`);
      await storage.put(key, file.buffer, sniffed);
      const photo = await tx.insert(inspectionPhotos).values({
        agencyId: req.ctx!.agencyId, inspectionId: id, slot, objectKey: key,
        checksum: Buffer.from(String(file.size)).toString('base64').slice(0, 16),
      }).returning();
      return { ...photo[0], url: storage.signedUrl(key, 3600) };
    });
  }

  @Get()
  @RequirePermission('inspections:read')
  async list(@Query('vehicleId') vehicleId: string | undefined, @Query('contractId') contractId: string | undefined, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => {
      const conds = [eq(inspections.agencyId, req.ctx!.agencyId)];
      if (vehicleId) conds.push(eq(inspections.vehicleId, vehicleId));
      if (contractId) conds.push(eq(inspections.contractId, contractId));
      return tx.select().from(inspections).where(and(...conds)).orderBy(desc(inspections.submittedAt)).limit(100);
    });
  }

  @Get(':id')
  @RequirePermission('inspections:read')
  async detail(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select().from(inspections)
        .where(and(eq(inspections.id, id), eq(inspections.agencyId, req.ctx!.agencyId))).limit(1);
      if (!rows[0]) throw new NotFoundException('Inspection introuvable');
      const photos = await tx.select().from(inspectionPhotos).where(eq(inspectionPhotos.inspectionId, id));
      const dmg = await tx.select().from(damages).where(eq(damages.discoveredInspectionId, id));
      return {
        inspection: rows[0],
        photos: photos.map((p) => ({ ...p, url: storage.signedUrl(p.objectKey, 3600) })),
        damages: dmg,
      };
    });
  }

  /** Field ops: return check-in → vehicle AWAITING_INSPECTION, reservation paused. */
  @Post(':id/complete-return')
  @RequirePermission('inspections:write')
  async completeReturn(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select().from(inspections)
        .where(and(eq(inspections.id, id), eq(inspections.agencyId, req.ctx!.agencyId))).limit(1);
      const insp = rows[0];
      if (!insp) throw new NotFoundException('Inspection introuvable');
      if (insp.kind !== 'RETURN') throw new ForbiddenException('Inspection retour uniquement');
      await transitionVehicle(tx, req.ctx!.agencyId, {
        vehicleId: insp.vehicleId, to: 'INSPECTED',
        actorId: req.ctx!.userId, actorName: req.ctx!.fullName, actorKind: 'INSPECTION_SERVICE',
        reason: 'Inspection retour terminée', sourceType: 'inspection', sourceId: id,
      });
      if (insp.contractId) {
        await tx.update(vehicles).set({ updatedAt: new Date() }).where(eq(vehicles.id, insp.vehicleId));
      }
      if (insp.reservationId) {
        await tx.update(reservations).set({ updatedAt: new Date() }).where(eq(reservations.id, insp.reservationId));
      }
      return { ok: true };
    });
  }
}

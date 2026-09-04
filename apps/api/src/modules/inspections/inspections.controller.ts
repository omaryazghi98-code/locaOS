import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { withTenant } from '../../db/client';
import { contracts, damages, inspections, inspectionPhotos, reservations, vehicles } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { appendEvent, dispatchPendingSafe } from '../events/events.js';
import { storage, objectKey, sniffImage } from '../storage/storage.js';
import { transitionVehicle } from '../fleet/fleet.service.js';

const ChecklistSchema = z.record(z.string(), z.boolean());

const SubmitSchema = z.object({
  clientUuid: z.string().uuid(),
  kind: z.enum(['DEPARTURE', 'RETURN']),
  contractId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  // Optional when reservationId is supplied: the server resolves the authoritative vehicle.
  vehicleId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startedAt: z.string().datetime().optional(),
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
}).refine((v) => Boolean(v.reservationId || v.vehicleId), { message: 'Une réservation ou un véhicule est requis' });

@Controller('api/inspections')
@UseGuards(AuthGuard, PermissionsGuard)
export class InspectionsController {
  @Post()
  @RequirePermission('inspections:write')
  async submit(@Body(new ZodValidationPipe(SubmitSchema)) body: z.infer<typeof SubmitSchema>, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const existing = await tx.select().from(inspections)
        .where(and(eq(inspections.agencyId, req.ctx!.agencyId), eq(inspections.clientUuid, body.clientUuid))).limit(1);
      if (existing[0]) return { inspection: existing[0], duplicate: true };

      let resolvedContractId = body.contractId ?? null;
      let resolvedVehicleId = body.vehicleId ?? null;
      let linkedReservation: typeof reservations.$inferSelect | null = null;
      let linkedContract: typeof contracts.$inferSelect | null = null;

      if (body.reservationId) {
        const reservation = await tx.select().from(reservations)
          .where(and(eq(reservations.id, body.reservationId), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1);
        if (!reservation[0]) throw new NotFoundException('Réservation introuvable');
        linkedReservation = reservation[0];

        if (!linkedReservation.vehicleId) {
          throw new ForbiddenException('La réservation doit avoir un véhicule affecté avant inspection');
        }
        if (resolvedVehicleId && linkedReservation.vehicleId !== resolvedVehicleId) {
          throw new ForbiddenException('Le véhicule de l’inspection ne correspond pas à la réservation');
        }
        // Reservation assignment is authoritative; never trust a client-supplied vehicle over it.
        resolvedVehicleId = linkedReservation.vehicleId;

        const linkedContracts = await tx.select().from(contracts)
          .where(and(
            eq(contracts.agencyId, req.ctx!.agencyId),
            eq(contracts.reservationId, body.reservationId),
            inArray(contracts.status, ['DRAFT', 'SIGNED', 'ACTIVE', 'AMENDED']),
          )).orderBy(contracts.createdAt).limit(1);

        if (body.contractId) {
          const explicit = linkedContracts.find((c) => c.id === body.contractId);
          if (!explicit) throw new ForbiddenException('Le contrat fourni ne correspond pas à la réservation');
          linkedContract = explicit;
        } else {
          resolvedContractId = linkedContracts[0]?.id ?? null;
          linkedContract = linkedContracts[0] ?? null;
        }
      }

      if (!resolvedVehicleId) throw new ForbiddenException('Aucun véhicule résolu pour cette inspection');

      if (body.contractId && !linkedContract) {
        const contract = await tx.select().from(contracts)
          .where(and(eq(contracts.id, body.contractId), eq(contracts.agencyId, req.ctx!.agencyId))).limit(1);
        if (!contract[0]) throw new NotFoundException('Contrat introuvable');
        if (!['DRAFT', 'SIGNED', 'ACTIVE', 'AMENDED'].includes(contract[0].status)) {
          throw new ForbiddenException('Le contrat n’est pas dans un état permettant une inspection');
        }
        linkedContract = contract[0];
        if (contract[0].vehicleId !== resolvedVehicleId) {
          throw new ForbiddenException('Le véhicule de l’inspection ne correspond pas au contrat');
        }
        if (body.reservationId && contract[0].reservationId !== body.reservationId) {
          throw new ForbiddenException('Le contrat ne correspond pas à la réservation');
        }
        resolvedContractId = contract[0].id;
      }

      if (linkedContract && linkedContract.vehicleId !== resolvedVehicleId) {
        throw new ForbiddenException('Le véhicule de l’inspection ne correspond pas au contrat');
      }
      if (linkedContract?.reservationId && linkedReservation && linkedContract.reservationId !== linkedReservation.id) {
        throw new ForbiddenException('Le contrat et la réservation de l’inspection ne correspondent pas');
      }
      if (linkedReservation && linkedContract?.reservationId !== linkedReservation.id) {
        throw new ForbiddenException('Le contrat lié ne correspond pas à la réservation');
      }

      const durationSeconds = body.startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(body.startedAt).getTime()) / 1000))
        : null;

      const inserted = await tx.insert(inspections).values({
        agencyId: req.ctx!.agencyId, clientUuid: body.clientUuid, kind: body.kind,
        contractId: resolvedContractId, reservationId: body.reservationId ?? null,
        vehicleId: resolvedVehicleId, customerId: body.customerId ?? null,
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
          .where(and(eq(vehicles.id, resolvedVehicleId), eq(vehicles.agencyId, req.ctx!.agencyId)));
      }
      if (body.fuelLevelPct != null) {
        await tx.update(vehicles).set({ fuelLevelPct: body.fuelLevelPct, updatedAt: new Date() })
          .where(and(eq(vehicles.id, resolvedVehicleId), eq(vehicles.agencyId, req.ctx!.agencyId)));
      }

      for (const d of body.newDamages) {
        const dmg = await tx.insert(damages).values({
          agencyId: req.ctx!.agencyId, vehicleId: resolvedVehicleId,
          discoveredInspectionId: inspection.id, preexisting: false,
          zoneCode: d.zoneCode, severity: d.severity, description: d.description ?? null,
        }).returning();
        await appendEvent(tx, req.ctx!.agencyId, 'DamageNewOnReturn', {
          damageId: dmg[0]!.id, vehicleId: resolvedVehicleId, zoneCode: d.zoneCode,
          severity: d.severity, contractId: resolvedContractId,
        });
      }
      if (body.kind === 'RETURN' && body.fuelLevelPct != null && body.fuelLevelPct < 25) {
        await appendEvent(tx, req.ctx!.agencyId, 'FuelLowOnReturn', {
          inspectionId: inspection.id, vehicleId: resolvedVehicleId, fuelLevelPct: body.fuelLevelPct,
        });
      }
      if (durationSeconds != null && durationSeconds < 15) {
        await appendEvent(tx, req.ctx!.agencyId, 'InspectionTooFast', {
          inspectionId: inspection.id, durationSeconds,
        });
      }
      await appendEvent(tx, req.ctx!.agencyId, 'InspectionSubmitted', {
        inspectionId: inspection.id, kind: body.kind, vehicleId: resolvedVehicleId, durationSeconds,
      });
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'inspection', entityId: inspection.id, action: 'INSPECTION_SUBMITTED',
        after: { kind: body.kind, mileageKm: body.mileageKm, fuelLevelPct: body.fuelLevelPct, newDamages: body.newDamages.length, contractId: resolvedContractId, vehicleId: resolvedVehicleId },
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
      return { ...photo[0], url: storage.signedUrl(key, 3600, req.ctx!.agencyId) };
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
        photos: photos.map((p) => ({ ...p, url: storage.signedUrl(p.objectKey, 3600, req.ctx!.agencyId) })),
        damages: dmg,
      };
    });
  }

  @Post(':id/complete-return')
  @RequirePermission('inspections:write')
  async completeReturn(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select().from(inspections)
        .where(and(eq(inspections.id, id), eq(inspections.agencyId, req.ctx!.agencyId))).limit(1);
      const insp = rows[0];
      if (!insp) throw new NotFoundException('Inspection introuvable');
      if (insp.kind !== 'RETURN') throw new ForbiddenException('Inspection retour uniquement');

      if (insp.reservationId) {
        const reservation = await tx.select().from(reservations)
          .where(and(eq(reservations.id, insp.reservationId), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1);
        if (!reservation[0]) throw new NotFoundException('Réservation introuvable');
        if (!reservation[0].vehicleId || reservation[0].vehicleId !== insp.vehicleId) {
          throw new ForbiddenException('Le véhicule de l’inspection ne correspond pas à la réservation');
        }
      }
      if (insp.contractId) {
        const contract = await tx.select().from(contracts)
          .where(and(eq(contracts.id, insp.contractId), eq(contracts.agencyId, req.ctx!.agencyId))).limit(1);
        if (!contract[0]) throw new NotFoundException('Contrat introuvable');
        if (contract[0].vehicleId !== insp.vehicleId) {
          throw new ForbiddenException('Le véhicule de l’inspection ne correspond pas au contrat');
        }
        if (insp.reservationId && contract[0].reservationId !== insp.reservationId) {
          throw new ForbiddenException('Le contrat ne correspond pas à la réservation');
        }
      }

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
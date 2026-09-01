import { Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Req, Res, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ContractContent } from '@locaos/domain';
import { withTenant, type Tx } from '../../db/client';
import {
  agencies, branches, contractAmendments, contractVersions, contracts, customers, deposits, damages,
  identityDocuments, inspections, payments, quotes, reservations, vehicleCategories, vehicleModels, vehicles,
} from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { appendEvent, dispatchPendingSafe } from '../events/events.js';
import { assembleContent, loadContract, loadVersionContent, newVersion, nextContractNumber } from './contracts.service.js';
import { buildContractHtml } from './contractHtml.js';
import { htmlToPdf } from '../pdf/pdf.service.js';
import { storage, objectKey, sniffImage } from '../storage/storage.js';
import { transitionVehicle } from '../fleet/fleet.service.js';
import type { Response } from 'express';

@Controller('api/contracts')
@UseGuards(AuthGuard, PermissionsGuard)
export class ContractsController {
  @Get()
  @RequirePermission('contracts:read')
  async list(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select({
        c: contracts,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        plate: vehicles.plate,
      }).from(contracts)
        .innerJoin(customers, eq(customers.id, contracts.customerId))
        .leftJoin(vehicles, eq(vehicles.id, contracts.vehicleId))
        .where(eq(contracts.agencyId, req.ctx!.agencyId))
        .orderBy(desc(contracts.createdAt)).limit(200);
      return rows.map(({ c, customerName, plate }) => ({ ...c, customerName, plate }));
    });
  }

  @Post('blank')
  @RequirePermission('contracts:blank')
  async issueBlank(@Body(new ZodValidationPipe(z.object({ language: z.enum(['fr', 'ar', 'en']) }))) body: { language: 'fr' | 'ar' | 'en' }, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const { number, formatted } = await nextContractNumber(tx, req.ctx!.agencyId);
      const agency = (await tx.select().from(agencies).where(eq(agencies.id, req.ctx!.agencyId)).limit(1))[0]!;
      const content = blankContract(body.language, agency.legalName, agency.iceNumber, formatted);
      const inserted = await tx.insert(contracts).values({
        agencyId: req.ctx!.agencyId, number, language: body.language, status: 'BLANK_ISSUED',
        blankIssuedAt: new Date(),
      }).returning();
      const versionId = await newVersion(tx, req.ctx!.agencyId, inserted[0]!.id, content, req.ctx!.userId);
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: inserted[0]!.id, action: 'BLANK_CONTRACT_ISSUED',
        after: { number, language: body.language },
      });
      await appendEvent(tx, req.ctx!.agencyId, 'BlankContractIssued', { contractId: inserted[0]!.id, number: String(number) });
      return { id: inserted[0]!.id, number, formatted, versionId };
    });
    dispatchPendingSafe();
    return result;
  }

  @Post('blank/:id/reconcile')
  @RequirePermission('contracts:blank')
  async reconcileBlank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(z.object({ reservationId: z.string().uuid(), scannedObjectKey: z.string().optional() }))) body: { reservationId: string; scannedObjectKey?: string },
    @Req() req: AuthedRequest,
  ) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = await loadContract(tx, req.ctx!.agencyId, id);
      if (contract.status !== 'BLANK_ISSUED') throw new ForbiddenException('Ce contrat n’est pas vierge');
      const data = await loadAssemblyData(tx, req.ctx!.agencyId, body.reservationId, contract.vehicleId);
      const content = assembleContent({ ...data, branchName: data.branchOut?.name ?? null, language: contract.language as 'fr' | 'ar' | 'en', contractNumber: fmt(data.agency.contractPrefix, contract.number), mode: 'FULL' });
      await newVersion(tx, req.ctx!.agencyId, id, content, req.ctx!.userId);
      const updated = await tx.update(contracts).set({
        status: 'DRAFT', reservationId: body.reservationId,
        customerId: data.reservation!.customerId, vehicleId: data.reservation!.vehicleId,
        branchId: data.reservation!.branchOutId,
        periodStart: data.reservation!.pickupAt, periodEnd: data.reservation!.returnAt,
        reconciledAt: new Date(), scannedObjectKey: body.scannedObjectKey ?? contract.scannedObjectKey,
        updatedAt: new Date(),
      }).where(eq(contracts.id, id)).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'BLANK_CONTRACT_RECONCILED',
        before: { status: 'BLANK_ISSUED' }, after: { status: 'DRAFT', reservationId: body.reservationId },
      });
      await appendEvent(tx, req.ctx!.agencyId, 'BlankContractReconciled', { contractId: id, number: String(contract.number) });
      return updated[0];
    });
    dispatchPendingSafe();
    return result;
  }

  @Post(':id/void')
  @RequirePermission('contracts:blank')
  async void(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({ reason: z.string().min(3).max(300) }))) body: { reason: string }, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = await loadContract(tx, req.ctx!.agencyId, id);
      if (['ACTIVE', 'CLOSED'].includes(contract.status)) throw new ForbiddenException('Contrat actif — impossible d’annuler');
      const updated = await tx.update(contracts).set({ status: 'VOIDED', voidedReason: body.reason, updatedAt: new Date() })
        .where(eq(contracts.id, id)).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'CONTRACT_VOIDED',
        before: { status: contract.status }, after: { status: 'VOIDED' }, reason: body.reason,
      });
      await appendEvent(tx, req.ctx!.agencyId, 'ContractVoided', { contractId: id, number: String(contract.number), reason: body.reason });
      return updated[0];
    });
    dispatchPendingSafe();
    return result;
  }

  @Post('from-reservation')
  @RequirePermission('contracts:write')
  async fromReservation(@Body(new ZodValidationPipe(z.object({ reservationId: z.string().uuid(), language: z.enum(['fr', 'ar', 'en']).default('fr') }))) body: { reservationId: string; language: 'fr' | 'ar' | 'en' }, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const r = await tx.select().from(reservations)
        .where(and(eq(reservations.id, body.reservationId), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1);
      if (!r[0]) throw new NotFoundException('Réservation introuvable');
      const existing = await tx.select().from(contracts)
        .where(and(eq(contracts.reservationId, body.reservationId), inArray(contracts.status, ['DRAFT', 'SIGNED', 'ACTIVE', 'AMENDED']))).limit(1);
      if (existing[0]) return { contract: existing[0], existing: true };

      const data = await loadAssemblyData(tx, req.ctx!.agencyId, body.reservationId, r[0].vehicleId);
      const { number } = await nextContractNumber(tx, req.ctx!.agencyId);
      const content = assembleContent({ ...data, branchName: data.branchOut?.name ?? null, language: body.language, contractNumber: fmt(data.agency.contractPrefix, number), mode: 'FULL' });
      const inserted = await tx.insert(contracts).values({
        agencyId: req.ctx!.agencyId, number, reservationId: body.reservationId,
        customerId: r[0].customerId, vehicleId: r[0].vehicleId, branchId: r[0].branchOutId,
        language: body.language, status: 'DRAFT',
        periodStart: r[0].pickupAt, periodEnd: r[0].returnAt,
      }).returning();
      await newVersion(tx, req.ctx!.agencyId, inserted[0]!.id, content, req.ctx!.userId);
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: inserted[0]!.id, action: 'CONTRACT_GENERATED',
        after: { number, reservationId: body.reservationId, language: body.language },
      });
      return { contract: inserted[0], existing: false };
    });
  }

  @Get(':id')
  @RequirePermission('contracts:read')
  async detail(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = await loadContract(tx, req.ctx!.agencyId, id);
      const versions = await tx.select().from(contractVersions).where(eq(contractVersions.contractId, id)).orderBy(desc(contractVersions.version));
      const amendments = await tx.select().from(contractAmendments).where(eq(contractAmendments.contractId, id));
      const deps = contract.depositId ? await tx.select().from(deposits).where(eq(deposits.id, contract.depositId)).limit(1) : [];
      const insps = await tx.select().from(inspections).where(eq(inspections.contractId, id));
      const res = contract.reservationId ? await tx.select().from(reservations).where(eq(reservations.id, contract.reservationId)).limit(1) : [];
      return { contract, versions: versions.map((v) => ({ ...v, content: undefined })), amendments, deposit: deps[0] ?? null, inspections: insps, reservation: res[0] ?? null, content: versions[0] ? ContractContent.parse(versions[0].content) : null };
    });
  }

  @Post(':id/sign')
  @RequirePermission('contracts:write')
  async sign(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({ customerName: z.string().min(2).max(120), gpsConsent: z.boolean().default(false) }))) body: { customerName: string; gpsConsent: boolean }, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = await loadContract(tx, req.ctx!.agencyId, id);
      if (!['DRAFT', 'BLANK_ISSUED'].includes(contract.status)) throw new ForbiddenException('Statut non signable');
      const content = await loadVersionContent(tx, id, contract.currentVersionId);
      content.signatures = {
        customer: { present: true, name: body.customerName, at: new Date().toISOString() },
        agent: { present: true, name: req.ctx!.fullName, at: new Date().toISOString() },
      };
      content.consents = (content.consents ?? []).map((c) => c.purpose === 'GPS_TRACKING' ? { ...c, granted: body.gpsConsent } : c);
      content.header.mode = 'FULL';
      await newVersion(tx, req.ctx!.agencyId, id, content, req.ctx!.userId);
      const updated = await tx.update(contracts).set({ status: 'SIGNED', updatedAt: new Date() }).where(eq(contracts.id, id)).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'CONTRACT_SIGNED',
        before: { status: contract.status }, after: { status: 'SIGNED' },
      });
      await appendEvent(tx, req.ctx!.agencyId, 'ContractSigned', { contractId: id, number: String(contract.number), language: contract.language });
      return updated[0];
    });
    dispatchPendingSafe();
    return result;
  }

  @Post(':id/activate')
  @RequirePermission('contracts:write')
  async activate(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = await loadContract(tx, req.ctx!.agencyId, id);
      if (contract.status !== 'SIGNED') throw new ForbiddenException('Le contrat doit être signé avant remise');
      if (!contract.vehicleId) throw new ForbiddenException('Aucun véhicule affecté');
      if (!contract.reservationId) throw new ForbiddenException('Une réservation est requise pour la remise');

      const reservation = (await tx.select().from(reservations)
        .where(and(eq(reservations.id, contract.reservationId), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1))[0];
      if (!reservation) throw new NotFoundException('Réservation introuvable');
      if (reservation.status !== 'READY') throw new ForbiddenException('La réservation doit être READY avant remise');
      if (reservation.vehicleId !== contract.vehicleId) throw new ForbiddenException('Le véhicule du contrat ne correspond pas à la réservation');

      const vehicle = (await tx.select().from(vehicles)
        .where(and(eq(vehicles.id, contract.vehicleId), eq(vehicles.agencyId, req.ctx!.agencyId))).limit(1))[0];
      if (!vehicle) throw new NotFoundException('Véhicule introuvable');
      if (vehicle.categoryId !== reservation.categoryId) throw new ForbiddenException('Le véhicule ne correspond pas à la catégorie réservée');
      if (vehicle.fleetStatus !== 'IN_FLEET') throw new ForbiddenException('Le véhicule n’est plus dans la flotte opérationnelle');

      const conflictingReservation = await tx.select({ reference: reservations.reference })
        .from(reservations)
        .where(and(
          eq(reservations.agencyId, req.ctx!.agencyId),
          eq(reservations.vehicleId, vehicle.id),
          sql`${reservations.id} <> ${reservation.id}`,
          inArray(reservations.status, ['CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS'] as any),
          sql`${reservations.pickupAt} < ${reservation.returnAt}`,
          sql`${reservations.returnAt} > ${reservation.pickupAt}`,
        )).limit(1);
      if (conflictingReservation[0]) throw new ForbiddenException(`Véhicule déjà engagé sur ${conflictingReservation[0].reference}`);

      const departure = await tx.select().from(inspections)
        .where(and(eq(inspections.reservationId, reservation.id), eq(inspections.kind, 'DEPARTURE'))).limit(1);
      if (!departure[0]) throw new ForbiddenException('Inspection départ obligatoire avant remise');

      const quote = reservation.quoteId
        ? (await tx.select().from(quotes).where(eq(quotes.id, reservation.quoteId)).limit(1))[0]
        : null;
      const requiredDeposit = quote?.depositRequired ?? 0n;
      if (requiredDeposit > 0n) {
        const secured = await tx.select().from(deposits)
          .where(and(eq(deposits.contractId, contract.id), inArray(deposits.status, ['HELD', 'PRE_AUTHORIZED', 'PARTIALLY_CHARGED']))).limit(1);
        if (!secured[0]) throw new ForbiddenException('Caution requise avant remise');
      }

      const updated = await tx.update(contracts).set({ status: 'ACTIVE', updatedAt: new Date() }).where(eq(contracts.id, id)).returning();
      await transitionVehicle(tx, req.ctx!.agencyId, {
        vehicleId: contract.vehicleId, to: 'RENTED',
        actorId: req.ctx!.userId, actorName: req.ctx!.fullName, actorKind: 'CONTRACT_SERVICE',
        reason: `Remise du véhicule — contrat ${contract.number}`, sourceType: 'contract', sourceId: id,
      });
      await tx.update(reservations).set({ status: 'IN_PROGRESS', updatedAt: new Date() }).where(eq(reservations.id, reservation.id));
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'CONTRACT_ACTIVATED',
        before: { status: 'SIGNED' }, after: { status: 'ACTIVE' },
      });
      return updated[0];
    });
  }

  @Post(':id/close')
  @RequirePermission('contracts:write')
  async close(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const contractRows = await tx.select().from(contracts)
        .where(and(eq(contracts.id, id), eq(contracts.agencyId, req.ctx!.agencyId)))
        .for('update').limit(1);
      const contract = contractRows[0];
      if (!contract) throw new NotFoundException('Contrat introuvable');
      if (contract.status !== 'ACTIVE' && contract.status !== 'AMENDED') throw new ForbiddenException('Contrat non actif');
      if (!contract.reservationId) throw new ConflictException({ error: { code: 'RETURN_FLOW_INCOMPLETE', message: 'Une réservation est requise pour clôturer le contrat' } });
      if (!contract.vehicleId) throw new ConflictException({ error: { code: 'RETURN_FLOW_INCOMPLETE', message: 'Un véhicule est requis pour clôturer le contrat' } });

      const reservation = (await tx.select().from(reservations)
        .where(and(eq(reservations.id, contract.reservationId), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1))[0];
      if (!reservation) throw new NotFoundException('Réservation introuvable');
      if (reservation.vehicleId !== contract.vehicleId) {
        throw new ConflictException({ error: { code: 'RETURN_VEHICLE_MISMATCH', message: 'Le véhicule du contrat ne correspond plus à la réservation' } });
      }

      const returnInspection = (await tx.select().from(inspections)
        .where(and(
          eq(inspections.agencyId, req.ctx!.agencyId),
          eq(inspections.contractId, contract.id),
          eq(inspections.reservationId, reservation.id),
          eq(inspections.vehicleId, contract.vehicleId),
          eq(inspections.kind, 'RETURN'),
        )).orderBy(desc(inspections.submittedAt)).limit(1))[0];
      if (!returnInspection) {
        throw new ConflictException({
          error: { code: 'RETURN_INSPECTION_REQUIRED', message: 'Inspection retour obligatoire avant clôture' },
        });
      }

      const vehicle = (await tx.select().from(vehicles)
        .where(and(eq(vehicles.id, contract.vehicleId), eq(vehicles.agencyId, req.ctx!.agencyId)))
        .for('update').limit(1))[0];
      if (!vehicle) throw new NotFoundException('Véhicule introuvable');
      if (['RENTED', 'OVERDUE', 'AWAITING_INSPECTION'].includes(vehicle.operationalStatus)) {
        throw new ConflictException({
          error: { code: 'RETURN_INSPECTION_INCOMPLETE', message: 'Inspection retour doit être terminée avant clôture', vehicleStatus: vehicle.operationalStatus },
        });
      }

      if (contract.depositId) {
        const deposit = (await tx.select().from(deposits)
          .where(and(eq(deposits.id, contract.depositId), eq(deposits.agencyId, req.ctx!.agencyId))).limit(1))[0];
        if (!deposit) throw new ConflictException({ error: { code: 'DEPOSIT_MISSING', message: 'Caution du contrat introuvable' } });
        if (!['RELEASED', 'SETTLED'].includes(deposit.status)) {
          throw new ConflictException({
            error: { code: 'DEPOSIT_NOT_FINALIZED', message: 'La caution doit être libérée ou soldée avant clôture', depositStatus: deposit.status },
          });
        }
      }

      const content = await loadVersionContent(tx, id, contract.currentVersionId);
      const totalText = content.pricing?.total;
      if (totalText == null || !/^\d+(\.\d{1,2})?$/.test(String(totalText))) {
        throw new ConflictException({ error: { code: 'CONTRACT_PRICING_MISSING', message: 'Montant final du contrat introuvable pour le décompte' } });
      }
      const totalCents = BigInt(Math.round(Number(totalText) * 100));
      const rentalPayments = await tx.select({
        balance: sql<string>`coalesce(sum(case when ${payments.direction} = 'IN' then ${payments.amount} else -${payments.amount} end), 0)`,
      }).from(payments).where(and(
        eq(payments.agencyId, req.ctx!.agencyId),
        eq(payments.contractId, contract.id),
        eq(payments.purpose, 'RENTAL'),
      ));
      const paidRental = BigInt(rentalPayments[0]?.balance ?? '0');
      if (paidRental < totalCents) {
        throw new ConflictException({
          error: {
            code: 'CONTRACT_NOT_SETTLED',
            message: 'Le décompte reste impayé avant clôture',
            requiredCents: totalCents.toString(),
            paidCents: paidRental.toString(),
            outstandingCents: (totalCents - paidRental).toString(),
          },
        });
      }

      const unresolvedDamages = await tx.select({ id: damages.id, zoneCode: damages.zoneCode })
        .from(damages)
        .where(and(
          eq(damages.agencyId, req.ctx!.agencyId),
          eq(damages.vehicleId, contract.vehicleId),
          eq(damages.discoveredInspectionId, returnInspection.id),
          eq(damages.preexisting, false),
          eq(damages.resolution, 'NONE'),
        ));
      if (unresolvedDamages.length > 0) {
        throw new ConflictException({
          error: {
            code: 'DAMAGE_NOT_RESOLVED',
            message: 'Des dommages découverts au retour ne sont pas encore résolus',
            damageIds: unresolvedDamages.map((d) => d.id),
            zones: unresolvedDamages.map((d) => d.zoneCode),
          },
        });
      }

      const updated = await tx.update(contracts).set({ status: 'CLOSED', updatedAt: new Date() })
        .where(eq(contracts.id, id)).returning();
      await tx.update(reservations).set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(and(eq(reservations.id, reservation.id), eq(reservations.agencyId, req.ctx!.agencyId)));

      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'CONTRACT_CLOSED',
        before: { status: contract.status },
        after: { status: 'CLOSED', vehicleStatus: vehicle.operationalStatus, settlement: 'SETTLED' },
      });
      await appendEvent(tx, req.ctx!.agencyId, 'ContractClosed', {
        contractId: id, number: String(contract.number), reservationId: reservation.id,
        vehicleId: contract.vehicleId, vehicleStatus: vehicle.operationalStatus,
        returnInspectionId: returnInspection.id,
      });
      return updated[0];
    });
  }

  @Post(':id/amendments')
  @RequirePermission('contract:amend')
  async amend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(z.object({
      kind: z.enum(['VEHICLE_REPLACEMENT', 'PERIOD', 'DRIVER', 'PRICE', 'OTHER']),
      reason: z.string().min(3).max(300),
      newVehicleId: z.string().uuid().optional(),
      newReturnAt: z.string().datetime().optional(),
      newDriver: z.object({ name: z.string().max(120), licenseNumber: z.string().max(40), birthDate: z.string().date().optional() }).optional(),
      newDailyRate: z.number().optional(),
    }))) body: {
      kind: 'VEHICLE_REPLACEMENT' | 'PERIOD' | 'DRIVER' | 'PRICE' | 'OTHER'; reason: string;
      newVehicleId?: string; newReturnAt?: string; newDriver?: { name: string; licenseNumber: string; birthDate?: string }; newDailyRate?: number;
    },
    @Req() req: AuthedRequest,
  ) {
    if (body.kind === 'PRICE' && !req.ctx!.permissions.has('contract:price:override')) {
      throw new ForbiddenException('Permission contract:price:override requise');
    }
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = await loadContract(tx, req.ctx!.agencyId, id);
      if (!['SIGNED', 'ACTIVE', 'AMENDED'].includes(contract.status)) throw new ForbiddenException('Contrat non amendable');
      const content = await loadVersionContent(tx, id, contract.currentVersionId);

      if (body.kind === 'VEHICLE_REPLACEMENT') {
        if (!body.newVehicleId) throw new ForbiddenException('newVehicleId requis');
        const v = await tx.select().from(vehicles)
          .where(and(eq(vehicles.id, body.newVehicleId), eq(vehicles.agencyId, req.ctx!.agencyId))).limit(1);
        if (!v[0]) throw new NotFoundException('Véhicule introuvable');
        const m = await tx.select().from(vehicleModels).where(eq(vehicleModels.id, v[0].modelId)).limit(1);
        content.vehicle = {
          plate: v[0].plate, makeModel: m[0] ? `${m[0].make} ${m[0].model} (${m[0].year})` : null,
          category: content.vehicle.category, mileageOut: String(v[0].currentMileageKm),
          fuelOut: `${v[0].fuelLevelPct}%`, vin: v[0].vin,
        };
        await tx.update(contracts).set({ vehicleId: body.newVehicleId, status: 'AMENDED', updatedAt: new Date() }).where(eq(contracts.id, id));
      } else if (body.kind === 'PERIOD') {
        if (!body.newReturnAt) throw new ForbiddenException('newReturnAt requis');
        content.period.returnAt = body.newReturnAt;
        await tx.update(contracts).set({ periodEnd: new Date(body.newReturnAt), status: 'AMENDED', updatedAt: new Date() }).where(eq(contracts.id, id));
      } else if (body.kind === 'DRIVER') {
        if (!body.newDriver) throw new ForbiddenException('newDriver requis');
        content.drivers = [...(content.drivers ?? []), { name: body.newDriver.name, licenseNumber: body.newDriver.licenseNumber, birthDate: body.newDriver.birthDate ?? null }];
        await tx.update(contracts).set({ status: 'AMENDED', updatedAt: new Date() }).where(eq(contracts.id, id));
      } else if (body.kind === 'PRICE') {
        if (body.newDailyRate == null) throw new ForbiddenException('newDailyRate requis');
        const oldRate = content.pricing.dailyRate;
        content.pricing.dailyRate = String(body.newDailyRate);
        const days = Number(content.pricing.days ?? 1);
        content.pricing.total = String(body.newDailyRate * days);
        await tx.update(contracts).set({ status: 'AMENDED', updatedAt: new Date() }).where(eq(contracts.id, id));
        await appendEvent(tx, req.ctx!.agencyId, 'PriceOverridden', {
          contractId: id, reservationId: contract.reservationId,
          from: oldRate ?? '0', to: String(body.newDailyRate), reason: body.reason,
        });
      } else {
        await tx.update(contracts).set({ status: 'AMENDED', updatedAt: new Date() }).where(eq(contracts.id, id));
      }

      const versionId = await newVersion(tx, req.ctx!.agencyId, id, content, req.ctx!.userId);
      const amendment = await tx.insert(contractAmendments).values({
        agencyId: req.ctx!.agencyId, contractId: id, kind: body.kind,
        payload: body as never, reason: body.reason, createdBy: req.ctx!.userId, resultingVersionId: versionId,
      }).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'CONTRACT_AMENDED',
        after: { kind: body.kind }, reason: body.reason,
      });
      await appendEvent(tx, req.ctx!.agencyId, 'ContractAmended', { contractId: id, number: String(contract.number), kind: body.kind });
      return amendment[0];
    });
    dispatchPendingSafe();
    return result;
  }

  @Get(':id/pdf')
  @RequirePermission('contracts:read')
  async pdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response, @Req() req: AuthedRequest) {
    const { content } = await withTenant(req.ctx!.agencyId, async (tx) => {
      const contract = await loadContract(tx, req.ctx!.agencyId, id);
      return { content: await loadVersionContent(tx, id, contract.currentVersionId) };
    });
    const pdf = await htmlToPdf(buildContractHtml(content));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=\"contrat-${id}.pdf\"`);
    res.send(pdf);
  }

  @Post(':id/scan')
  @RequirePermission('contracts:blank')
  @UseInterceptors(FileInterceptor('file'))
  async uploadScan(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File, @Req() req: AuthedRequest) {
    const sniffed = sniffImage(file.buffer);
    if (!sniffed || file.size > 10 * 1024 * 1024) throw new ForbiddenException('Image invalide (JPG/PNG/WebP ≤ 10 Mo)');
    const key = objectKey(req.ctx!.agencyId, 'contract-scans', 'scan.jpg');
    await storage.put(key, file.buffer, sniffed);
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const updated = await tx.update(contracts).set({ scannedObjectKey: key, updatedAt: new Date() })
        .where(and(eq(contracts.id, id), eq(contracts.agencyId, req.ctx!.agencyId))).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'PAPER_SCAN_ATTACHED', after: { key },
      });
      return { ...updated[0], scannedUrl: storage.signedUrl(key, 3600, req.ctx!.agencyId) };
    });
  }
}

const fmt = (prefix: string, n: number) => `${prefix}-${new Date().getFullYear()}-${String(n).padStart(5, '0')}`;

function blankContract(language: 'fr' | 'ar' | 'en', agencyName: string, ice: string | null, formatted: string): ContractContent {
  const { blankContractContent } = require('@locaos/domain') as typeof import('@locaos/domain');
  return blankContractContent({ agencyName, agencyIce: ice, branchName: null, contractNumber: formatted, language });
}

async function loadAssemblyData(tx: Tx, agencyId: string, reservationId: string, vehicleId: string | null) {
  const r = await tx.select().from(reservations)
    .where(and(eq(reservations.id, reservationId), eq(reservations.agencyId, agencyId))).limit(1);
  if (!r[0]) throw new NotFoundException('Réservation introuvable');
  const reservation = r[0];
  const agency = (await tx.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1))[0]!;
  const cust = (await tx.select().from(customers).where(eq(customers.id, reservation.customerId)).limit(1))[0]!;
  const docs = await tx.select().from(identityDocuments).where(eq(identityDocuments.customerId, reservation.customerId));
  const vehicle = vehicleId ? (await tx.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1))[0] ?? null : null;
  const model = vehicle ? (await tx.select().from(vehicleModels).where(eq(vehicleModels.id, vehicle.modelId)).limit(1))[0] ?? null : null;
  const category = (await tx.select().from(vehicleCategories).where(eq(vehicleCategories.id, reservation.categoryId)).limit(1))[0] ?? null;
  const quote = reservation.quoteId ? (await tx.select().from(quotes).where(eq(quotes.id, reservation.quoteId)).limit(1))[0] ?? null : null;
  const branchOut = (await tx.select().from(branches).where(eq(branches.id, reservation.branchOutId)).limit(1))[0] ?? null;
  const branchIn = (await tx.select().from(branches).where(eq(branches.id, reservation.branchInId)).limit(1))[0] ?? null;
  return { agency, agencyName: agency.legalName, agencyIce: agency.iceNumber, reservation, customer: cust, identityDocs: docs, vehicle, vehicleModel: model, category, quote, deposit: null, branchOut, branchIn };
}

import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { computeQuote, canTransitionReservation, type ReservationStatus } from '@locaos/domain';
import { withTenant } from '../../db/client';
import { contracts } from '../../db/schema';
import { customers, quotes, reservations, vehicleCategories, vehicles } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { appendEvent, dispatchPendingSafe } from '../events/events.js';
import { computeBlockers } from '../alerts/scheduler.js';

const CreateSchema = z.object({
  customerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  vehicleId: z.string().uuid().nullable().optional(),
  branchOutId: z.string().uuid(),
  branchInId: z.string().uuid(),
  pickupAt: z.string().datetime(),
  returnAt: z.string().datetime(),
  dailyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Montant en MAD (ex: 350 ou 350.50)'),
  discountPercent: z.number().min(0).max(50).optional(),
  extras: z.array(z.object({ code: z.string().max(20), label: z.string().max(60), unitAmount: z.string(), qty: z.number().int().min(1).max(30) })).optional(),
  deliveryFee: z.string().optional(),
  flightNumber: z.string().max(20).optional(),
  deliveryKind: z.enum(['AIRPORT', 'HOTEL', 'CUSTOMER_SITE', 'BRANCH']).nullable().optional(),
  deliveryAddress: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
}).refine((v) => new Date(v.returnAt) > new Date(v.pickupAt), { message: 'returnAt doit être après pickupAt' });

const cents = (s: string) => BigInt(Math.round(Number(s) * 100));
const ASSIGNABLE_VEHICLE_STATUSES = ['AVAILABLE', 'RESERVED', 'PREPARING', 'CONTRACT_READY', 'IN_TRANSIT'] as const;
const BOOKING_VEHICLE_STATUSES = ['CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS'] as const;
const LIVE_CONTRACT_STATUSES = ['SIGNED', 'ACTIVE', 'AMENDED'] as const;

async function assertVehicleAssignable(tx: any, agencyId: string, reservation: typeof reservations.$inferSelect, vehicleId: string) {
  const vehicle = (await tx.select().from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.agencyId, agencyId))).limit(1))[0];
  if (!vehicle) throw new NotFoundException('Véhicule introuvable');
  if (vehicle.categoryId !== reservation.categoryId) throw new ConflictException({ error: { code: 'VEHICLE_CATEGORY_MISMATCH', message: 'Le véhicule ne correspond pas à la catégorie réservée' } });
  if (vehicle.fleetStatus !== 'IN_FLEET') throw new ConflictException({ error: { code: 'VEHICLE_NOT_IN_FLEET', message: 'Le véhicule n’est pas dans la flotte opérationnelle' } });
  if (!ASSIGNABLE_VEHICLE_STATUSES.includes(vehicle.operationalStatus as typeof ASSIGNABLE_VEHICLE_STATUSES[number])) {
    throw new ConflictException({ error: { code: 'VEHICLE_NOT_ASSIGNABLE', message: `Véhicule non affectable depuis le statut ${vehicle.operationalStatus}` } });
  }

  const overlappingReservations = await tx.select({ id: reservations.id, reference: reservations.reference })
    .from(reservations)
    .where(and(
      eq(reservations.agencyId, agencyId),
      eq(reservations.vehicleId, vehicleId),
      sql`${reservations.id} <> ${reservation.id}`,
      inArray(reservations.status, BOOKING_VEHICLE_STATUSES as unknown as ReservationStatus[]),
      sql`${reservations.pickupAt} < ${reservation.returnAt}`,
      sql`${reservations.returnAt} > ${reservation.pickupAt}`,
    )).limit(1);
  if (overlappingReservations[0]) {
    throw new ConflictException({ error: { code: 'VEHICLE_RESERVATION_CONFLICT', message: `Véhicule déjà engagé sur ${overlappingReservations[0].reference}` } });
  }

  const overlappingContracts = await tx.select({ id: contracts.id, number: contracts.number })
    .from(contracts)
    .where(and(
      eq(contracts.agencyId, agencyId),
      eq(contracts.vehicleId, vehicleId),
      inArray(contracts.status, LIVE_CONTRACT_STATUSES),
      sql`${contracts.periodStart} < ${reservation.returnAt}`,
      sql`${contracts.periodEnd} > ${reservation.pickupAt}`,
    )).limit(1);
  if (overlappingContracts[0]) {
    throw new ConflictException({ error: { code: 'VEHICLE_CONTRACT_CONFLICT', message: `Véhicule déjà engagé sur le contrat ${overlappingContracts[0].number}` } });
  }
  return vehicle;
}

@Controller('api/reservations')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReservationsController {
  @Get()
  @RequirePermission('reservations:read')
  async list(@Req() req: AuthedRequest) {
    const { from, to, status } = req.query as { from?: string; to?: string; status?: string };
    return withTenant(req.ctx!.agencyId, (tx) => {
      const conds = [eq(reservations.agencyId, req.ctx!.agencyId)];
      if (from) conds.push(gte(reservations.pickupAt, new Date(from)));
      if (to) conds.push(lte(reservations.pickupAt, new Date(to)));
      if (status) conds.push(inArray(reservations.status, status.split(',') as ReservationStatus[]));
      return tx.select().from(reservations).where(and(...conds)).orderBy(desc(reservations.pickupAt)).limit(300);
    });
  }

  @Post()
  @RequirePermission('reservations:write')
  async create(@Body(new ZodValidationPipe(CreateSchema)) body: z.infer<typeof CreateSchema>, @Req() req: AuthedRequest) {
    const agencyId = req.ctx!.agencyId;
    const created = await withTenant(agencyId, async (tx) => {
      const cat = await tx.select().from(vehicleCategories)
        .where(and(eq(vehicleCategories.id, body.categoryId), eq(vehicleCategories.agencyId, agencyId))).limit(1);
      if (!cat[0]) throw new NotFoundException('Catégorie introuvable');

      const dailyRate = cents(body.dailyRate);
      const quote = computeQuote({
        dailyRate, floorDailyRate: cat[0].floorDailyRate,
        pickupAt: new Date(body.pickupAt), returnAt: new Date(body.returnAt),
        extras: body.extras?.map((e) => ({ code: e.code, label: e.label, unitAmount: cents(e.unitAmount), qty: e.qty })),
        deliveryFee: body.deliveryFee ? cents(body.deliveryFee) : undefined,
        discountPercent: body.discountPercent,
        depositAmount: cat[0].defaultDeposit,
      });

      if (body.vehicleId) {
        const active = await tx.select().from(contracts)
          .where(and(eq(contracts.vehicleId, body.vehicleId), inArray(contracts.status, ['ACTIVE', 'AMENDED']))).limit(1);
        const c = active[0];
        if (c?.periodEnd && new Date(body.pickupAt) < c.periodEnd) {
          throw new ConflictException({
            error: { code: 'VEHICLE_STILL_OUT', message: `Véhicule encore loué (contrat ${c.number}) jusqu’au ${c.periodEnd.toISOString()}`, contractId: c.id },
          });
        }
      }
      const ref = `RES-${Date.now().toString(36).toUpperCase()}`;
      const res = await tx.insert(reservations).values({
        agencyId, reference: ref,
        customerId: body.customerId, categoryId: body.categoryId,
        vehicleId: body.vehicleId ?? null,
        branchOutId: body.branchOutId, branchInId: body.branchInId,
        pickupAt: new Date(body.pickupAt), returnAt: new Date(body.returnAt),
        status: body.vehicleId ? 'VEHICLE_ASSIGNED' : 'CONFIRMED',
        flightNumber: body.flightNumber ?? null,
        deliveryKind: body.deliveryKind ?? null, deliveryAddress: body.deliveryAddress ?? null,
        notes: body.notes ?? null,
      }).returning();

      const q = await tx.insert(quotes).values({
        agencyId, reservationId: res[0]!.id, version: 1,
        lines: JSON.parse(JSON.stringify(quote.lines, (_, v) => typeof v === 'bigint' ? v.toString() : v)),
        days: quote.days,
        subtotal: quote.subtotal, discount: quote.discount, total: quote.total,
        depositRequired: quote.depositRequired, belowFloor: quote.belowFloor,
        inputs: { dailyRate: dailyRate.toString(), pickupAt: body.pickupAt, returnAt: body.returnAt, discountPercent: body.discountPercent ?? 0 },
        createdBy: req.ctx!.userId,
      }).returning();
      await tx.update(reservations).set({ quoteId: q[0]!.id }).where(eq(reservations.id, res[0]!.id));

      await audit(tx, {
        agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'reservation', entityId: res[0]!.id, action: 'RESERVATION_CREATED',
        after: { reference: ref, vehicleId: body.vehicleId ?? null, total: quote.total.toString() },
      });
      await appendEvent(tx, agencyId, 'ReservationCreated', {
        reservationId: res[0]!.id, reference: ref, vehicleId: body.vehicleId ?? null, pickupAt: body.pickupAt,
      });
      if (quote.belowFloor) {
        await appendEvent(tx, agencyId, 'QuoteBelowFloor', {
          reservationId: res[0]!.id, reference: ref,
          dailyRate: dailyRate.toString(), floor: cat[0].floorDailyRate.toString(),
        });
      }
      return { reservation: { ...res[0], quoteId: q[0]!.id }, quote };
    });
    dispatchPendingSafe();
    return created;
  }

  @Get('calendar')
  @RequirePermission('reservations:read')
  async calendar(@Req() req: AuthedRequest) {
    const from = new Date((req.query.from as string) ?? Date.now() - 7 * 86_400_000);
    const to = new Date((req.query.to as string) ?? Date.now() + 21 * 86_400_000);
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select({
        r: reservations, customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        plate: vehicles.plate, categoryName: vehicleCategories.name,
      }).from(reservations)
        .innerJoin(customers, eq(customers.id, reservations.customerId))
        .innerJoin(vehicleCategories, eq(vehicleCategories.id, reservations.categoryId))
        .leftJoin(vehicles, eq(vehicles.id, reservations.vehicleId))
        .where(and(
          eq(reservations.agencyId, req.ctx!.agencyId),
          gte(reservations.returnAt, from), lte(reservations.pickupAt, to),
          sql`${reservations.status} not in ('CANCELLED','NO_SHOW')`,
        ));
      return rows.map(({ r, customerName, plate, categoryName }) => ({
        id: r.id, reference: r.reference, status: r.status,
        pickupAt: r.pickupAt, returnAt: r.returnAt,
        customerId: r.customerId, customerName, vehicleId: r.vehicleId, plate, categoryName,
      }));
    });
  }

  @Get(':id')
  @RequirePermission('reservations:read')
  async detail(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const r = await tx.select().from(reservations)
        .where(and(eq(reservations.id, id), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1);
      if (!r[0]) throw new NotFoundException('Réservation introuvable');
      const cust = await tx.select().from(customers).where(eq(customers.id, r[0].customerId)).limit(1);
      const qs = await tx.select().from(quotes).where(eq(quotes.reservationId, id)).orderBy(desc(quotes.version));
      const cat = await tx.select().from(vehicleCategories).where(eq(vehicleCategories.id, r[0].categoryId)).limit(1);
      const veh = r[0].vehicleId
        ? await tx.select().from(vehicles).where(eq(vehicles.id, r[0].vehicleId)).limit(1) : [];
      const blockers = await computeBlockers(tx as never, r[0] as never);
      return { reservation: r[0], customer: cust[0], quotes: qs, category: cat[0], vehicle: veh[0] ?? null, blockers };
    });
  }

  @Post(':id/assign-vehicle')
  @RequirePermission('reservations:write')
  async assign(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({ vehicleId: z.string().uuid() }))) body: { vehicleId: string }, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const r = await tx.select().from(reservations)
        .where(and(eq(reservations.id, id), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1);
      if (!r[0]) throw new NotFoundException('Réservation introuvable');
      if (!['CONFIRMED', 'VEHICLE_ASSIGNED'].includes(r[0].status)) {
        throw new ForbiddenException('Affectation impossible depuis ce statut');
      }
      await assertVehicleAssignable(tx, req.ctx!.agencyId, r[0], body.vehicleId);
      const updated = await tx.update(reservations)
        .set({ vehicleId: body.vehicleId, status: 'VEHICLE_ASSIGNED', updatedAt: new Date() })
        .where(eq(reservations.id, id)).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'reservation', entityId: id, action: 'VEHICLE_ASSIGNED',
        before: { vehicleId: r[0].vehicleId }, after: { vehicleId: body.vehicleId },
      });
      return updated[0];
    });
  }

  @Post(':id/status')
  @RequirePermission('reservations:write')
  async status(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({ to: z.enum(['CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']), reason: z.string().max(300).optional() }))) body: { to: ReservationStatus; reason?: string }, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const r = await tx.select().from(reservations)
        .where(and(eq(reservations.id, id), eq(reservations.agencyId, req.ctx!.agencyId))).limit(1);
      if (!r[0]) throw new NotFoundException('Réservation introuvable');
      if (!canTransitionReservation(r[0].status as ReservationStatus, body.to)) {
        throw new ForbiddenException(`Transition ${r[0].status} → ${body.to} non autorisée`);
      }
      if (body.to === 'READY') {
        const blockers = await computeBlockers(tx as never, r[0] as never);
        if (blockers.length > 0) {
          throw new ConflictException({
            error: { code: 'RESERVATION_NOT_READY', message: `Réservation non prête: ${blockers.join(', ')}`, blockers },
          });
        }
      }
      if (body.to === 'CANCELLED' && !req.ctx!.permissions.has('reservations:cancel')) {
        throw new ForbiddenException('Permission reservations:cancel requise');
      }
      const updated = await tx.update(reservations)
        .set({ status: body.to, cancelledReason: body.to === 'CANCELLED' ? (body.reason ?? null) : null, updatedAt: new Date() })
        .where(eq(reservations.id, id)).returning();
      await audit(tx, {
        agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'reservation', entityId: id, action: 'RESERVATION_STATUS',
        before: { status: r[0].status }, after: { status: body.to }, reason: body.reason ?? null,
      });
      await appendEvent(tx, req.ctx!.agencyId, 'ReservationStatusChanged', {
        reservationId: id, reference: r[0].reference, from: r[0].status, to: body.to,
      });
      return updated[0];
    });
    dispatchPendingSafe();
    return result;
  }
}

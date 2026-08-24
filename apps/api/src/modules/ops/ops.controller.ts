import { Controller, Get, Query, UseGuards, Req} from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { withTenant } from '../../db/client';
import {
  alerts, branches, cashSessions, contracts, customers, deposits, inspections, payments,
  reservations, vehicleCategories, vehicles,
} from '../../db/schema';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { computeBlockers } from '../alerts/scheduler.js';

const dayBounds = (d = new Date()) => {
  // Africa/Casablanca day bounds (UTC math: TZ is UTC+1 except around Ramadan)
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', dateStyle: 'short' });
  const day = fmt.format(d); // YYYY-MM-DD
  const start = new Date(`${day}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end, nextEnd: new Date(start.getTime() + 2 * 86_400_000) };
};

@Controller('api/ops')
@UseGuards(AuthGuard, PermissionsGuard)
export class OpsController {
  @Get('today')
  @RequirePermission('ops:read')
  async today(@Req() req: AuthedRequest) {
    const { start, end, nextEnd } = dayBounds();
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const dep = await tx.select({
        r: reservations, customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        plate: vehicles.plate, categoryName: vehicleCategories.name,
      }).from(reservations)
        .innerJoin(customers, eq(customers.id, reservations.customerId))
        .innerJoin(vehicleCategories, eq(vehicleCategories.id, reservations.categoryId))
        .leftJoin(vehicles, eq(vehicles.id, reservations.vehicleId))
        .where(and(
          eq(reservations.agencyId, req.ctx!.agencyId),
          gte(reservations.pickupAt, start), lte(reservations.pickupAt, end),
          inArray(reservations.status, ['CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS']),
        )).orderBy(reservations.pickupAt);

      const ret = await tx.select({
        r: reservations, customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        plate: vehicles.plate, categoryName: vehicleCategories.name,
      }).from(reservations)
        .innerJoin(customers, eq(customers.id, reservations.customerId))
        .innerJoin(vehicleCategories, eq(vehicleCategories.id, reservations.categoryId))
        .leftJoin(vehicles, eq(vehicles.id, reservations.vehicleId))
        .where(and(
          eq(reservations.agencyId, req.ctx!.agencyId),
          gte(reservations.returnAt, start), lte(reservations.returnAt, end),
          inArray(reservations.status, ['IN_PROGRESS', 'READY', 'VEHICLE_ASSIGNED', 'CONFIRMED']),
        )).orderBy(reservations.returnAt);

      const departures = [];
      for (const row of dep) {
        const blockers = await computeBlockers(tx as never, row.r as never);
        const c = row.r.vehicleId ? await tx.select().from(contracts)
          .where(and(eq(contracts.reservationId, row.r.id), inArray(contracts.status, ['DRAFT', 'SIGNED', 'ACTIVE', 'AMENDED']))).limit(1) : [];
        departures.push({
          reservation: row.r, customerName: row.customerName, plate: row.plate, categoryName: row.categoryName,
          blockers, contractId: c[0]?.id ?? null, contractStatus: c[0]?.status ?? null,
        });
      }

      const returns = [];
      for (const row of ret) {
        const c = row.r.vehicleId ? await tx.select().from(contracts)
          .where(and(eq(contracts.reservationId, row.r.id), inArray(contracts.status, ['ACTIVE', 'SIGNED', 'CLOSED', 'AMENDED']))).limit(1) : [];
        const insp = c[0] ? await tx.select().from(inspections)
          .where(and(eq(inspections.contractId, c[0].id), eq(inspections.kind, 'RETURN'))).limit(1) : [];
        const veh = row.r.vehicleId ? await tx.select().from(vehicles).where(eq(vehicles.id, row.r.vehicleId)).limit(1) : [];
        returns.push({
          reservation: row.r, customerName: row.customerName, plate: row.plate, categoryName: row.categoryName,
          contractId: c[0]?.id ?? null, contractStatus: c[0]?.status ?? null,
          returnInspectionDone: Boolean(insp[0]), vehicleStatus: veh[0]?.operationalStatus ?? null,
        });
      }

      const pendingTransfers = await tx.select({
        t: (await import('../../db/schema.js')).vehicleTransfers, plate: vehicles.plate,
      }).from((await import('../../db/schema.js')).vehicleTransfers)
        .innerJoin(vehicles, eq(vehicles.id, (await import('../../db/schema.js')).vehicleTransfers.vehicleId))
        .where(and(eq((await import('../../db/schema.js')).vehicleTransfers.agencyId, req.ctx!.agencyId),
          inArray((await import('../../db/schema.js')).vehicleTransfers.status, ['RECOMMENDED', 'APPROVED'])));

      const tomorrows = await tx.select({ count: sql<number>`count(*)::int` }).from(reservations)
        .where(and(eq(reservations.agencyId, req.ctx!.agencyId), gte(reservations.pickupAt, end), lte(reservations.pickupAt, nextEnd)));

      return { departures, returns, tomorrowDepartureCount: tomorrows[0]?.count ?? 0, pendingTransfers, day: start.toISOString() };
    });
  }

  @Get('brief')
  @RequirePermission('ops:read')
  async brief(@Query('scope') scope: string | undefined, @Req() req: AuthedRequest) {
    const kind = scope === 'eod' ? 'eod' : 'morning';
    const { start, end, nextEnd } = dayBounds();
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const fleet = await tx.select().from(vehicles)
        .where(and(eq(vehicles.agencyId, req.ctx!.agencyId), eq(vehicles.fleetStatus, 'IN_FLEET'), sql`${vehicles.deletedAt} is null`));
      const rented = fleet.filter((v) => ['RENTED', 'OVERDUE', 'IN_TRANSIT'].includes(v.operationalStatus));
      const needingAttention = fleet.filter((v) =>
        ['AWAITING_INSPECTION', 'INSPECTED', 'CLEANING', 'MAINTENANCE', 'IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE', 'OVERDUE'].includes(v.operationalStatus));

      const depCount = await tx.select({ count: sql<number>`count(*)::int` }).from(reservations)
        .where(and(eq(reservations.agencyId, req.ctx!.agencyId), gte(reservations.pickupAt, start), lte(reservations.pickupAt, end), inArray(reservations.status, ['CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS'])));
      const retCount = await tx.select({ count: sql<number>`count(*)::int` }).from(reservations)
        .where(and(eq(reservations.agencyId, req.ctx!.agencyId), gte(reservations.returnAt, start), lte(reservations.returnAt, end), inArray(reservations.status, ['IN_PROGRESS', 'READY', 'VEHICLE_ASSIGNED', 'CONFIRMED'])));

      const cashToday = await tx.select({ sum: sql<string>`coalesce(sum(case when ${payments.direction} = 'IN' then (coalesce(${payments.madEquivalent}, ${payments.amount})) else 0 end),0)` })
        .from(payments).where(and(eq(payments.agencyId, req.ctx!.agencyId), gte(payments.receivedAt, start), lte(payments.receivedAt, end)));
      const depositsHeld = await tx.select({ sum: sql<string>`coalesce(sum(${deposits.amount}),0)` }).from(deposits)
        .where(and(eq(deposits.agencyId, req.ctx!.agencyId), inArray(deposits.status, ['HELD', 'PRE_AUTHORIZED', 'PARTIALLY_CHARGED'])));

      const openAlerts = await tx.select().from(alerts)
        .where(and(eq(alerts.agencyId, req.ctx!.agencyId), inArray(alerts.status, ['OPEN', 'ACKNOWLEDGED'])))
        .orderBy(desc(alerts.severity), desc(alerts.createdAt)).limit(12);

      const session = await tx.select().from(cashSessions)
        .where(and(eq(cashSessions.agencyId, req.ctx!.agencyId), eq(cashSessions.status, 'OPEN'))).limit(1);

      const overdue = fleet.filter((v) => v.operationalStatus === 'OVERDUE');
      const tomorrow = await tx.select({ count: sql<number>`count(*)::int` }).from(reservations)
        .where(and(eq(reservations.agencyId, req.ctx!.agencyId), gte(reservations.pickupAt, end), lte(reservations.pickupAt, nextEnd)));

      const base = {
        kind,
        day: start.toISOString().slice(0, 10),
        departures: depCount[0]?.count ?? 0,
        returns: retCount[0]?.count ?? 0,
        utilizationPct: fleet.length ? Math.round((rented.length / fleet.length) * 100) : 0,
        fleetSize: fleet.length,
        vehiclesRequiringAttention: needingAttention.map((v) => ({ id: v.id, plate: v.plate, status: v.operationalStatus })),
        criticalAlerts: openAlerts.filter((a) => a.severity === 'CRITICAL'),
        attentionAlerts: openAlerts.filter((a) => a.severity !== 'CRITICAL'),
        openCashSession: session[0] ?? null,
        tomorrowDepartures: tomorrow[0]?.count ?? 0,
      };

      if (kind === 'morning') {
        return {
          ...base,
          expectedCashMad: cashToday[0]?.sum ?? '0',
          depositsHeldMad: depositsHeld[0]?.sum ?? '0',
          overdueRentals: overdue.map((v) => ({ id: v.id, plate: v.plate })),
        };
      }
      return {
        ...base,
        cashInTodayMad: cashToday[0]?.sum ?? '0',
        depositsHeldMad: depositsHeld[0]?.sum ?? '0',
        overdueRentals: overdue.map((v) => ({ id: v.id, plate: v.plate })),
        varianceNote: session[0]
          ? 'Clôturer la session de caisse et compter le tiroir — l’écart est calculé, jamais écrasé.'
          : 'Aucune session de caisse ouverte aujourd’hui.',
      };
    });
  }

  @Get('branches')
  @RequirePermission('agency:read')
  async branches(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(branches).where(eq(branches.agencyId, req.ctx!.agencyId)));
  }
}

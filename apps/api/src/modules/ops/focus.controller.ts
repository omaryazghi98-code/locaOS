import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { withTenant } from '../../db/client.js';
import { contracts, customers, inspections, reservations, vehicleCategories, vehicles } from '../../db/schema.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { computeBlockers } from '../alerts/scheduler.js';

const dayBounds = (d = new Date()) => {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', dateStyle: 'short' }).format(d);
  const start = new Date(`${day}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
};

@Controller('api/ops')
@UseGuards(AuthGuard, PermissionsGuard)
export class FocusController {
  @Get('focus')
  @RequirePermission('ops:read')
  async focus(@Req() req: AuthedRequest) {
    const { start, end } = dayBounds();

    return withTenant(req.ctx!.agencyId, async (tx) => {
      const depRows = await tx.select({
        reservation: reservations,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        plate: vehicles.plate,
        categoryName: vehicleCategories.name,
      })
        .from(reservations)
        .innerJoin(customers, eq(customers.id, reservations.customerId))
        .innerJoin(vehicleCategories, eq(vehicleCategories.id, reservations.categoryId))
        .leftJoin(vehicles, eq(vehicles.id, reservations.vehicleId))
        .where(and(
          eq(reservations.agencyId, req.ctx!.agencyId),
          gte(reservations.pickupAt, start),
          lte(reservations.pickupAt, end),
          inArray(reservations.status, ['CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS']),
        ))
        .orderBy(reservations.pickupAt);

      const retRows = await tx.select({
        reservation: reservations,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        plate: vehicles.plate,
        categoryName: vehicleCategories.name,
      })
        .from(reservations)
        .innerJoin(customers, eq(customers.id, reservations.customerId))
        .innerJoin(vehicleCategories, eq(vehicleCategories.id, reservations.categoryId))
        .leftJoin(vehicles, eq(vehicles.id, reservations.vehicleId))
        .where(and(
          eq(reservations.agencyId, req.ctx!.agencyId),
          gte(reservations.returnAt, start),
          lte(reservations.returnAt, end),
          inArray(reservations.status, ['IN_PROGRESS', 'READY', 'VEHICLE_ASSIGNED', 'CONFIRMED']),
        ))
        .orderBy(reservations.returnAt);

      const pickups = [];
      for (const row of depRows) {
        const blockers = await computeBlockers(tx as never, row.reservation as never);
        const contractRows = await tx.select().from(contracts)
          .where(and(
            eq(contracts.reservationId, row.reservation.id),
            inArray(contracts.status, ['DRAFT', 'SIGNED', 'ACTIVE', 'AMENDED']),
          ))
          .limit(1);

        pickups.push({
          reservationId: row.reservation.id,
          customerName: row.customerName,
          plate: row.plate,
          categoryName: row.categoryName,
          pickupAt: row.reservation.pickupAt,
          contractId: contractRows[0]?.id ?? null,
          contractStatus: contractRows[0]?.status ?? null,
          blockers,
        });
      }

      const returns = [];
      for (const row of retRows) {
        const contractRows = await tx.select().from(contracts)
          .where(and(
            eq(contracts.reservationId, row.reservation.id),
            inArray(contracts.status, ['ACTIVE', 'SIGNED', 'CLOSED', 'AMENDED']),
          ))
          .limit(1);
        const contract = contractRows[0];
        const inspectionRows = contract
          ? await tx.select().from(inspections)
            .where(and(eq(inspections.contractId, contract.id), eq(inspections.kind, 'RETURN')))
            .limit(1)
          : [];

        returns.push({
          reservationId: row.reservation.id,
          customerName: row.customerName,
          plate: row.plate,
          categoryName: row.categoryName,
          returnAt: row.reservation.returnAt,
          contractId: contract?.id ?? null,
          contractStatus: contract?.status ?? null,
          returnInspectionDone: Boolean(inspectionRows[0]),
        });
      }

      const unresolvedBlockers = Array.from(new Set(pickups.flatMap((pickup) => pickup.blockers)));
      const overdueTasks = pickups.filter((pickup) => pickup.blockers.length > 0).map((pickup) => ({ reservationId: pickup.reservationId, customerName: pickup.customerName, blockers: pickup.blockers }));
      const contractActions = pickups
        .filter((pickup) => !pickup.contractId)
        .map((pickup) => ({ id: pickup.reservationId, reservationId: pickup.reservationId, customerName: pickup.customerName, href: `/brief?scope=morning&reservationId=${pickup.reservationId}` }));

      return {
        pickups,
        returns,
        overdueTasks,
        unresolvedBlockers,
        inspectionsPending: returns.some((item) => !item.returnInspectionDone),
        contractActions,
      };
    });
  }
}

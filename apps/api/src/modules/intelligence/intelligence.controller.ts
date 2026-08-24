/**
 * V1 intelligence: transfers + recommendations, command center, reports (CSV export),
 * customer 360, unified documents, messaging (honest modes), signature requests,
 * integration status board.
 */
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res, UseGuards, UploadedFile, UseInterceptors, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Response } from 'express';
import { withTenant } from '../../db/client';
import {
  alerts, branches, complianceRules, contracts, customers, damages, deposits, documents,
  maintenanceRecords, maintenanceWindows, notificationOutbox, payments, quotes, reservations,
  signatureRequests, vehicleTransfers, vehicles,
} from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { storage, objectKey, sniffImage } from '../storage/storage.js';
import { contentHash } from '../crypto/crypto.js';
import {
  integrationStatuses, messagingProvider, renderTemplate, signatureProvider,
} from '../integrations/providers.js';

const mad = (v: string | bigint | null | undefined) => BigInt(v ?? 0);

// ─────────────────────────── Transfers (V1 §6) ──────────────────────────────────
@Controller('api/transfers')
@UseGuards(AuthGuard, PermissionsGuard)
export class TransfersController {
  @Get()
  @RequirePermission('ops:read')
  async list(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select({
      t: vehicleTransfers, plate: vehicles.plate,
    }).from(vehicleTransfers).innerJoin(vehicles, eq(vehicles.id, vehicleTransfers.vehicleId))
      .where(and(eq(vehicleTransfers.agencyId, req.ctx!.agencyId), inArray(vehicleTransfers.status, ['RECOMMENDED', 'APPROVED', 'IN_PROGRESS'])))
      .orderBy(desc(vehicleTransfers.createdAt)));
  }

  /** Execute a transfer — human action; updates vehicle's home branch. */
  @Post(':id/execute')
  @RequirePermission('fleet:write')
  async execute(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select().from(vehicleTransfers)
        .where(and(eq(vehicleTransfers.id, id), eq(vehicleTransfers.agencyId, req.ctx!.agencyId))).limit(1);
      const t = rows[0];
      if (!t) throw new NotFoundException('Transfert introuvable');
      if (t.status === 'DONE') throw new BadRequestException('Transfert déjà effectué');
      const updated = await tx.update(vehicleTransfers)
        .set({ status: 'DONE', executedBy: req.ctx!.userId, executedAt: new Date(), updatedAt: new Date() })
        .where(eq(vehicleTransfers.id, id)).returning();
      await tx.update(vehicles).set({ currentBranchId: t.toBranchId, updatedAt: new Date() })
        .where(eq(vehicles.id, t.vehicleId));
      await audit(tx, { agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'vehicle_transfer', entityId: id, action: 'TRANSFER_EXECUTED',
        before: { status: t.status }, after: { toBranchId: t.toBranchId } });
      return updated[0];
    });
  }

  @Post(':id/cancel')
  @RequirePermission('ops:read')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({ reason: z.string().min(3).max(300) }))) body: { reason: string }, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.update(vehicleTransfers)
      .set({ status: 'CANCELLED', reason: `${body.reason} (annulé)`, updatedAt: new Date() })
      .where(and(eq(vehicleTransfers.id, id), eq(vehicleTransfers.agencyId, req.ctx!.agencyId))).returning());
  }
}

// ─────────────────────── Command center (V1 §9) ─────────────────────────────────
@Controller('api/ops')
@UseGuards(AuthGuard, PermissionsGuard)
export class IntelligenceOpsController {
  @Get('command-center')
  @RequirePermission('ops:read')
  async commandCenter(@Req() req: AuthedRequest) {
    const a = req.ctx!.agencyId;
    const dayStart = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', dateStyle: 'short' }).format(new Date()) + 'T00:00:00+01:00');
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    return withTenant(a, async (tx) => {
      const fleet = await tx.select().from(vehicles).where(and(eq(vehicles.agencyId, a), eq(vehicles.fleetStatus, 'IN_FLEET'), sql`${vehicles.deletedAt} is null`));
      const rented = fleet.filter((v) => ['RENTED', 'OVERDUE', 'IN_TRANSIT'].includes(v.operationalStatus));
      const unavailable = fleet.filter((v) => ['MAINTENANCE', 'IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE'].includes(v.operationalStatus));
      const overdue = fleet.filter((v) => v.operationalStatus === 'OVERDUE');

      const dep = await tx.select({ n: sql<number>`count(*)::int` }).from(reservations)
        .where(and(eq(reservations.agencyId, a), gte(reservations.pickupAt, dayStart), lte(reservations.pickupAt, dayEnd), inArray(reservations.status, ['CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS'])));
      const ret = await tx.select({ n: sql<number>`count(*)::int` }).from(reservations)
        .where(and(eq(reservations.agencyId, a), gte(reservations.returnAt, dayStart), lte(reservations.returnAt, dayEnd), inArray(reservations.status, ['IN_PROGRESS', 'READY', 'VEHICLE_ASSIGNED', 'CONFIRMED'])));

      const revenue30 = await tx.execute(sql`
        select coalesce(sum(case when direction='IN' then coalesce(mad_equivalent, amount) else 0 end),0)::bigint as rev
        from payments where agency_id = ${a} and received_at > now() - interval '30 days'`);
      const outstanding = await tx.execute(sql`
        select coalesce(sum(case when direction='IN' then coalesce(mad_equivalent, amount) else -coalesce(mad_equivalent, amount) end),0)::bigint as bal
        from payments where agency_id = ${a}`);

      const openAlerts = await tx.select().from(alerts)
        .where(and(eq(alerts.agencyId, a), inArray(alerts.status, ['OPEN', 'ACKNOWLEDGED'])))
        .orderBy(desc(alerts.createdAt)).limit(50);

      // WHAT WILL GO WRONG: tomorrow branch mismatches + expiring docs + unassigned departures
      const tomorrow = await tx.execute(sql`
        select r.id, r.reference, r.pickup_at, r.branch_out_id, v.id as vehicle_id, v.plate, v.current_branch_id
        from reservations r left join vehicles v on v.id = r.vehicle_id
        where r.agency_id = ${a} and r.status in ('VEHICLE_ASSIGNED','READY','CONFIRMED')
          and r.pickup_at between now() + interval '12 hours' and now() + interval '48 hours'`);
      const branchMismatches = (tomorrow as unknown as { rows: { id: string; reference: string; pickup_at: string; vehicle_id: string | null; plate: string | null; current_branch_id: string | null }[] }).rows
        .filter((r) => r.vehicle_id && r.current_branch_id && r.current_branch_id !== (r as unknown as { branch_out_id: string }).branch_out_id);
      const allTomorrow = (tomorrow as unknown as { rows: { id: string; reference: string }[] }).rows;
      const unassignedTomorrow = allTomorrow.filter((r) => !(r as unknown as { vehicle_id: string | null }).vehicle_id);

      const docsExpiring = await tx.execute(sql`
        select type, count(*)::int as n from vehicle_documents
        where agency_id = ${a} and expires_at between current_date and current_date + 30 group by type`);

      const transfersPending = await tx.select().from(vehicleTransfers)
        .where(and(eq(vehicleTransfers.agencyId, a), inArray(vehicleTransfers.status, ['RECOMMENDED', 'APPROVED'])));

      const actions = [
        ...openAlerts.filter((x) => x.severity === 'CRITICAL').slice(0, 5).map((x) => ({ priority: 1, kind: 'ALERT', label: x.title, href: '/alerts', reason: x.message })),
        ...overdue.map((v) => ({ priority: 1, kind: 'OVERDUE', label: `Relancer le client — ${v.plate}`, href: '/fleet/' + v.id, reason: 'Véhicule en retard (contrat échu)' })),
        ...transfersPending.map((t) => ({ priority: 2, kind: 'TRANSFER', label: `Transférer ${t.vehicleId.slice(0, 8)}… (réservation imminente)`, href: '/today', reason: t.reason })),
        ...unassignedTomorrow.map((r) => ({ priority: 2, kind: 'ASSIGN', label: `Affecter un véhicule — ${r.reference}`, href: `/reservations/${r.id}`, reason: 'Départ ≤48h sans véhicule' })),
        ...openAlerts.filter((x) => x.severity === 'HIGH').slice(0, 5).map((x) => ({ priority: 3, kind: 'ALERT', label: x.title, href: '/alerts', reason: x.message })),
      ].sort((x, y) => x.priority - y.priority).slice(0, 10);

      return {
        happening: {
          activeRentals: rented.length, available: fleet.filter((v) => v.operationalStatus === 'AVAILABLE').length,
          fleetSize: fleet.length, departuresToday: dep[0]?.n ?? 0, returnsToday: ret[0]?.n ?? 0,
          utilizationPct: fleet.length ? Math.round((rented.length / fleet.length) * 100) : 0,
          revenue30Mad: (revenue30 as unknown as { rows: { rev: string }[] }).rows[0]?.rev ?? '0',
          outstandingMad: (outstanding as unknown as { rows: { bal: string }[] }).rows[0]?.bal ?? '0',
        },
        wrong: { overdue: overdue.map((v) => ({ id: v.id, plate: v.plate })), unavailable: unavailable.map((v) => ({ id: v.id, plate: v.plate, status: v.operationalStatus })), openCritical: openAlerts.filter((x) => x.severity === 'CRITICAL').length, openHigh: openAlerts.filter((x) => x.severity === 'HIGH').length },
        willGoWrong: {
          branchMismatches, unassignedTomorrow: unassignedTomorrow.length,
          docsExpiring: (docsExpiring as unknown as { rows: { type: string; n: number }[] }).rows,
          pendingTransfers: transfersPending.length,
        },
        actions,
      };
    });
  }
}

// ─────────────────────── Reports (V1 §10/§13) ───────────────────────────────────
@Controller('api/reports')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReportsController {
  @Get('fleet')
  @RequirePermission('reports:read')
  async fleet(@Query('from') fromQ: string | undefined, @Query('to') toQ: string | undefined, @Query('format') format: string | undefined, @Req() req: AuthedRequest, @Res() res: Response) {
    const a = req.ctx!.agencyId;
    const from = new Date(fromQ ?? Date.now() - 30 * 86_400_000);
    const to = new Date(toQ ?? Date.now() + 86_400_000);
    const rows = await withTenant(a, async (tx) => {
      const r = await tx.execute(sql`
        with rev as (
          select c.vehicle_id, coalesce(sum(case when p.direction='IN' then coalesce(p.mad_equivalent, p.amount) else 0 end),0)::bigint as revenue
          from payments p join contracts c on c.id = p.contract_id
          where p.agency_id = ${a} and p.received_at between ${from.toISOString()} and ${to.toISOString()}
          group by c.vehicle_id
        ), maint as (
          select vehicle_id, coalesce(sum(total_cost),0)::bigint as cost, coalesce(sum(downtime_hours),0)::int as downtime
          from maintenance_records where agency_id = ${a} and performed_at between ${from.toISOString()} and ${to.toISOString()}
          group by vehicle_id
        ), rented_days as (
          select vehicle_id, coalesce(sum(extract(epoch from (least(period_end, ${to.toISOString()}::timestamptz) - greatest(period_start, ${from.toISOString()}::timestamptz))) / 86400), 0)::int as days
          from contracts where agency_id = ${a} and status in ('ACTIVE','CLOSED','AMENDED') and period_end is not null and period_start is not null
            and tstzrange(period_start, period_end) && tstzrange(${from.toISOString()}::timestamptz, ${to.toISOString()}::timestamptz)
          group by vehicle_id
        )
        select v.id, v.plate, v.estimated_value, v.current_mileage_km,
          coalesce(rev.revenue,0)::bigint as revenue, coalesce(maint.cost,0)::bigint as maintenance_cost,
          coalesce(maint.downtime,0) as downtime_hours, coalesce(rented_days.days,0) as rented_days,
          (coalesce(rev.revenue,0) - coalesce(maint.cost,0)
            - (coalesce(v.estimated_value,0) * extract(epoch from (${to.toISOString()}::timestamptz - ${from.toISOString()}::timestamptz)) / (86400*365.25*5)) / 100)::bigint as profit_estimate
        from vehicles v
        left join rev on rev.vehicle_id = v.id left join maint on maint.vehicle_id = v.id left join rented_days on rented_days.vehicle_id = v.id
        where v.agency_id = ${a} and v.fleet_status = 'IN_FLEET'
        order by profit_estimate desc`);
      return (r as unknown as { rows: Record<string, string | number | null>[] }).rows;
    });
    if (format === 'csv') return toCsv(res, 'fleet', rows, ['plate', 'revenue', 'maintenance_cost', 'downtime_hours', 'rented_days', 'profit_estimate', 'current_mileage_km']);
    res.json(rows.map((r) => ({ ...r, utilizationPct: daysPct(r.rented_days, from, to), profitEstimateMad: r.profit_estimate })));
  }

  @Get('finance')
  @RequirePermission('reports:read')
  async finance(@Query('from') fromQ: string | undefined, @Query('to') toQ: string | undefined, @Req() req: AuthedRequest) {
    const a = req.ctx!.agencyId;
    const from = new Date(fromQ ?? Date.now() - 30 * 86_400_000);
    const to = new Date(toQ ?? Date.now() + 86_400_000);
    return withTenant(a, async (tx) => {
      const daily = await tx.execute(sql`
        select date_trunc('day', received_at)::date as day, method,
          coalesce(sum(case when direction='IN' then coalesce(mad_equivalent, amount) else 0 end),0)::bigint as in_mad,
          coalesce(sum(case when direction='OUT' then coalesce(mad_equivalent, amount) else 0 end),0)::bigint as out_mad
        from payments where agency_id = ${a} and received_at between ${from.toISOString()} and ${to.toISOString()}
        group by 1,2 order by 1 desc`);
      const outstanding = await tx.execute(sql`
        select coalesce(sum(case when direction='IN' then coalesce(mad_equivalent, amount) else -coalesce(mad_equivalent, amount) end),0)::bigint as bal from payments where agency_id = ${a}`);
      const deposits = await tx.execute(sql`
        select status, coalesce(sum(amount),0)::bigint as total, count(*)::int as n from deposits where agency_id = ${a} group by status`);
      const variance = await tx.execute(sql`
        select coalesce(sum(variance_mad),0)::bigint as total_variance, count(*)::int as sessions from cash_sessions where agency_id = ${a} and status='CLOSED'`);
      return {
        daily: (daily as unknown as { rows: unknown[] }).rows,
        outstandingMad: (outstanding as unknown as { rows: { bal: string }[] }).rows[0]?.bal ?? '0',
        deposits: (deposits as unknown as { rows: unknown[] }).rows,
        cashVariance: (variance as unknown as { rows: unknown[] }).rows,
      };
    });
  }

  @Get('operations')
  @RequirePermission('reports:read')
  async operations(@Query('from') fromQ: string | undefined, @Query('to') toQ: string | undefined, @Req() req: AuthedRequest) {
    const a = req.ctx!.agencyId;
    const from = new Date(fromQ ?? Date.now() - 30 * 86_400_000);
    const to = new Date(toQ ?? Date.now() + 86_400_000);
    return withTenant(a, async (tx) => {
      const r = await tx.execute(sql`
        select
          count(*) filter (where status in ('COMPLETED'))::int as completed,
          count(*) filter (where status = 'CANCELLED')::int as cancelled,
          count(*) filter (where status = 'NO_SHOW')::int as no_show,
          count(*) filter (where status = 'IN_PROGRESS')::int as in_progress,
          coalesce(avg(extract(epoch from (return_at - pickup_at))/86400) filter (where status in ('COMPLETED','IN_PROGRESS')),0)::numeric(10,1) as avg_days
        from reservations where agency_id = ${a} and pickup_at between ${from.toISOString()} and ${to.toISOString()}`);
      const extensions = await tx.select({ n: sql<number>`count(*)::int` }).from(sql`contract_amendments`)
        .where(sql`agency_id = ${a} and kind = 'PERIOD' and created_at between ${from.toISOString()} and ${to.toISOString()}`);
      return { rentals: (r as unknown as { rows: unknown[] }).rows[0], extensions: extensions[0]?.n ?? 0 };
    });
  }

  @Get('customers')
  @RequirePermission('reports:read')
  async customersReport(@Query('from') fromQ: string | undefined, @Query('to') toQ: string | undefined, @Req() req: AuthedRequest) {
    const a = req.ctx!.agencyId;
    const from = new Date(fromQ ?? Date.now() - 90 * 86_400_000);
    const to = new Date(toQ ?? Date.now() + 86_400_000);
    return withTenant(a, async (tx) => {
      const r = await tx.execute(sql`
        select cu.id, cu.first_name, cu.last_name, cu.company_name, cu.segment,
          count(distinct r.id)::int as rentals,
          coalesce(avg(extract(epoch from (r.return_at - r.pickup_at))/86400),0)::numeric(10,1) as avg_days,
          coalesce(sum(case when p.direction='IN' then coalesce(p.mad_equivalent, p.amount) else 0 end),0)::bigint as revenue_mad
        from customers cu
        left join reservations r on r.customer_id = cu.id and r.pickup_at between ${from.toISOString()} and ${to.toISOString()}
        left join contracts c on c.customer_id = cu.id
        left join payments p on p.contract_id = c.id and p.received_at between ${from.toISOString()} and ${to.toISOString()}
        where cu.agency_id = ${a} and cu.deleted_at is null
        group by cu.id order by revenue_mad desc limit 50`);
      return (r as unknown as { rows: unknown[] }).rows;
    });
  }

  @Get('branches')
  @RequirePermission('reports:read')
  async branchesReport(@Query('from') fromQ: string | undefined, @Query('to') toQ: string | undefined, @Req() req: AuthedRequest) {
    const a = req.ctx!.agencyId;
    const from = new Date(fromQ ?? Date.now() - 30 * 86_400_000);
    const to = new Date(toQ ?? Date.now() + 86_400_000);
    return withTenant(a, async (tx) => {
      const r = await tx.execute(sql`
        select b.id, b.name,
          count(distinct r.id)::int as departures,
          coalesce(sum(case when p.direction='IN' then coalesce(p.mad_equivalent, p.amount) else 0 end),0)::bigint as revenue_mad
        from branches b
        left join reservations r on r.branch_out_id = b.id and r.pickup_at between ${from.toISOString()} and ${to.toISOString()} and r.status not in ('CANCELLED','NO_SHOW')
        left join contracts c on c.branch_id = b.id
        left join payments p on p.contract_id = c.id and p.received_at between ${from.toISOString()} and ${to.toISOString()}
        where b.agency_id = ${a}
        group by b.id order by revenue_mad desc`);
      return (r as unknown as { rows: unknown[] }).rows;
    });
  }
}

function daysPct(days: number | string | null | undefined, from: Date, to: Date): number {
  const total = Math.max(1, (to.getTime() - from.getTime()) / 86_400_000);
  return Math.min(100, Math.round((Number(days ?? 0) / total) * 100));
}

function toCsv(res: Response, name: string, rows: Record<string, unknown>[], cols: string[]) {
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => {
    const v = r[c];
    if (v == null) return '';
    return typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replaceAll('"', '""')}"` : String(v);
  }).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="rapport-${name}.csv"`);
  res.send(`${header}\n${body}`);
}

// ─────────────────────── Customer 360 (V1 §11) ──────────────────────────────────
@Controller('api/customers')
@UseGuards(AuthGuard, PermissionsGuard)
export class Customer360Controller {
  @Get(':id/360')
  @RequirePermission('customers:read')
  async full(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    const a = req.ctx!.agencyId;
    return withTenant(a, async (tx) => {
      const c = await tx.select().from(customers).where(and(eq(customers.id, id), eq(customers.agencyId, a))).limit(1);
      if (!c[0]) throw new NotFoundException('Client introuvable');
      const resv = await tx.select().from(reservations).where(eq(reservations.customerId, id)).orderBy(desc(reservations.pickupAt)).limit(50);
      const cons = await tx.select().from(contracts).where(eq(contracts.customerId, id)).orderBy(desc(contracts.createdAt)).limit(50);
      const pays = await tx.execute(sql`
        select p.*, c.number as contract_number from payments p left join contracts c on c.id = p.contract_id
        where p.agency_id = ${a} and p.contract_id in (select id from contracts where customer_id = ${id})
        order by p.received_at desc limit 50`);
      const deps = await tx.execute(sql`
        select d.*, c.number as contract_number from deposits d join contracts c on c.id = d.contract_id
        where d.agency_id = ${a} and c.customer_id = ${id} order by d.created_at desc limit 20`);
      const dmg = await tx.execute(sql`
        select dm.*, v.plate from damages dm join vehicles v on v.id = dm.vehicle_id
        where dm.agency_id = ${a} and dm.discovered_inspection_id in (
          select i.id from inspections i join contracts c on c.id = i.contract_id where c.customer_id = ${id})
        order by dm.created_at desc limit 20`);
      const stats = await tx.execute(sql`
        select
          (select coalesce(sum(case when direction='IN' then coalesce(mad_equivalent, amount) else 0 end),0) from payments where agency_id=${a} and contract_id in (select id from contracts where customer_id=${id}))::bigint as revenue_mad,
          (select coalesce(avg(extract(epoch from (return_at - pickup_at))/86400),0) from reservations where customer_id=${id} and status in ('COMPLETED','IN_PROGRESS'))::numeric(10,1) as avg_days,
          (select count(*) from reservations where customer_id=${id} and status='CANCELLED')::int as cancellations`);
      return {
        customer: c[0],
        reservations: resv, contracts: cons,
        payments: (pays as unknown as { rows: unknown[] }).rows,
        deposits: (deps as unknown as { rows: unknown[] }).rows,
        damages: (dmg as unknown as { rows: unknown[] }).rows,
        stats: (stats as unknown as { rows: unknown[] }).rows[0],
      };
    });
  }
}

// ─────────────────────── Documents (V1 §12) ─────────────────────────────────────
@Controller('api/documents')
@UseGuards(AuthGuard, PermissionsGuard)
export class DocumentsController {
  @Get()
  @RequirePermission('agency:read')
  async list(@Query('entityType') entityType: string | undefined, @Query('entityId') entityId: string | undefined, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const conds = [eq(documents.agencyId, req.ctx!.agencyId)];
      if (entityType) conds.push(eq(documents.entityType, entityType));
      if (entityId) conds.push(eq(documents.entityId, entityId));
      const rows = await tx.select().from(documents).where(and(...conds)).orderBy(desc(documents.createdAt)).limit(100);
      return rows.map((d) => ({ ...d, url: storage.signedUrl(d.objectKey, 600, req.ctx!.agencyId) }));
    });
  }

  @Post()
  @RequirePermission('customers:write')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: AuthedRequest & { body: Record<string, string> }) {
    const b = req.body;
    const sniffed = sniffImage(file.buffer);
    const isPdf = file.buffer.subarray(0, 4).toString('ascii') === '%PDF';
    if (!sniffed && !isPdf) throw new ForbiddenException('Fichier invalide (image ou PDF uniquement)');
    if (file.size > 10 * 1024 * 1024) throw new ForbiddenException('Taille max 10 Mo');
    const kind = b.kind ?? 'OTHER';
    const key = objectKey(req.ctx!.agencyId, 'documents', kind.toLowerCase());
    await storage.put(key, file.buffer, sniffed ?? 'application/pdf');
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const inserted = await tx.insert(documents).values({
        agencyId: req.ctx!.agencyId, kind, entityType: b.entityType ?? 'other', entityId: b.entityId ?? null,
        objectKey: key, mimeType: sniffed ?? 'application/pdf', bytes: file.size, label: b.label ?? null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null, uploadedBy: req.ctx!.userId,
      }).returning();
      await audit(tx, { agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'document', entityId: inserted[0]!.id, action: 'DOCUMENT_UPLOADED',
        after: { kind, entityType: b.entityType, entityId: b.entityId } });
      return { ...inserted[0], url: storage.signedUrl(key, 600, req.ctx!.agencyId) };
    });
  }
}

// ─────────── Messaging + Signature + Integration board (V1 §4/§5) ───────────────
@Controller('api/integrations')
@UseGuards(AuthGuard, PermissionsGuard)
export class IntegrationsController {
  @Get('status')
  @RequirePermission('agency:read')
  async status() {
    return { providers: integrationStatuses(), generatedAt: new Date().toISOString() };
  }

  @Get('messages')
  @RequirePermission('agency:read')
  async messages(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(notificationOutbox)
      .where(eq(notificationOutbox.agencyId, req.ctx!.agencyId))
      .orderBy(desc(notificationOutbox.createdAt)).limit(50));
  }

  /** Queue a WhatsApp-templated message. Mock provider → file marked SIMULATED, nothing sent. */
  @Post('messages')
  @RequirePermission('customers:write')
  async send(@Body(new ZodValidationPipe(z.object({
    toPhone: z.string().regex(/^\+\d{8,15}$/), template: z.enum([
      'RESERVATION_CONFIRMED', 'PICKUP_INSTRUCTIONS', 'DOC_REQUEST', 'CONTRACT_DELIVERED',
      'PAYMENT_REMINDER', 'RETURN_REMINDER', 'EXTENSION_REQUEST', 'LATE_RETURN', 'LOCATION_REQUEST',
    ]), params: z.record(z.string(), z.string()).default({}),
    relatedType: z.string().max(30).optional(), relatedId: z.string().max(40).optional(),
  }))) body: { toPhone: string; template: string; params: Record<string, string>; relatedType?: string; relatedId?: string }, @Req() req: AuthedRequest) {
    const result = await messagingProvider.send({
      agencyId: req.ctx!.agencyId, toPhone: body.toPhone, template: body.template, params: body.params,
      relatedType: body.relatedType, relatedId: body.relatedId, createdBy: req.ctx!.userId,
    });
    return { ...result, preview: renderTemplate(body.template, body.params) };
  }

  @Post('contracts/:id/signature-request')
  @RequirePermission('contracts:write')
  async requestSignature(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(z.object({
    signerName: z.string().min(2).max(120), signerPhone: z.string().max(20).optional(),
  }))) body: { signerName: string; signerPhone?: string }, @Req() req: AuthedRequest) {
    const a = req.ctx!.agencyId;
    const { contractVersions } = await import('../../db/schema.js');
    return withTenant(a, async (tx) => {
      const c = await tx.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.agencyId, a))).limit(1);
      if (!c[0]) throw new NotFoundException('Contrat introuvable');
      if (!['DRAFT', 'GENERATED'].includes(c[0].status)) throw new BadRequestException('Statut non éligible à une demande de signature');
      const v = await tx.select().from(contractVersions).where(eq(contractVersions.id, c[0].currentVersionId!)).limit(1);
      await tx.update(contracts).set({ status: 'SIGNATURE_REQUESTED', updatedAt: new Date() }).where(eq(contracts.id, id));
      await audit(tx, { agencyId: a, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'contract', entityId: id, action: 'SIGNATURE_REQUESTED',
        after: { provider: signatureProvider.name, mode: signatureProvider.status().status } });
      return signatureProvider.requestSignature({
        agencyId: a, contractId: id, contractVersionId: c[0].currentVersionId,
        contentHash: v[0]?.contentHash ?? '', signerName: body.signerName, signerPhone: body.signerPhone,
        language: c[0].language, requestedBy: req.ctx!.userId,
      });
    });
  }

  /** Mock-mode completion: an explicit HUMAN action, stamped SIMULATED — never auto-success. */
  @Post('signature-requests/:id/complete-mock')
  @RequirePermission('contracts:write')
  async completeMock(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    const a = req.ctx!.agencyId;
    return withTenant(a, async (tx) => {
      const rows = await tx.select().from(signatureRequests).where(and(eq(signatureRequests.id, id), eq(signatureRequests.agencyId, a))).limit(1);
      const sr = rows[0];
      if (!sr) throw new NotFoundException('Demande introuvable');
      if (sr.mode !== 'MOCK') throw new ForbiddenException('Réservé au mode SIMULÉ');
      if (sr.status !== 'PENDING') throw new BadRequestException('Demande déjà traitée');
      await tx.update(signatureRequests).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(signatureRequests.id, id));
      await tx.update(contracts).set({ status: 'SIGNED', updatedAt: new Date() }).where(eq(contracts.id, sr.contractId));
      await audit(tx, { agencyId: a, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'signature_request', entityId: id, action: 'MOCK_SIGNATURE_COMPLETED',
        reason: 'confirmation humaine explicite — résultat marqué SIMULATED' });
      return { ok: true, mode: 'MOCK', note: 'Signature SIMULÉE confirmée par un humain — pas de valeur légale.' };
    });
  }

  @Get('signature-requests')
  @RequirePermission('contracts:read')
  async signatureRequestsList(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(signatureRequests)
      .where(eq(signatureRequests.agencyId, req.ctx!.agencyId)).orderBy(desc(signatureRequests.createdAt)).limit(50));
  }
}

// ─────────────────────── Compliance registry (V1 §16) ───────────────────────────
@Controller('api/compliance')
@UseGuards(AuthGuard, PermissionsGuard)
export class ComplianceController {
  @Get('rules')
  @RequirePermission('agency:read')
  async rules(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select().from(complianceRules)
      .where(eq(complianceRules.agencyId, req.ctx!.agencyId)).orderBy(complianceRules.key));
  }

  @Post('rules/:key/toggle')
  @RequirePermission('alerts:resolve')
  async toggle(@Param('key') key: string, @Body(new ZodValidationPipe(z.object({ enabled: z.boolean() }))) body: { enabled: boolean }, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const updated = await tx.update(complianceRules)
        .set({ enabled: body.enabled, updatedBy: req.ctx!.userId, updatedAt: new Date() })
        .where(and(eq(complianceRules.agencyId, req.ctx!.agencyId), eq(complianceRules.key, key))).returning();
      if (!updated[0]) throw new NotFoundException('Règle introuvable');
      await audit(tx, { agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'compliance_rule', entityId: key, action: 'COMPLIANCE_RULE_TOGGLED',
        before: { enabled: !body.enabled }, after: { enabled: body.enabled },
        reason: updated[0].sourceRef });
      return updated[0];
    });
  }
}

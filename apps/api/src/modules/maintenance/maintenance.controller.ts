/**
 * Maintenance subsystem (V1 §2): plans (mileage/time/scheduled), records with parts/labor/
 * downtime/vendor, vendors, deterministic due & anomaly detection. No predictive AI —
 * deterministic rules only, with extension points (plan metadata) for later prediction.
 */
import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { withTenant, type Tx } from '../../db/client';
import { maintenancePlans, maintenanceRecords, maintenanceWindows, vehicles, vehicleDocuments } from '../../db/schema';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';

const PlanSchema = z.object({
  vehicleId: z.string().uuid(),
  taskKind: z.string().min(2).max(40),
  basis: z.enum(['MILEAGE', 'TIME', 'SCHEDULED']),
  intervalKm: z.number().int().min(500).max(200_000).optional(),
  intervalDays: z.number().int().min(7).max(2000).optional(),
  lastDoneKm: z.number().int().optional(),
  lastDoneAt: z.string().datetime().optional(),
  estimatedCost: z.string().optional(),
}).refine((v) => v.basis !== 'MILEAGE' || v.intervalKm != null, { message: 'intervalKm requis (MILEAGE)' })
  .refine((v) => v.basis !== 'TIME' || v.intervalDays != null, { message: 'intervalDays requis (TIME)' });

const RecordSchema = z.object({
  vehicleId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  taskKind: z.string().min(2).max(40),
  vendorId: z.string().uuid().optional(),
  performedAt: z.string().datetime().optional(),
  mileageKm: z.number().int().optional(),
  partsCost: z.string().default('0'),
  laborCost: z.string().default('0'),
  downtimeHours: z.number().int().min(0).max(24 * 90).default(0),
  windowId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});
const cents = (s: string) => BigInt(Math.round(Number(s) * 100));

@Controller('api/maintenance')
@UseGuards(AuthGuard, PermissionsGuard)
export class MaintenanceController {
  @Get('plans')
  @RequirePermission('fleet:read')
  async plans(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.select({ p: maintenancePlans, plate: vehicles.plate, mileage: vehicles.currentMileageKm })
        .from(maintenancePlans).innerJoin(vehicles, eq(vehicles.id, maintenancePlans.vehicleId))
        .where(and(eq(maintenancePlans.agencyId, req.ctx!.agencyId), eq(maintenancePlans.active, true)));
      return rows.map(({ p, plate, mileage }) => {
        const dueByKm = p.nextDueKm != null ? p.nextDueKm - mileage : null;
        const dueByDate = p.nextDueAt ? Math.ceil((p.nextDueAt.getTime() - Date.now()) / 86_400_000) : null;
        const state = (dueByKm != null && dueByKm <= 0) || (dueByDate != null && dueByDate <= 0) ? 'DUE'
          : (dueByKm != null && dueByKm <= 1000) || (dueByDate != null && dueByDate <= 7) ? 'APPROACHING' : 'OK';
        return { ...p, plate, mileage, dueByKm, dueByDate, state };
      });
    });
  }

  @Post('plans')
  @RequirePermission('fleet:write')
  async createPlan(@Body(new ZodValidationPipe(PlanSchema)) body: z.infer<typeof PlanSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const v = await tx.select().from(vehicles).where(eq(vehicles.id, body.vehicleId)).limit(1);
      if (!v[0]) throw new NotFoundException('Véhicule introuvable');
      const inserted = await tx.insert(maintenancePlans).values({
        agencyId: req.ctx!.agencyId, vehicleId: body.vehicleId, taskKind: body.taskKind, basis: body.basis,
        intervalKm: body.intervalKm ?? null, intervalDays: body.intervalDays ?? null,
        lastDoneKm: body.lastDoneKm ?? null, lastDoneAt: body.lastDoneAt ? new Date(body.lastDoneAt) : null,
        nextDueKm: body.basis === 'MILEAGE' && body.intervalKm ? (body.lastDoneKm ?? v[0].currentMileageKm) + body.intervalKm : null,
        nextDueAt: body.basis === 'TIME' && body.intervalDays ? new Date((body.lastDoneAt ? new Date(body.lastDoneAt).getTime() : Date.now()) + body.intervalDays * 86_400_000) : null,
        estimatedCost: body.estimatedCost ? cents(body.estimatedCost) : null,
      }).returning();
      await audit(tx, { agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'maintenance_plan', entityId: inserted[0]!.id, action: 'PLAN_CREATED', after: body as never });
      return inserted[0];
    });
  }

  @Get('records')
  @RequirePermission('fleet:read')
  async records(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, (tx) => tx.select({ r: maintenanceRecords, plate: vehicles.plate })
      .from(maintenanceRecords).innerJoin(vehicles, eq(vehicles.id, maintenanceRecords.vehicleId))
      .where(eq(maintenanceRecords.agencyId, req.ctx!.agencyId))
      .orderBy(desc(maintenanceRecords.performedAt)).limit(200));
  }

  /** Recording performed work: updates plan progression + vehicle mileage; costs feed profitability. */
  @Post('records')
  @RequirePermission('fleet:write')
  async createRecord(@Body(new ZodValidationPipe(RecordSchema)) body: z.infer<typeof RecordSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const parts = cents(body.partsCost), labor = cents(body.laborCost);
      const inserted = await tx.insert(maintenanceRecords).values({
        agencyId: req.ctx!.agencyId, vehicleId: body.vehicleId, planId: body.planId ?? null,
        taskKind: body.taskKind, vendorId: body.vendorId ?? null,
        performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
        mileageKm: body.mileageKm ?? null, partsCost: parts, laborCost: labor, totalCost: parts + labor,
        downtimeHours: body.downtimeHours, windowId: body.windowId ?? null, notes: body.notes ?? null,
      }).returning();
      if (body.mileageKm != null) {
        await tx.update(vehicles).set({ currentMileageKm: body.mileageKm, updatedAt: new Date() }).where(eq(vehicles.id, body.vehicleId));
      }
      if (body.planId) {
        const p = await tx.select().from(maintenancePlans).where(eq(maintenancePlans.id, body.planId)).limit(1);
        if (p[0]) {
          await tx.update(maintenancePlans).set({
            lastDoneKm: body.mileageKm ?? p[0].lastDoneKm, lastDoneAt: new Date(),
            nextDueKm: p[0].intervalKm && body.mileageKm ? body.mileageKm + p[0].intervalKm : p[0].nextDueKm,
            nextDueAt: p[0].intervalDays ? new Date(Date.now() + p[0].intervalDays * 86_400_000) : p[0].nextDueAt,
            updatedAt: new Date(),
          }).where(eq(maintenancePlans.id, body.planId));
        }
      }
      if (body.windowId) {
        // close the blocking window; vehicle leaves MAINTENANCE via the normal transition endpoint
        await tx.update(maintenanceWindows).set({ note: sql`coalesce(${maintenanceWindows.note}, '') || ' [terminé ' || now()::date::text || ']'` })
          .where(eq(maintenanceWindows.id, body.windowId));
      }
      await audit(tx, { agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName },
        entityType: 'maintenance_record', entityId: inserted[0]!.id, action: 'WORK_RECORDED',
        after: { taskKind: body.taskKind, total: (parts + labor).toString(), downtimeHours: body.downtimeHours } });
      return inserted[0];
    });
  }

  @Get('vendors')
  @RequirePermission('fleet:read')
  async vendors(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const rows = await tx.execute(sql`
        select v.*, count(r.id)::int as jobs,
               coalesce(avg(r.downtime_hours), 0)::int as avg_downtime_hours,
               coalesce(sum(r.total_cost), 0)::bigint as total_cost
        from vendors v left join maintenance_records r on r.vendor_id = v.id
        where v.agency_id = ${req.ctx!.agencyId}
        group by v.id order by v.name`);
      return (rows as unknown as { rows: unknown[] }).rows;
    });
  }

  @Post('vendors')
  @RequirePermission('fleet:write')
  async createVendor(@Body(new ZodValidationPipe(z.object({
    name: z.string().min(2).max(120), kind: z.enum(['GARAGE', 'CLEANING', 'TOWING', 'OTHER']).default('GARAGE'),
    phone: z.string().max(20).optional(), city: z.string().max(80).optional(), notes: z.string().max(500).optional(),
  }))) body: { name: string; kind: string; phone?: string; city?: string; notes?: string }, @Req() req: AuthedRequest) {
    const { vendors } = await import('../../db/schema.js');
    return withTenant(req.ctx!.agencyId, (tx) => tx.insert(vendors)
      .values({ agencyId: req.ctx!.agencyId, name: body.name, kind: body.kind, phone: body.phone ?? null, city: body.city ?? null, notes: body.notes ?? null })
      .returning());
  }
}

/** Deterministic detection used by the scheduler (thin checks, no AI). */
export async function detectMaintenanceDue(tx: Tx, agencyId: string): Promise<void> {
  const { raiseAlert } = await import('../alerts/evaluator.js');
  const rows = await tx.select({ p: maintenancePlans, plate: vehicles.plate, mileage: vehicles.currentMileageKm, value: vehicles.estimatedValue })
    .from(maintenancePlans).innerJoin(vehicles, eq(vehicles.id, maintenancePlans.vehicleId))
    .where(and(eq(maintenancePlans.agencyId, agencyId), eq(maintenancePlans.active, true)));
  for (const { p, plate, mileage, value } of rows) {
    const dueByKm = p.nextDueKm != null ? p.nextDueKm - mileage : null;
    const dueByDate = p.nextDueAt ? Math.ceil((p.nextDueAt.getTime() - Date.now()) / 86_400_000) : null;
    if ((dueByKm != null && dueByKm <= 0) || (dueByDate != null && dueByDate <= 0)) {
      await raiseAlert({ tx, agencyId, ruleKey: 'MAINTENANCE_DUE', severity: 'HIGH', sourceKind: 'SCHEDULE',
        entityType: 'vehicle', entityId: p.vehicleId,
        title: `Entretien dû — ${plate} (${p.taskKind})`,
        message: dueByKm != null && dueByKm <= 0 ? `Dépassé de ${Math.abs(dueByKm)} km` : `En retard de ${Math.abs(dueByDate ?? 0)} j`,
        evidence: { planId: p.id, dueByKm, dueByDate } });
    } else if ((dueByKm != null && dueByKm <= 1000) || (dueByDate != null && dueByDate <= 7)) {
      await raiseAlert({ tx, agencyId, ruleKey: 'MAINTENANCE_APPROACHING', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
        entityType: 'vehicle', entityId: p.vehicleId,
        title: `Entretien proche — ${plate} (${p.taskKind})`,
        message: dueByKm != null ? `Dans ~${dueByKm} km` : `Dans ~${dueByDate} j`,
        evidence: { planId: p.id, dueByKm, dueByDate } });
    }
  }
  // repeated mechanical problems (≥3 same taskKind in 90 days) — deterministic "lemon" signal
  const lemon = await tx.execute(sql`
    select vehicle_id, task_kind, count(*)::int as n from maintenance_records
    where agency_id = ${agencyId} and performed_at > now() - interval '90 days'
    group by vehicle_id, task_kind having count(*) >= 3`);
  for (const r of (lemon as unknown as { rows: { vehicle_id: string; task_kind: string; n: number }[] }).rows) {
    await raiseAlert({ tx, agencyId, ruleKey: 'REPEATED_MECHANICAL_FAULT', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
      entityType: 'vehicle', entityId: r.vehicle_id,
      title: `Défaillance récurrente (${r.task_kind} ×${r.n} en 90 j)`,
      message: 'Problème répété — évaluer le véhicule et l’efficacité du garage',
      evidence: { vehicleId: r.vehicle_id, taskKind: r.task_kind, count: r.n } });
  }
  // total maintenance cost > 20% of estimated vehicle value (24 months)
  const costy = await tx.execute(sql`
    select r.vehicle_id, sum(r.total_cost)::bigint as total, v.estimated_value, v.plate
    from maintenance_records r join vehicles v on v.id = r.vehicle_id
    where r.agency_id = ${agencyId} and r.performed_at > now() - interval '730 days'
      and v.estimated_value is not null
    group by r.vehicle_id, v.estimated_value, v.plate
    having sum(r.total_cost) > v.estimated_value * 0.2`);
  for (const r of (costy as unknown as { rows: { vehicle_id: string; total: string; estimated_value: string; plate: string }[] }).rows) {
    await raiseAlert({ tx, agencyId, ruleKey: 'MAINTENANCE_COST_RATIO', severity: 'ATTENTION', sourceKind: 'SCHEDULE',
      entityType: 'vehicle', entityId: r.vehicle_id,
      title: `Coût d’entretien élevé — ${r.plate}`,
      message: `Entretien 24 mois = ${Number(r.total) / 100} MAD (> 20% de la valeur estimée ${Number(r.estimated_value) / 100} MAD) — envisager la cession`,
      evidence: { vehicleId: r.vehicle_id, totalMad: r.total, valueMad: r.estimated_value } });
  }
  // prolonged downtime: open window ended > 48h ago while vehicle still in MAINTENANCE
  const stuck = await tx.execute(sql`
    select mw.id, mw.vehicle_id, v.plate, mw.window_end from maintenance_windows mw
    join vehicles v on v.id = mw.vehicle_id
    where mw.agency_id = ${agencyId} and v.operational_status = 'MAINTENANCE' and mw.window_end < now() - interval '48 hours'`);
  for (const r of (stuck as unknown as { rows: { id: string; vehicle_id: string; plate: string; window_end: string }[] }).rows) {
    await raiseAlert({ tx, agencyId, ruleKey: 'PROLONGED_DOWNTIME', severity: 'HIGH', sourceKind: 'SCHEDULE',
      entityType: 'vehicle', entityId: r.vehicle_id,
      title: `Immobilisation prolongée — ${r.plate}`,
      message: `Fenêtre de maintenance terminée depuis plus de 48 h (${r.window_end}) — véhicule toujours en MAINTENANCE`,
      evidence: { windowId: r.id, vehicleId: r.vehicle_id } });
  }
  void vehicleDocuments; void isNull; void gte;
}

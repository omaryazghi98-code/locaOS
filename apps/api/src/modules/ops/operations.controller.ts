import { Body, ConflictException, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { withTenant } from '../../db/client';
import { ZodValidationPipe } from '../common/zod.pipe.js';
import { AuthGuard, AuthedRequest, PermissionsGuard, RequirePermission } from '../auth/guards.js';
import { audit } from '../audit/audit.service.js';
import { appendEvent, dispatchPendingSafe } from '../events/events.js';
import { transitionVehicle } from '../fleet/fleet.service.js';

const TaskStatus = z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED']);
const TaskKind = z.enum(['PREPARATION_REVIEW', 'CLEANING', 'MAINTENANCE', 'QA']);

const CreateSchema = z.object({
  vehicleId: z.string().uuid(),
  reservationId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  taskKind: TaskKind,
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  assignedTo: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  estimatedCost: z.string().optional(),
});

const TriageSchema = z.object({
  cleaningNeeded: z.boolean().default(false),
  maintenanceNeeded: z.boolean().default(false),
  cleaningNote: z.string().max(500).optional(),
  maintenanceNote: z.string().max(500).optional(),
});

const UpdateSchema = z.object({
  status: TaskStatus.optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  vendorId: z.string().uuid().nullable().optional(),
  completionNote: z.string().max(1000).optional(),
  actualCost: z.string().optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Aucune modification' });

@Controller('api/ops/tasks')
@UseGuards(AuthGuard, PermissionsGuard)
export class OperationsController {
  @Get()
  @RequirePermission('ops:read')
  async list(@Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const result = await tx.execute(sql`
        select t.*, v.plate,
               coalesce(u.full_name, '') as assignee_name
          from operations_tasks t
          join vehicles v on v.id = t.vehicle_id
          left join users u on u.id = t.assigned_to
         where t.agency_id = ${req.ctx!.agencyId}
         order by case t.priority when 'URGENT' then 0 when 'HIGH' then 1 when 'NORMAL' then 2 else 3 end,
                  t.created_at desc
         limit 300`);
      return (result as unknown as { rows: unknown[] }).rows;
    });
  }

  @Get(':id')
  @RequirePermission('ops:read')
  async detail(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const result = await tx.execute(sql`
        select t.*, v.plate
          from operations_tasks t
          join vehicles v on v.id = t.vehicle_id
         where t.agency_id = ${req.ctx!.agencyId} and t.id = ${id}
         limit 1`);
      const row = (result as unknown as { rows: unknown[] }).rows[0];
      if (!row) throw new ForbiddenException('Tâche introuvable');
      return row;
    });
  }

  @Post()
  @RequirePermission('fleet:write')
  async create(@Body(new ZodValidationPipe(CreateSchema)) body: z.infer<typeof CreateSchema>, @Req() req: AuthedRequest) {
    return withTenant(req.ctx!.agencyId, async (tx) => {
      const result = await tx.execute(sql`
        insert into operations_tasks (
          agency_id, vehicle_id, reservation_id, contract_id, task_kind, title, description,
          priority, status, assigned_to, vendor_id, scheduled_start, scheduled_end,
          estimated_cost, created_by
        ) values (
          ${req.ctx!.agencyId}, ${body.vehicleId}, ${body.reservationId ?? null}, ${body.contractId ?? null},
          ${body.taskKind}, ${body.title}, ${body.description ?? null}, ${body.priority}, 'OPEN',
          ${body.assignedTo ?? null}, ${body.vendorId ?? null},
          ${body.scheduledStart ? new Date(body.scheduledStart) : null},
          ${body.scheduledEnd ? new Date(body.scheduledEnd) : null},
          ${body.estimatedCost != null ? BigInt(Math.round(Number(body.estimatedCost) * 100)) : null},
          ${req.ctx!.userId}
        ) returning *`);
      const task = (result as unknown as { rows: any[] }).rows[0];
      await audit(tx, { agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName }, entityType: 'operations_task', entityId: task.id, action: 'OPS_TASK_CREATED', after: task });
      await appendEvent(tx, req.ctx!.agencyId, 'OperationsTaskCreated', { taskId: task.id, vehicleId: body.vehicleId, taskKind: body.taskKind });
      return task;
    });
  }

  @Post(':id/triage-return')
  @RequirePermission('fleet:write')
  async triageReturn(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(TriageSchema)) body: z.infer<typeof TriageSchema>, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const found = await tx.execute(sql`
        select * from operations_tasks
         where agency_id = ${req.ctx!.agencyId} and id = ${id}
         for update`);
      const review = (found as unknown as { rows: any[] }).rows[0];
      if (!review) throw new ForbiddenException('Tâche introuvable');
      if (review.task_kind !== 'PREPARATION_REVIEW') throw new ConflictException('Cette tâche n’est pas une revue de préparation');
      if (review.status !== 'OPEN' && review.status !== 'ASSIGNED' && review.status !== 'IN_PROGRESS') throw new ConflictException('La revue de préparation est déjà traitée');

      const children: any[] = [];
      if (body.cleaningNeeded) {
        const r = await tx.execute(sql`
          insert into operations_tasks (
            agency_id, vehicle_id, reservation_id, contract_id, source_inspection_id,
            task_kind, title, description, priority, status, created_by
          ) values (
            ${review.agency_id}, ${review.vehicle_id}, ${review.reservation_id}, ${review.contract_id}, ${review.source_inspection_id},
            'CLEANING', 'Nettoyage / préparation esthétique', ${body.cleaningNote ?? null}, 'NORMAL', 'OPEN', ${req.ctx!.userId}
          ) returning *`);
        children.push((r as unknown as { rows: any[] }).rows[0]);
      }
      if (body.maintenanceNeeded) {
        const r = await tx.execute(sql`
          insert into operations_tasks (
            agency_id, vehicle_id, reservation_id, contract_id, source_inspection_id,
            task_kind, title, description, priority, status, created_by
          ) values (
            ${review.agency_id}, ${review.vehicle_id}, ${review.reservation_id}, ${review.contract_id}, ${review.source_inspection_id},
            'MAINTENANCE', 'Contrôle / réparation mécanique', ${body.maintenanceNote ?? null}, 'HIGH', 'OPEN', ${req.ctx!.userId}
          ) returning *`);
        children.push((r as unknown as { rows: any[] }).rows[0]);
      }

      await tx.execute(sql`
        update operations_tasks
           set status = 'COMPLETED', completion_note = ${children.length ? 'Triage terminé — travaux créés.' : 'Aucun travail supplémentaire requis.'},
               completed_at = now(), completed_by = ${req.ctx!.userId}, updated_at = now()
         where id = ${id} and agency_id = ${req.ctx!.agencyId}`);

      if (children.some((t) => t.task_kind === 'CLEANING')) {
        await transitionVehicle(tx, req.ctx!.agencyId, {
          vehicleId: review.vehicle_id, to: 'CLEANING', actorId: req.ctx!.userId, actorName: req.ctx!.fullName,
          actorKind: 'OPS_SERVICE', reason: 'Préparation post-retour — nettoyage requis', sourceType: 'operations_task', sourceId: id,
        });
      } else if (children.some((t) => t.task_kind === 'MAINTENANCE')) {
        await transitionVehicle(tx, req.ctx!.agencyId, {
          vehicleId: review.vehicle_id, to: 'MAINTENANCE', actorId: req.ctx!.userId, actorName: req.ctx!.fullName,
          actorKind: 'OPS_SERVICE', reason: 'Préparation post-retour — maintenance requise', sourceType: 'operations_task', sourceId: id,
        });
      } else {
        await transitionVehicle(tx, req.ctx!.agencyId, {
          vehicleId: review.vehicle_id, to: 'AVAILABLE', actorId: req.ctx!.userId, actorName: req.ctx!.fullName,
          actorKind: 'OPS_SERVICE', reason: 'Retour inspecté — aucune préparation supplémentaire requise', sourceType: 'operations_task', sourceId: id,
        });
      }

      await audit(tx, { agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName }, entityType: 'operations_task', entityId: id, action: 'RETURN_PREPARATION_TRIAGED', after: { cleaningNeeded: body.cleaningNeeded, maintenanceNeeded: body.maintenanceNeeded, childTaskIds: children.map((t) => t.id) } });
      await appendEvent(tx, req.ctx!.agencyId, 'ReturnPreparationTriaged', { taskId: id, vehicleId: review.vehicle_id, childTaskIds: children.map((t) => t.id) });
      return { reviewTaskId: id, createdTaskIds: children.map((t) => t.id) };
    });
    dispatchPendingSafe();
    return result;
  }

  @Post(':id/update')
  @RequirePermission('fleet:write')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(UpdateSchema)) body: z.infer<typeof UpdateSchema>, @Req() req: AuthedRequest) {
    const result = await withTenant(req.ctx!.agencyId, async (tx) => {
      const found = await tx.execute(sql`
        select * from operations_tasks where agency_id = ${req.ctx!.agencyId} and id = ${id} for update`);
      const current = (found as unknown as { rows: any[] }).rows[0];
      if (!current) throw new ForbiddenException('Tâche introuvable');
      if (['COMPLETED', 'CANCELLED'].includes(current.status) && body.status && body.status !== current.status) throw new ConflictException('Une tâche terminée ne peut pas être réouverte');

      if (body.status === 'COMPLETED' && !body.completionNote?.trim() && current.task_kind !== 'CLEANING') {
        throw new ConflictException('Une note de fin est requise pour cette tâche');
      }

      const nextStatus = body.status ?? current.status;
      const actualCost = body.actualCost != null ? BigInt(Math.round(Number(body.actualCost) * 100)) : null;
      const r = await tx.execute(sql`
        update operations_tasks set
          status = ${nextStatus},
          assigned_to = ${body.assignedTo === undefined ? current.assigned_to : body.assignedTo},
          vendor_id = ${body.vendorId === undefined ? current.vendor_id : body.vendorId},
          completion_note = ${body.completionNote ?? current.completion_note},
          actual_cost = ${actualCost ?? current.actual_cost},
          evidence = ${body.evidence ? JSON.stringify(body.evidence) : current.evidence},
          completed_at = ${nextStatus === 'COMPLETED' ? new Date() : current.completed_at},
          completed_by = ${nextStatus === 'COMPLETED' ? req.ctx!.userId : current.completed_by},
          updated_at = now()
        where id = ${id} and agency_id = ${req.ctx!.agencyId}
        returning *`);
      const task = (r as unknown as { rows: any[] }).rows[0];

      if (nextStatus === 'IN_PROGRESS' && current.status !== 'IN_PROGRESS' && current.task_kind === 'CLEANING') {
        await transitionVehicle(tx, req.ctx!.agencyId, { vehicleId: current.vehicle_id, to: 'CLEANING', actorId: req.ctx!.userId, actorName: req.ctx!.fullName, actorKind: 'OPS_SERVICE', reason: 'Tâche de nettoyage démarrée', sourceType: 'operations_task', sourceId: id });
      }

      if (nextStatus === 'COMPLETED') {
        const open = await tx.execute(sql`
          select count(*)::int as n from operations_tasks
           where agency_id = ${req.ctx!.agencyId} and vehicle_id = ${current.vehicle_id}
             and status in ('OPEN','ASSIGNED','IN_PROGRESS','BLOCKED')`);
        const n = Number((open as unknown as { rows: { n: number }[] }).rows[0]?.n ?? 0);
        if (n === 0) {
          const vehicle = await tx.execute(sql`select operational_status from vehicles where id = ${current.vehicle_id} and agency_id = ${req.ctx!.agencyId} for update`);
          const status = (vehicle as unknown as { rows: { operational_status: string }[] }).rows[0]?.operational_status;
          if (status === 'CLEANING') {
            await transitionVehicle(tx, req.ctx!.agencyId, { vehicleId: current.vehicle_id, to: 'AVAILABLE', actorId: req.ctx!.userId, actorName: req.ctx!.fullName, actorKind: 'OPS_SERVICE', reason: 'Toutes les tâches post-retour terminées', sourceType: 'operations_task', sourceId: id });
          }
        }
      }

      await audit(tx, { agencyId: req.ctx!.agencyId, actor: { id: req.ctx!.userId, name: req.ctx!.fullName }, entityType: 'operations_task', entityId: id, action: nextStatus === 'COMPLETED' ? 'OPS_TASK_COMPLETED' : 'OPS_TASK_UPDATED', before: { status: current.status }, after: { status: nextStatus }, reason: body.completionNote });
      return task;
    });
    dispatchPendingSafe();
    return result;
  }
}

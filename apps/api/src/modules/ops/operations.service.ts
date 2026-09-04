import { ConflictException, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { withTenant } from '../../db/client';
import { audit } from '../audit/audit.service.js';
import { transitionVehicle } from '../fleet/fleet.service.js';

@Injectable()
export class OperationsService {
  async completeMaintenance(agencyId: string, taskId: string, actorId: string, actorName: string, note: string) {
    return withTenant(agencyId, async (tx) => {
      const found = await tx.execute(sql`select * from operations_tasks where agency_id = ${agencyId} and id = ${taskId} for update`);
      const task = (found as unknown as { rows: any[] }).rows[0];
      if (!task) throw new ConflictException('Tâche introuvable');
      if (task.task_kind !== 'MAINTENANCE') throw new ConflictException('Cette tâche n’est pas une tâche de maintenance');
      if (!note.trim()) throw new ConflictException('Une note de fin est requise');
      if (['COMPLETED', 'CANCELLED'].includes(task.status)) throw new ConflictException('Cette tâche est déjà clôturée');

      const updated = await tx.execute(sql`
        update operations_tasks
           set status = 'COMPLETED', completion_note = ${note}, completed_at = now(), completed_by = ${actorId}, updated_at = now()
         where id = ${taskId} and agency_id = ${agencyId}
         returning *`);

      const open = await tx.execute(sql`
        select count(*)::int as n from operations_tasks
         where agency_id = ${agencyId} and vehicle_id = ${task.vehicle_id}
           and status in ('OPEN','ASSIGNED','IN_PROGRESS','BLOCKED')`);
      const n = Number((open as unknown as { rows: { n: number }[] }).rows[0]?.n ?? 0);
      if (n === 0) {
        const vehicle = await tx.execute(sql`select operational_status from vehicles where agency_id = ${agencyId} and id = ${task.vehicle_id} for update`);
        const status = (vehicle as unknown as { rows: { operational_status: string }[] }).rows[0]?.operational_status;
        if (status === 'MAINTENANCE') {
          await transitionVehicle(tx, agencyId, {
            vehicleId: task.vehicle_id, to: 'AVAILABLE', actorId, actorName, actorKind: 'OPS_SERVICE',
            reason: 'Maintenance post-retour terminée — aucune tâche opérationnelle restante', sourceType: 'operations_task', sourceId: taskId,
          });
        }
      }

      await audit(tx, { agencyId, actor: { id: actorId, name: actorName }, entityType: 'operations_task', entityId: taskId, action: 'MAINTENANCE_TASK_COMPLETED', before: { status: task.status }, after: { status: 'COMPLETED' }, reason: note });
      return (updated as unknown as { rows: any[] }).rows[0];
    });
  }
}

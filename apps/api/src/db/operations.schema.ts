import { bigint, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const ts = (name: string) => timestamp(name, { withTimezone: true });

/**
 * First-class operational work orders. Foreign-key relationships are enforced by
 * the hand-reviewed SQL migration; this table definition intentionally mirrors
 * that contract without duplicating the vehicle/reservation schema here.
 */
export const operationsTasks = pgTable('operations_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  agencyId: uuid('agency_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull(),
  reservationId: uuid('reservation_id'),
  contractId: uuid('contract_id'),
  sourceInspectionId: uuid('source_inspection_id'),
  taskKind: text('task_kind').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').notNull().default('NORMAL'),
  status: text('status').notNull().default('OPEN'),
  assignedTo: uuid('assigned_to'),
  vendorId: uuid('vendor_id'),
  scheduledStart: ts('scheduled_start'),
  scheduledEnd: ts('scheduled_end'),
  estimatedCost: bigint('estimated_cost', { mode: 'bigint' }),
  approvedBudget: bigint('approved_budget', { mode: 'bigint' }),
  actualCost: bigint('actual_cost', { mode: 'bigint' }),
  evidence: jsonb('evidence'),
  completionNote: text('completion_note'),
  completedAt: ts('completed_at'),
  completedBy: uuid('completed_by'),
  createdBy: uuid('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  index('operations_tasks_vehicle_idx').on(t.agencyId, t.vehicleId, t.status, t.createdAt),
  index('operations_tasks_status_idx').on(t.agencyId, t.status, t.priority, t.createdAt),
  index('operations_tasks_assignee_idx').on(t.agencyId, t.assignedTo, t.status),
  index('operations_tasks_inspection_idx').on(t.sourceInspectionId),
]);

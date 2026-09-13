-- First-class operational work orders.
-- These tasks are tenant-scoped and deliberately independent from payments/maintenance records:
-- a task describes work to be done; financial settlement happens elsewhere.

create table if not exists operations_tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  vehicle_id uuid not null references vehicles(id),
  reservation_id uuid references reservations(id),
  contract_id uuid references contracts(id),
  source_inspection_id uuid references inspections(id),
  task_kind text not null,
  title text not null,
  description text,
  priority text not null default 'NORMAL',
  status text not null default 'OPEN',
  assigned_to uuid,
  vendor_id uuid,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  estimated_cost bigint,
  approved_budget bigint,
  actual_cost bigint,
  evidence jsonb,
  completion_note text,
  completed_at timestamptz,
  completed_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_tasks_kind_ck check (task_kind in ('PREPARATION_REVIEW','CLEANING','MAINTENANCE','QA')),
  constraint operations_tasks_priority_ck check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  constraint operations_tasks_status_ck check (status in ('OPEN','ASSIGNED','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED'))
);

create index if not exists operations_tasks_vehicle_idx on operations_tasks(agency_id, vehicle_id, status, created_at);
create index if not exists operations_tasks_status_idx on operations_tasks(agency_id, status, priority, created_at);
create index if not exists operations_tasks_assignee_idx on operations_tasks(agency_id, assigned_to, status);
create index if not exists operations_tasks_inspection_idx on operations_tasks(source_inspection_id);

-- Every completed return inspection creates an operational gate. This is intentionally
-- an AFTER trigger: the inspection row must exist before it can be referenced by the task.
create or replace function create_return_preparation_task()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'RETURN' then
    insert into operations_tasks (
      agency_id, vehicle_id, reservation_id, contract_id, source_inspection_id,
      task_kind, title, description, priority, status, created_by
    ) values (
      new.agency_id, new.vehicle_id, new.reservation_id, new.contract_id, new.id,
      'PREPARATION_REVIEW',
      'Préparation post-retour à contrôler',
      'Contrôler les dommages, le nettoyage et les besoins de maintenance avant remise en location.',
      case when exists (
        select 1 from damages d
        where d.agency_id = new.agency_id
          and d.discovered_inspection_id = new.id
          and d.preexisting = false
      ) then 'HIGH' else 'NORMAL' end,
      'OPEN',
      new.performed_by
    );
  end if;
  return new;
end;
$$;

drop trigger if exists inspections_create_return_task on inspections;
create trigger inspections_create_return_task
after insert on inspections
for each row execute function create_return_preparation_task();

-- No direct INSPECTED -> AVAILABLE bypass. Availability requires all operational tasks
-- for the vehicle to be completed/cancelled. The API still owns the normal state machine.
create or replace function enforce_vehicle_availability_task_gate()
returns trigger
language plpgsql
as $$
declare
  open_tasks integer := 0;
begin
  if new.operational_status = 'AVAILABLE' and old.operational_status = 'INSPECTED' then
    select count(*) into open_tasks
      from operations_tasks t
     where t.agency_id = new.agency_id
       and t.vehicle_id = new.id
       and t.status in ('OPEN','ASSIGNED','IN_PROGRESS','BLOCKED');
    if open_tasks > 0 then
      raise exception using
        errcode = 'P0001',
        message = 'POST_RETURN_TASKS_INCOMPLETE',
        detail = format('vehicle_id=%s open_tasks=%s', new.id, open_tasks);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_availability_task_gate on vehicles;
create trigger vehicles_availability_task_gate
before update of operational_status on vehicles
for each row execute function enforce_vehicle_availability_task_gate();

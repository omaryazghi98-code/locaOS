/**
 * Pure derivations over real API payloads → NAVI presentation model.
 * No business rules are created here: everything is a regrouping/explanation of what the
 * backend already returned (command-center actions, focus blockers, alerts, tasks, vehicles).
 */
import type { VehicleStatus } from '@locaos/domain';
import type { Alert, CommandCenter, Focus, OpsTask, Vehicle } from './types';
import { OPEN_TASK_STATUSES } from './types';
import type { NaviCopy } from './i18n';

export type Priority = 1 | 2 | 3;
export type AttentionKind = 'ALERT' | 'OVERDUE' | 'TRANSFER' | 'ASSIGN' | 'BLOCKER' | 'RETURN' | 'DOCS' | 'FLEET';
export interface AttentionItem {
  id: string;
  priority: Priority;
  kind: AttentionKind;
  severity: 'CRITICAL' | 'HIGH' | 'ATTENTION' | 'INFO';
  title: string;
  why: string;
  entities: { label: string; href: string; kind: 'vehicle' | 'reservation' | 'contract' | 'alert' | 'page'; status?: string }[];
  primary: { label: string; href: string };
  alert?: Alert;          // when the item is an alert we can ack/resolve in place
  at?: string;            // timestamp when relevant
}


export function deriveAttention(input: { center?: CommandCenter; focus?: Focus; alerts?: Alert[]; vehicles?: Vehicle[] }, t: NaviCopy, lang: string): AttentionItem[] {
  const { center, focus, alerts = [], vehicles = [] } = input;
  const items: AttentionItem[] = [];
  const vehicleByPlate = new Map(vehicles.map((v) => [v.plate, v]));
  const seen = new Set<string>();
  const push = (it: AttentionItem) => { if (!seen.has(it.id)) { seen.add(it.id); items.push(it); } };
  const timeFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-MA' : 'fr-MA', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' });

  // 1) Alerts (authoritative, actionable in place). Critical → P1, High → P2, others → P3.
  for (const a of alerts) {
    const p: Priority = a.severity === 'CRITICAL' ? 1 : a.severity === 'HIGH' ? 2 : 3;
    const plate = a.title.match(/\b\d{4,5}-[A-Z]{1,2}-\d{1,2}\b/)?.[0];
    const v = plate ? vehicleByPlate.get(plate) : undefined;
    push({
      id: `alert:${a.id}`, priority: p, kind: 'ALERT', severity: a.severity === 'CRITICAL' ? 'CRITICAL' : a.severity === 'HIGH' ? 'HIGH' : 'ATTENTION',
      title: a.title, why: a.message, alert: a, at: a.createdAt,
      entities: v ? [{ label: v.plate, href: `/fleet/${v.id}`, kind: 'vehicle', status: v.operationalStatus }] : [],
      primary: v ? { label: t.attention.vehicle, href: `/fleet/${v.id}` } : { label: t.attention.seeAlerts, href: '/alerts' },
    });
  }

  // 2) Command-center "wrong" + "willGoWrong" + actions (already prioritized by backend)
  if (center) {
    for (const v of center.wrong.overdue) {
      const veh = vehicleByPlate.get(v.plate);
      push({ id: `overdue:${v.id}`, priority: 1, kind: 'OVERDUE', severity: 'CRITICAL', title: `${t.attention.kinds.OVERDUE} — ${v.plate}`, why: t.attention.whyOverdue,
        entities: [{ label: v.plate, href: `/fleet/${v.id}`, kind: 'vehicle', status: veh?.operationalStatus ?? 'OVERDUE' }], primary: { label: t.attention.vehicle, href: `/fleet/${v.id}` } });
    }
    for (const m of center.willGoWrong.branchMismatches) {
      const veh = m.plate ? vehicleByPlate.get(m.plate) : undefined;
      push({ id: `mismatch:${m.id}`, priority: 2, kind: 'TRANSFER', severity: 'HIGH', title: `${m.plate ?? '—'} · ${m.reference}`, why: t.attention.whyMismatch, at: m.pickup_at,
        entities: [
          ...(veh ? [{ label: veh.plate, href: `/fleet/${veh.id}`, kind: 'vehicle' as const, status: veh.operationalStatus }] : []),
          { label: m.reference, href: `/reservations/${m.id}`, kind: 'reservation' },
        ],
        primary: { label: t.attention.transfer, href: '/today' } });
    }
    for (const a of center.actions) {
      if (a.kind === 'ASSIGN') {
        push({ id: `assign:${a.href}`, priority: 2, kind: 'ASSIGN', severity: 'HIGH', title: a.label, why: a.reason || t.attention.whyUnassigned,
          entities: [{ label: t.attention.reservation, href: a.href, kind: 'reservation' }], primary: { label: t.attention.assign, href: a.href } });
      }
    }
    for (const d of center.willGoWrong.docsExpiring) {
      push({ id: `docs:${d.type}`, priority: 3, kind: 'DOCS', severity: 'ATTENTION', title: `${d.n} × ${d.type}`, why: t.attention.whyDocs,
        entities: [{ label: t.fleet.open, href: '/fleet', kind: 'page' }], primary: { label: t.fleet.open, href: '/fleet' } });
    }
  }

  // 3) Focus blockers — today's pickups with unresolved blockers, returns awaiting inspection
  if (focus) {
    for (const p of focus.pickups.filter((x) => x.blockers.length > 0)) {
      const veh = p.plate ? vehicleByPlate.get(p.plate) : undefined;
      const blockers = p.blockers.map((b) => (t.attention.blockers as Record<string, string>)[b] ?? b).join(' · ');
      push({ id: `blocker:${p.reservationId}`, priority: 2, kind: 'BLOCKER', severity: 'HIGH', at: p.pickupAt,
        title: `${timeFmt.format(new Date(p.pickupAt))} — ${p.customerName ?? p.categoryName}`, why: `${t.attention.whyBlocked}: ${blockers}.`,
        entities: [
          ...(veh ? [{ label: veh.plate, href: `/fleet/${veh.id}`, kind: 'vehicle' as const, status: veh.operationalStatus }] : []),
          ...(p.contractId ? [{ label: t.attention.contract, href: `/contracts/${p.contractId}`, kind: 'contract' as const }] : []),
          { label: t.attention.reservation, href: `/reservations/${p.reservationId}`, kind: 'reservation' },
        ],
        primary: p.blockers.includes('inspection_missing')
          ? { label: t.attention.inspect, href: `/field?reservationId=${p.reservationId}&kind=DEPARTURE` }
          : p.contractId ? { label: t.attention.contract, href: `/contracts/${p.contractId}` } : { label: t.attention.reservation, href: `/reservations/${p.reservationId}` } });
    }
    for (const r of focus.returns.filter((x) => !x.returnInspectionDone && x.contractId)) {
      const veh = r.plate ? vehicleByPlate.get(r.plate) : undefined;
      push({ id: `return:${r.reservationId}`, priority: 3, kind: 'RETURN', severity: 'ATTENTION', at: r.returnAt,
        title: `${timeFmt.format(new Date(r.returnAt))} — ${r.customerName ?? r.plate ?? r.categoryName}`, why: t.attention.whyReturnInsp,
        entities: [
          ...(veh ? [{ label: veh.plate, href: `/fleet/${veh.id}`, kind: 'vehicle' as const, status: veh.operationalStatus }] : []),
          ...(r.contractId ? [{ label: t.attention.contract, href: `/contracts/${r.contractId}`, kind: 'contract' as const }] : []),
        ],
        primary: { label: t.attention.inspect, href: `/field?reservationId=${r.reservationId}&kind=RETURN` } });
    }
  }

  return items.sort((a, b) => a.priority - b.priority || (a.at && b.at ? new Date(a.at).getTime() - new Date(b.at).getTime() : 0));
}

/* ── Fleet grouping (display only; statuses come from domain) ───────────── */
export const STATUS_GROUPS: Record<'available' | 'renting' | 'pipeline' | 'prep' | 'exceptional', readonly VehicleStatus[]> = {
  available: ['AVAILABLE'],
  renting: ['RENTED', 'OVERDUE', 'IN_TRANSIT'],
  pipeline: ['RESERVED', 'PREPARING', 'CONTRACT_READY'],
  prep: ['AWAITING_INSPECTION', 'INSPECTED', 'CLEANING', 'MAINTENANCE'],
  exceptional: ['IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE'],
};
export const STATUS_ORDER: readonly VehicleStatus[] = [
  'AVAILABLE', 'RESERVED', 'PREPARING', 'CONTRACT_READY', 'IN_TRANSIT', 'RENTED', 'OVERDUE',
  'AWAITING_INSPECTION', 'INSPECTED', 'CLEANING', 'MAINTENANCE', 'IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE',
];

export function countByStatus(vehicles: Vehicle[]) {
  const counts = new Map<VehicleStatus, number>();
  for (const v of vehicles) counts.set(v.operationalStatus, (counts.get(v.operationalStatus) ?? 0) + 1);
  return STATUS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => ({ status: s, n: counts.get(s)! }));
}

/* ── Post-return pipeline lanes (vehicle status + open task kinds) ───────── */
export type Stage = 'INSPECTED' | 'PREPARATION_REVIEW' | 'CLEANING' | 'MAINTENANCE' | 'QA' | 'AVAILABLE';
export const STAGES: readonly Stage[] = ['INSPECTED', 'PREPARATION_REVIEW', 'CLEANING', 'MAINTENANCE', 'QA', 'AVAILABLE'];
export interface StageVehicle { vehicleId: string; plate: string; status: VehicleStatus | null; tasks: OpsTask[]; }

/**
 * Places vehicles into lanes by what is ACTUALLY happening:
 * - open PREPARATION_REVIEW task → Review lane (vehicle status INSPECTED)
 * - open QA task → QA lane (vehicle CLEANING or MAINTENANCE; QA is a task, not a vehicle state)
 * - open CLEANING / MAINTENANCE task → matching lane (active phase = vehicle status)
 * - INSPECTED without any open task → Inspected lane (review not yet created / not visible)
 * - AVAILABLE lane: vehicles released by a completed QA/review task in the last 24h (from tasks list)
 */
export function derivePipeline(vehicles: Vehicle[], tasks: OpsTask[]): Record<Stage, StageVehicle[]> {
  const lanes: Record<Stage, StageVehicle[]> = { INSPECTED: [], PREPARATION_REVIEW: [], CLEANING: [], MAINTENANCE: [], QA: [], AVAILABLE: [] };
  const open = tasks.filter((t) => OPEN_TASK_STATUSES.includes(t.status));
  const byVehicle = new Map<string, OpsTask[]>();
  for (const t of open) byVehicle.set(t.vehicle_id, [...(byVehicle.get(t.vehicle_id) ?? []), t]);
  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const placed = new Set<string>();

  for (const [vehicleId, vTasks] of byVehicle) {
    const v = vById.get(vehicleId);
    const plate = v?.plate ?? vTasks[0]!.plate;
    const kinds = new Set(vTasks.map((t) => t.task_kind));
    const entry: StageVehicle = { vehicleId, plate, status: v?.operationalStatus ?? null, tasks: vTasks };
    let stage: Stage;
    if (kinds.has('PREPARATION_REVIEW')) stage = 'PREPARATION_REVIEW';
    else if (kinds.has('QA') && !kinds.has('CLEANING') && !kinds.has('MAINTENANCE')) stage = 'QA';
    else if (v?.operationalStatus === 'MAINTENANCE' || (kinds.has('MAINTENANCE') && !kinds.has('CLEANING'))) stage = 'MAINTENANCE';
    else stage = 'CLEANING';
    lanes[stage].push(entry); placed.add(vehicleId);
  }
  for (const v of vehicles) {
    if (placed.has(v.id)) continue;
    if (v.operationalStatus === 'INSPECTED') lanes.INSPECTED.push({ vehicleId: v.id, plate: v.plate, status: v.operationalStatus, tasks: [] });
    else if (v.operationalStatus === 'CLEANING') lanes.CLEANING.push({ vehicleId: v.id, plate: v.plate, status: v.operationalStatus, tasks: [] });
  }
  const dayAgo = Date.now() - 86_400_000;
  const released = tasks.filter((t) => t.status === 'COMPLETED' && t.completed_at && new Date(t.completed_at).getTime() > dayAgo && (t.task_kind === 'QA' || t.task_kind === 'PREPARATION_REVIEW'));
  for (const t of released) {
    const v = vById.get(t.vehicle_id);
    if (v?.operationalStatus === 'AVAILABLE' && !lanes.AVAILABLE.some((x) => x.vehicleId === v.id)) lanes.AVAILABLE.push({ vehicleId: v.id, plate: v.plate, status: v.operationalStatus, tasks: [t] });
  }
  return lanes;
}

/* ── Activity timeline (alerts + tasks, newest first) ───────────────────── */
export interface ActivityEvent { id: string; at: string; kind: 'alert' | 'task'; severity?: string; status?: string; what: string; detail?: string; href?: string }
export function deriveActivity(alerts: Alert[] = [], tasks: OpsTask[] = [], t: NaviCopy, limit = 14): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const a of alerts) events.push({ id: `a:${a.id}`, at: a.createdAt, kind: 'alert', severity: a.severity, what: a.title, detail: a.message, href: '/alerts' });
  for (const task of tasks) {
    events.push({ id: `t:${task.id}:c`, at: task.created_at, kind: 'task', status: task.task_kind, what: `${task.plate} · ${t.pipeline.stages[task.task_kind]?.name ?? task.task_kind} ${t.timeline.created}`, detail: task.title, href: '/ops' });
    if (task.completed_at) events.push({ id: `t:${task.id}:d`, at: task.completed_at, kind: 'task', status: task.task_kind, what: `${task.plate} · ${t.pipeline.stages[task.task_kind]?.name ?? task.task_kind} ${t.timeline.completed}`, detail: task.assignee_name || undefined, href: '/ops' });
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}

/* ── Brief sentence (real numbers only) ─────────────────────────────────── */
export function briefCounts(center?: CommandCenter, focus?: Focus, attention: AttentionItem[] = [], lanes?: Record<Stage, StageVehicle[]>) {
  return {
    departures: center?.happening.departuresToday ?? focus?.pickups.length ?? 0,
    returns: center?.happening.returnsToday ?? focus?.returns.length ?? 0,
    attention: attention.filter((a) => a.priority <= 2).length,
    overdue: center?.wrong.overdue.length ?? 0,
    blocked: focus?.pickups.filter((p) => p.blockers.length > 0).length ?? 0,
    prep: lanes ? STAGES.filter((s) => s !== 'AVAILABLE').reduce((n, s) => n + lanes[s].length, 0) : 0,
  };
}

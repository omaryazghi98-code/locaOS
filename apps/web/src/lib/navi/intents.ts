/**
 * NAVI command router — structured retrieval over ALREADY-LOADED real data.
 *
 * There is no natural-language backend endpoint yet (documented gap). This router recognises a
 * small set of high-value intents (spec: NAVI_HOME_UX_SPEC "Search / ask NAVI") and answers with
 * ANSWER → EVIDENCE → RELATED → ACTIONS built strictly from API payloads. No prose is invented.
 */
import { VEHICLE_STATUS_LABELS } from '@locaos/domain/labels';
import type { VehicleStatus } from '@locaos/domain';
import type { Locale } from '@/lib/client-preferences';
import type { AttentionItem, Stage, StageVehicle } from './derive';
import { STAGES } from './derive';
import type { NaviCopy } from './i18n';
import type { Alert, CommandCenter, Focus, OpsTask, Vehicle } from './types';
import { OPEN_TASK_STATUSES } from './types';

export interface Ctx { center?: CommandCenter; focus?: Focus; tasks?: OpsTask[]; alerts?: Alert[]; vehicles?: Vehicle[]; attention: AttentionItem[]; lanes?: Record<Stage, StageVehicle[]>; t: NaviCopy; lang: Locale }
export interface Evidence { text: string; href?: string }
export interface Related { label: string; href: string; status?: string }
export interface Action { label: string; href: string; primary?: boolean }
export interface Answer { intent: string; answer: string; evidence: Evidence[]; related: Related[]; actions: Action[]; empty?: boolean }
export interface Suggestion { id: string; label: string; query: string }

const PLATE = /\b(\d{4,5})[\s-]?([A-Za-z]{1,2})[\s-]?(\d{1,2})\b/;
const RES = /\bRES-?\d{3,}\b/i;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function suggestions(t: NaviCopy): Suggestion[] {
  return [
    { id: 'attention', label: t.cmd.s1, query: t.cmd.s1 },
    { id: 'blockers', label: t.cmd.s2, query: t.cmd.s2 },
    { id: 'fleet', label: t.cmd.s3, query: t.cmd.s3 },
    { id: 'prep', label: t.cmd.s4, query: t.cmd.s4 },
    { id: 'returns', label: t.cmd.s5, query: t.cmd.s5 },
  ];
}

const NAV: { keys: string[]; href: string; label: Record<Locale, string> }[] = [
  { keys: ['alerte', 'alert', 'تنبيه'], href: '/alerts', label: { fr: 'Alertes', en: 'Alerts', ar: 'التنبيهات' } },
  { keys: ['flotte', 'fleet', 'vehicule', 'vehicle', 'أسطول', 'سيارة'], href: '/fleet', label: { fr: 'Flotte', en: 'Fleet', ar: 'الأسطول' } },
  { keys: ['operation', 'ops', 'tache', 'task', 'عمليات', 'مهام'], href: '/ops', label: { fr: 'Opérations', en: 'Operations', ar: 'العمليات' } },
  { keys: ['reservation', 'booking', 'حجز'], href: '/reservations', label: { fr: 'Réservations', en: 'Reservations', ar: 'الحجوزات' } },
  { keys: ['contrat', 'contract', 'عقد'], href: '/contracts', label: { fr: 'Contrats', en: 'Contracts', ar: 'العقود' } },
  { keys: ['client', 'customer', 'عميل'], href: '/customers', label: { fr: 'Clients', en: 'Customers', ar: 'العملاء' } },
  { keys: ['caisse', 'finance', 'cash', 'مالية'], href: '/finance', label: { fr: 'Caisse & finances', en: 'Finance', ar: 'المالية' } },
  { keys: ['calendrier', 'calendar', 'planning', 'تقويم'], href: '/calendar', label: { fr: 'Calendrier', en: 'Calendar', ar: 'التقويم' } },
  { keys: ['aujourd', 'today', 'اليوم'], href: '/today', label: { fr: 'Aujourd’hui', en: 'Today', ar: 'اليوم' } },
  { keys: ['brief', 'موجز'], href: '/brief', label: { fr: 'Brief', en: 'Brief', ar: 'الموجز' } },
];

export function route(query: string, ctx: Ctx): Answer {
  const q = norm(query.trim());
  const { t, lang } = ctx;
  const label = (s: VehicleStatus | string) => (VEHICLE_STATUS_LABELS as Record<string, Record<Locale, string>>)[s]?.[lang] ?? s;
  const time = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-MA' : 'fr-MA', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' });

  // ── Plate lookup: "pourquoi 18876-A-6 …", "18876 A 6"
  const pm = query.match(PLATE);
  if (pm && pm[1] && pm[2] && pm[3]) {
    const plate = `${pm[1]}-${pm[2].toUpperCase()}-${pm[3]}`;
    const v = ctx.vehicles?.find((x) => x.plate === plate);
    if (!v) return { intent: 'vehicle', answer: `${t.cmd.noMatch} (${plate})`, evidence: [], related: [], actions: [{ label: t.fleet.open, href: '/fleet' }], empty: true };
    const openTasks = (ctx.tasks ?? []).filter((x) => x.vehicle_id === v.id && OPEN_TASK_STATUSES.includes(x.status));
    const alerts = (ctx.alerts ?? []).filter((a) => a.title.includes(plate) || a.message.includes(plate));
    const stage = ctx.lanes ? STAGES.find((s) => ctx.lanes![s].some((x) => x.vehicleId === v.id)) : undefined;
    const pick = ctx.focus?.pickups.find((p) => p.plate === plate);
    const ret = ctx.focus?.returns.find((r) => r.plate === plate);
    const overdue = ctx.center?.wrong.overdue.some((o) => o.plate === plate);
    const evidence: Evidence[] = [
      { text: `${plate} · ${v.model ? `${v.model.make} ${v.model.model} ${v.model.year} · ` : ''}${label(v.operationalStatus)} · ${v.currentMileageKm.toLocaleString()} km · ${v.fuelLevelPct}%`, href: `/fleet/${v.id}` },
      ...(overdue ? [{ text: t.attention.whyOverdue, href: `/fleet/${v.id}` }] : []),
      ...(stage ? [{ text: `${t.pipeline.title}: ${t.pipeline.stages[stage].name} — ${t.pipeline.stages[stage].desc}`, href: '/ops' }] : []),
      ...openTasks.map((x) => ({ text: `${t.timeline.task}: ${x.title} · ${x.status} · ${x.priority}`, href: '/ops' })),
      ...alerts.map((a) => ({ text: `${a.severity} · ${a.title} — ${a.message}`, href: '/alerts' })),
      ...(pick ? [{ text: `${t.ops.departures} ${time.format(new Date(pick.pickupAt))} · ${pick.customerName ?? ''}${pick.blockers.length ? ` · ${pick.blockers.map((b) => (t.attention.blockers as Record<string, string>)[b] ?? b).join(', ')}` : ''}`, href: `/reservations/${pick.reservationId}` }] : []),
      ...(ret ? [{ text: `${t.ops.returns} ${time.format(new Date(ret.returnAt))} · ${ret.customerName ?? ''} · ${ret.returnInspectionDone ? t.ops.inspected : t.ops.toInspect}`, href: ret.contractId ? `/contracts/${ret.contractId}` : `/reservations/${ret.reservationId}` }] : []),
    ];
    const answer = `${plate}: ${label(v.operationalStatus)}${stage ? ` · ${t.pipeline.stages[stage].name}` : ''}${openTasks.length ? ` · ${openTasks.length} ${openTasks.length === 1 ? t.pipeline.tasks : t.pipeline.tasksPl}` : ''}${alerts.length ? ` · ${alerts.length} ${t.timeline.alert.toLowerCase()}${alerts.length > 1 ? 's' : ''}` : ''}.`;
    return {
      intent: 'vehicle', answer, evidence,
      related: [{ label: plate, href: `/fleet/${v.id}`, status: v.operationalStatus }, ...(pick ? [{ label: t.attention.reservation, href: `/reservations/${pick.reservationId}` }] : []), ...(ret?.contractId ? [{ label: t.attention.contract, href: `/contracts/${ret.contractId}` }] : [])],
      actions: [{ label: t.attention.vehicle, href: `/fleet/${v.id}`, primary: true }, ...(openTasks.length ? [{ label: t.pipeline.openOps, href: '/ops' }] : []), ...(ret && !ret.returnInspectionDone && ret.contractId ? [{ label: t.attention.inspect, href: `/field?reservationId=${ret.reservationId}&kind=RETURN` }] : [])],
    };
  }

  // ── Reservation reference
  const rm = query.match(RES);
  if (rm) {
    const ref = rm[0].toUpperCase().replace(/^RES-?/, 'RES-');
    const mm = ctx.center?.willGoWrong.branchMismatches.find((m) => m.reference === ref);
    const action = ctx.center?.actions.find((a) => a.label.includes(ref));
    if (!mm && !action) return { intent: 'reservation', answer: `${t.cmd.noMatch} (${ref})`, evidence: [], related: [], actions: [{ label: t.attention.reservation, href: '/reservations' }], empty: true };
    const href = mm ? `/reservations/${mm.id}` : action!.href;
    return { intent: 'reservation', answer: `${ref}: ${mm ? t.attention.whyMismatch : action!.reason}`, evidence: [{ text: mm ? `${mm.plate ?? '—'} · ${ref}` : action!.label, href }], related: [{ label: ref, href }], actions: [{ label: t.attention.reservation, href, primary: true }] };
  }

  const has = (...keys: string[]) => keys.some((k) => q.includes(norm(k)));

  // ── Explicit overdue vehicles
  // This must run before the broad fleet matcher because queries such as
  // "Quels véhicules sont en retard ?" contain "vehicule" and would otherwise
  // be classified as a fleet overview.
  if (has('retard', 'overdue', 'en retard', 'late', 'متأخر')) {
    const overdue = ctx.center?.wrong.overdue ?? [];
    return {
      intent: 'overdue', empty: overdue.length === 0,
      answer: overdue.length === 0
        ? (lang === 'ar' ? 'لا توجد مركبات متأخرة.' : lang === 'en' ? 'No vehicles are overdue.' : 'Aucun véhicule en retard.')
        : `${overdue.length} ${overdue.length === 1 ? t.briefLede.overdue : t.briefLede.overduePl}.`,
      evidence: overdue.map((v) => ({ text: `${v.plate} · ${t.attention.whyOverdue}`, href: `/fleet` })),
      related: overdue.map((v) => ({ label: v.plate, href: `/fleet`, status: 'OVERDUE' })),
      actions: [{ label: t.fleet.open, href: '/fleet', primary: true }, { label: t.attention.seeAlerts, href: '/alerts' }],
    };
  }

  // ── What needs attention
  if (has('attention', 'urgent', 'priorit', 'اهتمام', 'important', 'wrong', 'mal')) {
    const top = ctx.attention.slice(0, 6);
    const n = ctx.attention.filter((a) => a.priority <= 2).length;
    return {
      intent: 'attention', empty: top.length === 0,
      answer: top.length === 0 ? t.attention.allClearDesc : `${n} ${n === 1 ? t.briefLede.attention : t.briefLede.attentionPl}.`,
      evidence: top.map((a) => ({ text: `${t.attention.kinds[a.kind]} · ${a.title} — ${a.why}`, href: a.primary.href })),
      related: top.flatMap((a) => a.entities.slice(0, 1).map((e) => ({ label: e.label, href: e.href, status: e.status }))),
      actions: [{ label: t.attention.seeAlerts, href: '/alerts', primary: true }, { label: t.attention.seeToday, href: '/today' }],
    };
  }

  // ── Departure blockers
  if (has('bloqu', 'block', 'depart', 'departure', 'pickup', 'مغادر', 'يعيق')) {
    const blocked = ctx.focus?.pickups.filter((p) => p.blockers.length > 0) ?? [];
    return {
      intent: 'blockers', empty: blocked.length === 0,
      answer: blocked.length === 0 ? t.attention.allClearDesc : `${blocked.length} ${blocked.length === 1 ? t.briefLede.blockedDep : t.briefLede.blockedDepPl}.`,
      evidence: blocked.map((p) => ({ text: `${time.format(new Date(p.pickupAt))} · ${p.customerName ?? p.categoryName}${p.plate ? ` · ${p.plate}` : ''} — ${p.blockers.map((b) => (t.attention.blockers as Record<string, string>)[b] ?? b).join(', ')}`, href: p.contractId ? `/contracts/${p.contractId}` : `/reservations/${p.reservationId}` })),
      related: blocked.map((p) => ({ label: p.plate ?? p.categoryName, href: `/reservations/${p.reservationId}`, status: ctx.vehicles?.find((v) => v.plate === p.plate)?.operationalStatus })),
      actions: [{ label: t.attention.seeToday, href: '/today', primary: true }, { label: t.ops.calendar, href: '/calendar' }],
    };
  }

  // ── Returns to inspect
  if (has('retour', 'return', 'inspect', 'إرجاع', 'فحص')) {
    const rets = ctx.focus?.returns.filter((r) => !r.returnInspectionDone) ?? [];
    return {
      intent: 'returns', empty: rets.length === 0,
      answer: rets.length === 0 ? t.ops.noRet : `${rets.length} ${t.ops.returns.toLowerCase()} · ${t.ops.toInspect.toLowerCase()}.`,
      evidence: rets.map((r) => ({ text: `${time.format(new Date(r.returnAt))} · ${r.customerName ?? r.categoryName}${r.plate ? ` · ${r.plate}` : ''}`, href: r.contractId ? `/contracts/${r.contractId}` : `/reservations/${r.reservationId}` })),
      related: rets.filter((r) => r.plate).map((r) => ({ label: r.plate!, href: `/reservations/${r.reservationId}`, status: ctx.vehicles?.find((v) => v.plate === r.plate)?.operationalStatus })),
      actions: [...rets.filter((r) => r.contractId).slice(0, 1).map((r) => ({ label: `${t.attention.inspect} · ${r.plate ?? ''}`, href: `/field?reservationId=${r.reservationId}&kind=RETURN`, primary: true })), { label: t.attention.seeToday, href: '/today' }],
    };
  }

  // ── Preparation / post-return
  if (has('prepar', 'nettoy', 'clean', 'maintenance', 'qa', 'qualit', 'تحضير', 'تنظيف', 'صيانة')) {
    const lanes = ctx.lanes;
    const active = lanes ? STAGES.filter((s) => s !== 'AVAILABLE').flatMap((s) => lanes[s].map((v) => ({ s, v }))) : [];
    return {
      intent: 'prep', empty: active.length === 0,
      answer: active.length === 0 ? `${t.pipeline.empty}.` : `${active.length} ${active.length === 1 ? t.briefLede.prep : t.briefLede.prepPl}.`,
      evidence: active.map(({ s, v }) => ({ text: `${v.plate} · ${t.pipeline.stages[s].name}${v.tasks.length ? ` · ${v.tasks.map((x) => x.status.toLowerCase()).join(', ')}` : ''}`, href: '/ops' })),
      related: active.map(({ s, v }) => ({ label: v.plate, href: `/fleet/${v.vehicleId}`, status: v.status ?? s })),
      actions: [{ label: t.pipeline.openOps, href: '/ops', primary: true }],
    };
  }

  // ── Fleet overview
  if (has('flotte', 'fleet', 'vehicule', 'vehicle', 'dispon', 'available', 'أسطول', 'متاح')) {
    const vs = ctx.vehicles ?? [];
    const counts = new Map<string, number>();
    for (const v of vs) counts.set(v.operationalStatus, (counts.get(v.operationalStatus) ?? 0) + 1);
    const h = ctx.center?.happening;
    return {
      intent: 'fleet', empty: vs.length === 0,
      answer: h ? `${h.available} ${t.kpi.available.toLowerCase()} · ${h.activeRentals} ${t.kpi.active.toLowerCase()} · ${h.utilizationPct}% ${t.kpi.utilization.toLowerCase()} (${h.fleetSize} ${t.kpi.vehicles}).` : `${vs.length} ${t.kpi.vehicles}.`,
      evidence: [...counts.entries()].map(([s, n]) => ({ text: `${label(s)}: ${n}`, href: '/fleet' })),
      related: vs.filter((v) => v.operationalStatus !== 'AVAILABLE').slice(0, 8).map((v) => ({ label: v.plate, href: `/fleet/${v.id}`, status: v.operationalStatus })),
      actions: [{ label: t.fleet.open, href: '/fleet', primary: true }],
    };
  }

  // ── Navigation
  const nav = NAV.find((n) => n.keys.some((k) => q.includes(norm(k))));
  if (nav) return { intent: 'nav', answer: `${t.cmd.goTo} ${nav.label[lang]}`, evidence: [], related: [], actions: [{ label: nav.label[lang], href: nav.href, primary: true }] };

  return { intent: 'none', answer: t.cmd.noMatch, evidence: [{ text: t.cmd.noMatchHint }], related: [], actions: [], empty: true };
}

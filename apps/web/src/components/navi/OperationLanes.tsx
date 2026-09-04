'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, CalendarClock, ClipboardCheck, LogIn, LogOut } from 'lucide-react';
import type { Locale } from '@/lib/client-preferences';
import type { Focus, Vehicle } from '@/lib/navi/types';
import type { NaviCopy } from '@/lib/navi/i18n';
import { intlLocale, useReducedMotion } from '@/lib/navi/hooks';
import { Chip, Panel, PanelState, SkeletonCards } from './primitives';

export function OperationLanes({ focus, vehicles, loading, error, onRetry, t, lang, now }: {
  focus?: Focus; vehicles?: Vehicle[]; loading: boolean; error?: string; onRetry: () => void; t: NaviCopy; lang: Locale; now: Date;
}) {
  const reduced = useReducedMotion();
  const time = new Intl.DateTimeFormat(intlLocale(lang), { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' });
  const vByPlate = new Map((vehicles ?? []).map((v) => [v.plate, v]));
  const nowMs = now.getTime();

  const Row = ({ at, who, meta, chips, action, kind, i }: { at: string; who: string; meta: string; chips: React.ReactNode; action: React.ReactNode; kind: 'dep' | 'ret'; i: number }) => (
    <motion.article className={`nv-op ${new Date(at).getTime() < nowMs ? 'past' : ''}`} initial={reduced ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: reduced ? 0 : i * 0.04, ease: [0.16, 1, 0.3, 1] }}>
      <div className="t nv-num">{time.format(new Date(at))}<small>{kind === 'dep' ? t.ops.departures : t.ops.returns}</small></div>
      <div>
        <div className="who">{who}</div>
        <div className="what">{meta}{chips}</div>
      </div>
      {action}
    </motion.article>
  );

  const items: { at: string; node: React.ReactNode }[] = [];
  if (focus) {
    focus.pickups.forEach((p, i) => {
      const v = p.plate ? vByPlate.get(p.plate) : undefined;
      items.push({ at: p.pickupAt, node: (
        <Row key={`d-${p.reservationId}`} i={i} kind="dep" at={p.pickupAt} who={p.customerName ?? p.categoryName}
          meta={`${p.categoryName} · `}
          chips={<>
            {v ? <Chip status={v.operationalStatus} mono dot>{v.plate}</Chip> : <Chip quiet>{p.plate ?? t.ops.toAssign}</Chip>}
            {p.blockers.length === 0 ? <Chip severity="OK">{t.ops.ready}</Chip> : p.blockers.map((b) => <Chip key={b} severity="HIGH">{(t.attention.blockers as Record<string, string>)[b] ?? b}</Chip>)}
          </>}
          action={<Link className="nv-btn sm" href={p.contractId ? `/contracts/${p.contractId}` : `/reservations/${p.reservationId}`}>{t.ops.open} <ArrowUpRight size={12} aria-hidden="true" /></Link>} />
      ) });
    });
    focus.returns.forEach((r, i) => {
      const v = r.plate ? vByPlate.get(r.plate) : undefined;
      items.push({ at: r.returnAt, node: (
        <Row key={`r-${r.reservationId}`} i={i} kind="ret" at={r.returnAt} who={r.customerName ?? r.plate ?? r.categoryName}
          meta={`${r.categoryName} · `}
          chips={<>
            {v ? <Chip status={v.operationalStatus} mono dot>{v.plate}</Chip> : r.plate ? <Chip quiet mono>{r.plate}</Chip> : null}
            {r.returnInspectionDone ? <Chip severity="OK"><ClipboardCheck size={11} aria-hidden="true" /> {t.ops.inspected}</Chip> : <Chip severity="ATTENTION">{t.ops.toInspect}</Chip>}
          </>}
          action={r.returnInspectionDone || !r.contractId
            ? <Link className="nv-btn sm" href={r.contractId ? `/contracts/${r.contractId}` : `/reservations/${r.reservationId}`}>{t.ops.open} <ArrowUpRight size={12} aria-hidden="true" /></Link>
            : <Link className="nv-btn sm primary" href={`/field?reservationId=${r.reservationId}&kind=RETURN`}>{t.attention.inspect} <ArrowUpRight size={12} aria-hidden="true" /></Link>} />
      ) });
    });
  }
  items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const nowIdx = items.findIndex((x) => new Date(x.at).getTime() >= nowMs);

  return (
    <Panel id="navi-ops" title={t.ops.title} hint={t.ops.hint} icon={<CalendarClock size={15} />} flush
      aside={<Link href="/today" className="nv-link">{t.attention.seeToday} <ArrowUpRight size={13} aria-hidden="true" /></Link>}>
      {loading && !focus && <div style={{ padding: '0 var(--pad) var(--pad)' }}><SkeletonCards n={3} h={56} /></div>}
      {error && !focus && !loading && <PanelState kind="error" title={t.state.error} desc={error} action={{ label: t.state.retry, onClick: onRetry }} />}
      {focus && items.length === 0 && <PanelState kind="empty" title={t.ops.noDep} desc={t.ops.noRet} />}
      {focus && items.length > 0 && (
        <div className="nv-lanes">
          <div className="nv-lane" role="list">
            {items.map((x, i) => (
              <div key={i} role="listitem" style={{ display: 'contents' }}>
                {i === nowIdx && <div className="nv-now" aria-label={t.ops.now}><span>{t.ops.now} · {time.format(now)}</span></div>}
                {x.node}
              </div>
            ))}
            {nowIdx === -1 && <div className="nv-now" aria-label={t.ops.now}><span>{t.ops.now} · {time.format(now)}</span></div>}
          </div>
          <div className="nv-btnrow" style={{ justifyContent: 'flex-end' }}>
            <Link className="nv-link" href="/calendar">{t.ops.calendar} <ArrowUpRight size={12} aria-hidden="true" /></Link>
            <span className="nv-panel-hint" style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><LogOut size={12} aria-hidden="true" /> {focus.pickups.length} · <LogIn size={12} aria-hidden="true" /> {focus.returns.length}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

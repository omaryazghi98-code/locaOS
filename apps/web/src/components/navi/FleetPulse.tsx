'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Car } from 'lucide-react';
import { VEHICLE_STATUS_LABELS } from '@locaos/domain/labels';
import type { VehicleStatus } from '@locaos/domain';
import type { Locale } from '@/lib/client-preferences';
import type { Vehicle } from '@/lib/navi/types';
import { countByStatus } from '@/lib/navi/derive';
import type { NaviCopy } from '@/lib/navi/i18n';
import { useReducedMotion } from '@/lib/navi/hooks';
import { AnimatedNumber, Panel, PanelState, Skeleton } from './primitives';

export function FleetPulse({ vehicles, loading, error, onRetry, t, lang }: {
  vehicles?: Vehicle[]; loading: boolean; error?: string; onRetry: () => void; t: NaviCopy; lang: Locale;
}) {
  const [filter, setFilter] = useState<VehicleStatus | null>(null);
  const reduced = useReducedMotion();
  const list = vehicles ?? [];
  const counts = useMemo(() => countByStatus(list), [list]);
  const total = list.length;
  const shown = filter ? list.filter((v) => v.operationalStatus === filter) : list;
  const label = (s: VehicleStatus) => VEHICLE_STATUS_LABELS[s]?.[lang] ?? s;

  return (
    <Panel id="navi-fleet" title={t.fleet.title} hint={t.fleet.hint} icon={<Car size={15} />}
      aside={<Link href="/fleet" className="nv-link">{t.fleet.open} <ArrowUpRight size={13} aria-hidden="true" /></Link>}>
      {loading && !vehicles && (<div style={{ display: 'grid', gap: 10 }} role="status" aria-busy="true"><Skeleton h={12} r={999} /><Skeleton h={60} r={10} /></div>)}
      {error && !vehicles && !loading && <PanelState kind="error" title={t.state.error} desc={error} action={{ label: t.state.retry, onClick: onRetry }} />}
      {vehicles && total === 0 && <PanelState kind="empty" title={t.fleet.title} />}

      {vehicles && total > 0 && (
        <>
          <div className="nv-bar" role="img" aria-label={`${t.a11y.statusBar}: ${counts.map((c) => `${label(c.status)} ${c.n}`).join(', ')}`}>
            {counts.map((c, i) => (
              <motion.span key={c.status} data-status={c.status} title={`${label(c.status)} · ${c.n}`}
                initial={reduced ? false : { flexGrow: 0 }} animate={{ flexGrow: c.n, opacity: filter && filter !== c.status ? 0.35 : 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : i * 0.04 }} style={{ flexBasis: 0 }} />
            ))}
          </div>
          <div className="nv-legend" role="group" aria-label={t.fleet.title}>
            {counts.map((c) => (
              <button key={c.status} type="button" data-status={c.status} aria-pressed={filter === c.status} onClick={() => setFilter(filter === c.status ? null : c.status)}>
                <span className="sw" aria-hidden="true" /> {label(c.status)} <span className="n nv-num">{c.n}</span>
              </button>
            ))}
          </div>
          <div className="nv-vehicles" aria-live="polite">
            {shown.slice(0, 24).map((v) => (
              <Link key={v.id} href={`/fleet/${v.id}`} className="nv-vehicle" data-status={v.operationalStatus} title={`${v.plate} · ${label(v.operationalStatus)}`}>
                <i className="dot" aria-hidden="true" />{v.plate}
                {v.model && <small>{v.model.make} {v.model.model}</small>}
              </Link>
            ))}
          </div>
          <div className="nv-panel-hint" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span><AnimatedNumber value={shown.length} /> {t.fleet.showing} · {t.fleet.ofTotal} <span className="nv-num">{total}</span> {t.kpi.vehicles}</span>
            {filter && <button type="button" className="nv-btn sm ghost" onClick={() => setFilter(null)}>{t.fleet.clear}</button>}
          </div>
        </>
      )}
    </Panel>
  );
}

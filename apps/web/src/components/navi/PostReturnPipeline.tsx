'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, ChevronRight, Info, Play, Workflow } from 'lucide-react';
import type { OpsTask } from '@/lib/navi/types';
import { STAGES, type Stage, type StageVehicle } from '@/lib/navi/derive';
import type { NaviCopy } from '@/lib/navi/i18n';
import { useReducedMotion } from '@/lib/navi/hooks';
import { Chip, Panel, PanelState, SkeletonCards } from './primitives';
import { NaviAction } from './NaviAction';

/** Stage → status color token (PREPARATION_REVIEW and QA are task lanes, colored via --st-qa). */
const STAGE_STATUS: Record<Stage, string> = { INSPECTED: 'INSPECTED', PREPARATION_REVIEW: 'PREPARATION_REVIEW', CLEANING: 'CLEANING', MAINTENANCE: 'MAINTENANCE', QA: 'QA', AVAILABLE: 'AVAILABLE' };

function TaskActions({ task, onChanged, t }: { task: OpsTask; onChanged: () => void; t: NaviCopy }) {
  if (task.task_kind === 'PREPARATION_REVIEW' && ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(task.status)) {
    const p = `/api/ops/tasks/${task.id}/triage-return`;
    return (
      <div className="nv-btnrow" style={{ marginTop: 4 }}>
        <NaviAction path={p} body={{ cleaningNeeded: false, maintenanceNeeded: false }} label={t.pipeline.triage.none} variant="primary" confirm={t.pipeline.triage.confirmNone} onDone={onChanged} />
        <NaviAction path={p} body={{ cleaningNeeded: true, maintenanceNeeded: false }} label={t.pipeline.triage.cleaning} onDone={onChanged} />
        <NaviAction path={p} body={{ cleaningNeeded: false, maintenanceNeeded: true }} label={t.pipeline.triage.maintenance} variant="danger" onDone={onChanged} />
        <NaviAction path={p} body={{ cleaningNeeded: true, maintenanceNeeded: true }} label={t.pipeline.triage.both} variant="danger" onDone={onChanged} />
      </div>
    );
  }
  if (task.status === 'OPEN' || task.status === 'ASSIGNED') {
    return <div className="nv-btnrow" style={{ marginTop: 4 }}><NaviAction path={`/api/ops/tasks/${task.id}/update`} body={{ status: 'IN_PROGRESS' }} label={t.pipeline.start} icon={<Play size={12} aria-hidden="true" />} onDone={onChanged} /></div>;
  }
  if (task.status === 'IN_PROGRESS') {
    return <div className="nv-btnrow" style={{ marginTop: 4 }}><NaviAction path={`/api/ops/tasks/${task.id}/update`} body={{ status: 'COMPLETED' }} label={t.pipeline.complete} variant="primary" prompt={{ label: t.pipeline.completeNote, field: 'completionNote', required: true }} onDone={onChanged} /></div>;
  }
  return null;
}

export function PostReturnPipeline({ lanes, loading, error, onRetry, onChanged, t }: {
  lanes?: Record<Stage, StageVehicle[]>; loading: boolean; error?: string; onRetry: () => void; onChanged: () => void; t: NaviCopy;
}) {
  const reduced = useReducedMotion();
  const totalActive = lanes ? STAGES.filter((s) => s !== 'AVAILABLE').reduce((n, s) => n + lanes[s].length, 0) : 0;

  return (
    <Panel id="navi-pipeline" title={t.pipeline.title} hint={t.pipeline.hint} icon={<Workflow size={15} />} flush
      aside={<Link href="/ops" className="nv-link">{t.pipeline.openOps} <ArrowUpRight size={13} aria-hidden="true" /></Link>}>
      {loading && !lanes && <div style={{ padding: '0 var(--pad) var(--pad)' }}><SkeletonCards n={1} h={120} /></div>}
      {error && !lanes && !loading && <PanelState kind="error" title={t.state.error} desc={error} action={{ label: t.state.retry, onClick: onRetry }} />}
      {lanes && (
        <>
          <ol className="nv-pipe" aria-label={t.pipeline.title} style={{ margin: 0, listStyle: 'none' }}>
            {STAGES.map((stage, i) => {
              const items = lanes[stage];
              const active = items.length > 0 && stage !== 'AVAILABLE';
              return (
                <motion.li key={stage} className={`nv-stage ${active ? 'active' : ''}`} data-status={STAGE_STATUS[stage]}
                  initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : i * 0.05 }}>
                  <div className="name"><span>{t.pipeline.stages[stage].name}</span><span className="n nv-num" aria-label={`${items.length}`}>{items.length}</span></div>
                  <div className="desc">{t.pipeline.stages[stage].desc}</div>
                  <div className="items">
                    {items.length === 0 && <span className="empty">{t.pipeline.empty}</span>}
                    {items.map((v) => (
                      <div key={v.vehicleId} style={{ display: 'grid', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Link href={`/fleet/${v.vehicleId}`} className="nv-chip mono" data-status={v.status ?? STAGE_STATUS[stage]} style={{ color: 'var(--st)', borderColor: 'color-mix(in srgb, var(--st) 35%, transparent)', textDecoration: 'none' }}>
                            <i className="dot" style={{ background: 'var(--st)' }} aria-hidden="true" />{v.plate}
                          </Link>
                          {v.tasks.filter((x) => x.status !== 'COMPLETED').map((x) => <Chip key={x.id} quiet title={x.title}>{x.status.replaceAll('_', ' ').toLowerCase()}{x.priority === 'URGENT' || x.priority === 'HIGH' ? ` · ${x.priority}` : ''}</Chip>)}
                        </div>
                        {v.tasks.filter((x) => x.status !== 'COMPLETED').map((x) => <TaskActions key={x.id} task={x} onChanged={onChanged} t={t} />)}
                      </div>
                    ))}
                  </div>
                  <ChevronRight className="arrow" size={16} aria-hidden="true" />
                </motion.li>
              );
            })}
          </ol>
          <div className="nv-pipe-note"><Info size={13} aria-hidden="true" /><span>{t.pipeline.sequential}{totalActive === 0 ? '' : ''}</span></div>
        </>
      )}
    </Panel>
  );
}

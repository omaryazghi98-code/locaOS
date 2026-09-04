'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';
import type { ActivityEvent } from '@/lib/navi/derive';
import type { NaviCopy } from '@/lib/navi/i18n';
import { useReducedMotion } from '@/lib/navi/hooks';
import { Chip, Panel, PanelState, SkeletonCards, useRelativeTime } from './primitives';

export function ActivityTimeline({ events, loading, error, onRetry, t, now }: {
  events?: ActivityEvent[]; loading: boolean; error?: string; onRetry: () => void; t: NaviCopy; now: Date;
}) {
  const reduced = useReducedMotion();
  const rel = useRelativeTime(now);
  return (
    <Panel id="navi-activity" title={t.timeline.title} hint={t.timeline.hint} icon={<Activity size={15} />} flush>
      {loading && !events && <div style={{ padding: '0 var(--pad) var(--pad)' }}><SkeletonCards n={4} h={40} /></div>}
      {error && !events && !loading && <PanelState kind="error" title={t.state.error} desc={error} action={{ label: t.state.retry, onClick: onRetry }} />}
      {events && events.length === 0 && <PanelState kind="empty" title={t.timeline.empty} desc={t.timeline.emptyDesc} />}
      {events && events.length > 0 && (
        <ol className="nv-timeline">
          {events.map((e, i) => (
            <motion.li key={e.id} className="nv-tl" data-severity={e.severity} data-status={e.status}
              initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: reduced ? 0 : Math.min(i, 8) * 0.03 }}>
              <span className="dot" aria-hidden="true" />
              <div className="body">
                <div className="head">
                  <time className="when" dateTime={e.at} title={new Date(e.at).toLocaleString()}>{rel(e.at, t.timeline)}</time>
                  {e.kind === 'alert' ? <Chip severity={e.severity}>{t.timeline.alert}</Chip> : <Chip status={e.status}>{t.timeline.task}</Chip>}
                </div>
                <div className="what">{e.href ? <Link href={e.href} style={{ color: 'inherit', textDecoration: 'none' }}>{e.what}</Link> : e.what}</div>
                {e.detail && <div className="detail">{e.detail}</div>}
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

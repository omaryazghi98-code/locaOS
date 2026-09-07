'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Bell, Check, ClipboardCheck } from 'lucide-react';
import type { AttentionItem, Priority } from '@/lib/navi/derive';
import type { NaviCopy } from '@/lib/navi/i18n';
import { useReducedMotion } from '@/lib/navi/hooks';
import { Chip, Panel, PanelState, SkeletonCards } from './primitives';
import { NaviAction } from './NaviAction';

const GROUPS: { p: Priority; key: 'immediate' | 'today' | 'week' }[] = [{ p: 1, key: 'immediate' }, { p: 2, key: 'today' }, { p: 3, key: 'week' }];

export function AttentionStack({ items, loading, error, onRetry, onChanged, t }: {
  items: AttentionItem[]; loading: boolean; error?: string; onRetry: () => void; onChanged: () => void; t: NaviCopy;
}) {
  const reduced = useReducedMotion();
  const hasAny = items.length > 0;

  return (
    <Panel id="navi-attention" title={t.attention.title} hint={t.attention.hint} icon={<Bell size={15} />} flush
      aside={<Link href="/alerts" className="nv-link">{t.attention.seeAlerts} <ArrowUpRight size={13} aria-hidden="true" /></Link>}>
      {loading && !hasAny && <div style={{ padding: '0 var(--pad) var(--pad)' }}><SkeletonCards n={3} /></div>}
      {error && !hasAny && !loading && <PanelState kind="error" title={t.state.error} desc={error} action={{ label: t.state.retry, onClick: onRetry }} />}
      {!loading && !error && !hasAny && <PanelState kind="ok" title={t.attention.allClear} desc={t.attention.allClearDesc} />}

      {hasAny && GROUPS.map(({ p, key }) => {
        const group = items.filter((i) => i.priority === p);
        if (group.length === 0) return null;
        return (
          <div key={key} className="nv-group" role="group" aria-label={`${t.a11y.priorityGroup}: ${t.attention[key]}`}>
            <div className="nv-group-head">
              <span className="nv-eyebrow" data-severity={p === 1 ? 'CRITICAL' : p === 2 ? 'HIGH' : 'ATTENTION'} style={{ color: 'var(--sev)' }}>{t.attention[key]}</span>
              <span className="cnt nv-num">{group.length}</span>
            </div>
            <AnimatePresence initial={!reduced} mode="popLayout">
              {group.map((item, i) => (
                <motion.article
                  key={item.id} layout={!reduced} className="nv-card" data-severity={item.severity} aria-labelledby={`${item.id}-t`}
                  initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : Math.min(i, 5) * 0.04 }}
                >
                  <span className="rail" aria-hidden="true" />
                  <div className="main">
                    <div className="line">
                      <Chip severity={item.severity}>{t.attention.kinds[item.kind]}</Chip>
                      {item.alert && item.alert.status === 'ACKNOWLEDGED' && <Chip quiet><Check size={11} aria-hidden="true" /> {t.attention.ack}</Chip>}
                      <span className="title" id={`${item.id}-t`}><Link href={item.primary.href}>{item.title}</Link></span>
                    </div>
                    <div className="why">{item.why}</div>
                    {item.entities.length > 0 && (
                      <div className="meta">
                        {item.entities.map((e) => (
                          <Link key={e.href + e.label} href={e.href} className="nv-chip quiet mono" data-status={e.status} style={e.status ? { color: 'var(--st)', borderColor: 'color-mix(in srgb, var(--st) 35%, transparent)' } : undefined}>
                            {e.status && <i className="dot" style={{ background: 'var(--st)' }} aria-hidden="true" />}{e.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="actions">
                      <Link href={item.primary.href} className="nv-btn sm primary">{item.primary.label} <ArrowUpRight size={13} aria-hidden="true" /></Link>
                      {item.alert && item.alert.status === 'OPEN' && (
                        <NaviAction path={`/api/alerts/${item.alert.id}/ack`} label={t.attention.ack} icon={<Check size={13} aria-hidden="true" />} onDone={onChanged} />
                      )}
                      {item.alert && (
                        <NaviAction path={`/api/alerts/${item.alert.id}/resolve`} label={t.attention.resolve} icon={<ClipboardCheck size={13} aria-hidden="true" />}
                          prompt={{ label: t.attention.resolveNote, field: 'note', required: true }} onDone={onChanged} />
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        );
      })}
    </Panel>
  );
}

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, useInView } from 'motion/react';
import { AlertTriangle, CheckCircle2, Inbox, RefreshCw } from 'lucide-react';
import { useReducedMotion } from '@/lib/navi/hooks';

/* ── AnimatedNumber ─────────────────────────────────────────────────────── */
export function AnimatedNumber({ value, format, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduced = useReducedMotion();
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString());
  const prev = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced || !inView) { el.textContent = fmt(value); prev.current = value; return; }
    const controls = animate(prev.current, value, {
      duration: 0.7, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = fmt(v); },
      onComplete: () => { el.textContent = fmt(value); prev.current = value; },
    });
    return () => controls.stop();
  }, [value, inView, reduced, fmt]);

  return <span ref={ref} className={`nv-num ${className ?? ''}`} aria-label={fmt(value)}>{fmt(value)}</span>;
}

/* ── Chip ───────────────────────────────────────────────────────────────── */
export function Chip({ children, status, severity, quiet, mono, dot, title, className }: {
  children: ReactNode; status?: string; severity?: string; quiet?: boolean; mono?: boolean; dot?: boolean; title?: string; className?: string;
}) {
  const cls = ['nv-chip', status ? 'st' : '', severity ? 'sev' : '', quiet ? 'quiet' : '', mono ? 'mono' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls} data-status={status} data-severity={severity} title={title}>
      {dot && <i className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="nv-kbd">{children}</kbd>;
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */
export function Skeleton({ h = 14, w = '100%', r, style }: { h?: number; w?: number | string; r?: number; style?: React.CSSProperties }) {
  return <div className="nv-skel" aria-hidden="true" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}
export function SkeletonCards({ n = 3, h = 74 }: { n?: number; h?: number }) {
  return (
    <div style={{ display: 'grid', gap: 8 }} role="status" aria-live="polite" aria-busy="true">
      {Array.from({ length: n }).map((_, i) => <Skeleton key={i} h={h} r={12} />)}
    </div>
  );
}

/* ── Panel state (empty / error / ok) ───────────────────────────────────── */
export function PanelState({ kind, title, desc, action }: { kind: 'empty' | 'error' | 'ok'; title: string; desc?: string; action?: { label: string; onClick: () => void; busy?: boolean } }) {
  const Icon = kind === 'error' ? AlertTriangle : kind === 'ok' ? CheckCircle2 : Inbox;
  return (
    <div className={`nv-state ${kind === 'error' ? 'err' : kind === 'ok' ? 'ok' : ''}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div className="ico" aria-hidden="true"><Icon size={18} /></div>
      <div className="title">{title}</div>
      {desc && <div className="desc">{desc}</div>}
      {action && (
        <button type="button" className="nv-btn sm" onClick={action.onClick} disabled={action.busy}>
          <RefreshCw size={13} className={action.busy ? 'nv-spin' : undefined} aria-hidden="true" /> {action.label}
        </button>
      )}
    </div>
  );
}

/* ── Panel shell ────────────────────────────────────────────────────────── */
export function Panel({ title, hint, icon, aside, children, flush, elev, id, className }: {
  title: string; hint?: string; icon?: ReactNode; aside?: ReactNode; children: ReactNode; flush?: boolean; elev?: 2; id?: string; className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className={`nv-panel ${elev === 2 ? 'elev-2' : ''} ${className ?? ''}`} aria-labelledby={headingId} id={id}>
      <header className="nv-panel-head">
        <div>
          <h2 className="nv-panel-title" id={headingId} style={{ textTransform: 'none', letterSpacing: '.01em' }}>{icon}{title}</h2>
          {hint && <div className="nv-panel-hint">{hint}</div>}
        </div>
        {aside}
      </header>
      <div className={`nv-panel-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  );
}

/* ── Relative time ──────────────────────────────────────────────────────── */
export function useRelativeTime(now: Date) {
  return (iso: string, t: { justNow: string; min: string; h: string; d: string; ago: string }) => {
    const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
    const m = Math.round(diff / 60_000);
    if (m < 1) return t.justNow;
    if (m < 60) return `${t.ago} ${m} ${t.min}`;
    const h = Math.round(m / 60);
    if (h < 48) return `${t.ago} ${h} ${t.h}`;
    return `${t.ago} ${Math.round(h / 24)} ${t.d}`;
  };
}

/* ── Copy-safe mount flag (avoid hydration mismatch for time-based UI) ─── */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

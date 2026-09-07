'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useNaviData } from '@/lib/navi/useNaviData';
import { briefCounts, deriveActivity, deriveAttention, derivePipeline } from '@/lib/navi/derive';
import { naviCopy, plural } from '@/lib/navi/i18n';
import { intlLocale, useLocale, useNow, useReducedMotion } from '@/lib/navi/hooks';
import { NaviSurface } from './NaviSurface';
import { NaviCommandInput } from './NaviCommandInput';
import { AttentionStack } from './AttentionStack';
import { FleetPulse } from './FleetPulse';
import { PostReturnPipeline } from './PostReturnPipeline';
import { OperationLanes } from './OperationLanes';
import { ActivityTimeline } from './ActivityTimeline';
import { AnimatedNumber, useMounted } from './primitives';

const mad = (v?: string, lang = 'fr') => new Intl.NumberFormat(intlLocale(lang as 'fr'), { maximumFractionDigits: 0 }).format(Number(v ?? 0) / 100) + ' MAD';

export function NaviCommandCenter({ userName, agency }: { userName: string; agency: string }) {
  const lang = useLocale();
  const t = naviCopy(lang);
  const now = useNow(30_000);
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const { data, reload, reloadAll, refreshing, meta } = useNaviData();

  const center = data.center.data; const focus = data.focus.data; const tasks = data.tasks.data; const alerts = data.alerts.data; const vehicles = data.vehicles.data;

  const attention = useMemo(() => deriveAttention({ center, focus, alerts, vehicles }, t, lang), [center, focus, alerts, vehicles, t, lang]);
  const lanes = useMemo(() => (vehicles && tasks ? derivePipeline(vehicles, tasks) : undefined), [vehicles, tasks]);
  const activity = useMemo(() => (alerts || tasks ? deriveActivity(alerts, tasks, t) : undefined), [alerts, tasks, t]);
  const counts = briefCounts(center, focus, attention, lanes);
  const tension = Math.min(1, (center?.wrong.overdue.length ?? 0) * 0.35 + (center?.wrong.openCritical ?? 0) * 0.3);

  const hour = Number(new Intl.DateTimeFormat('en', { timeZone: 'Africa/Casablanca', hour: 'numeric', hour12: false }).format(now));
  const greeting = hour < 12 ? t.greetingMorning : hour < 18 ? t.greetingAfternoon : t.greetingEvening;
  const firstName = userName.split(' ')[0] ?? userName;
  const dateLabel = new Intl.DateTimeFormat(intlLocale(lang), { timeZone: 'Africa/Casablanca', weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const timeLabel = new Intl.DateTimeFormat(intlLocale(lang), { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' }).format(now);

  const liveCls = meta.allFailed ? 'err' : meta.errors > 0 ? 'stale' : '';
  const liveText = meta.allFailed ? t.offline : meta.errors > 0 ? t.stale : t.live;

  // Brief lede — only real numbers; each figure links to its evidence surface.
  const L = t.briefLede;
  const parts: React.ReactNode[] = [];
  if (counts.attention > 0) parts.push(<span key="a"><a href="#navi-attention"><strong className="nv-num">{counts.attention}</strong> {plural(counts.attention, L.attention, L.attentionPl)}</a></span>);
  if (counts.overdue > 0) parts.push(<span key="o"><a href="#navi-attention"><strong className="nv-num">{counts.overdue}</strong> {plural(counts.overdue, L.overdue, L.overduePl)}</a></span>);
  if (counts.blocked > 0) parts.push(<span key="b"><a href="#navi-ops"><strong className="nv-num">{counts.blocked}</strong> {plural(counts.blocked, L.blockedDep, L.blockedDepPl)}</a></span>);
  if (counts.prep > 0) parts.push(<span key="p"><a href="#navi-pipeline"><strong className="nv-num">{counts.prep}</strong> {plural(counts.prep, L.prep, L.prepPl)}</a></span>);

  const ctx = { center, focus, tasks, alerts, vehicles, attention, lanes, t, lang };
  const onChanged = async () => { await Promise.all([reload('alerts'), reload('tasks'), reload('vehicles'), reload('center'), reload('focus')]); };
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="navi" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <a href="#navi-attention" className="sr-only" style={{ position: 'absolute' }}>{t.a11y.skipTo}</a>

      <motion.section className="nv-hero" aria-label={t.eyebrow} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <NaviSurface tension={tension} />
        <div className="nv-hero-top">
          <div className="nv-identity">
            <span className="nv-mark" aria-hidden="true">N</span>
            <div>
              <div className="nv-eyebrow" style={{ color: 'var(--text-soft)' }}>{t.navi} · {t.eyebrow}</div>
              <div className="nv-panel-hint">{agency}{mounted ? ` · ${dateLabel} · ${timeLabel}` : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`nv-live ${liveCls}`} role="status" aria-live="polite"><i aria-hidden="true" />{liveText}</span>
            <button type="button" className="nv-btn sm ghost" onClick={() => void reloadAll()} disabled={refreshing} aria-label={t.refresh}><RefreshCw size={14} className={refreshing ? 'nv-spin' : undefined} aria-hidden="true" /></button>
          </div>
        </div>

        <div className="nv-hero-grid">
          <div className="nv-brief">
            <h1 className="nv-display">{greeting}, {firstName}.</h1>
            <p className="nv-lede">
              {center || focus ? (
                <>
                  <a href="#navi-ops"><strong className="nv-num">{counts.departures}</strong> {plural(counts.departures, L.departures, L.departuresPl)}</a> {L.and} <a href="#navi-ops"><strong className="nv-num">{counts.returns}</strong> {plural(counts.returns, L.returns, L.returnsPl)}</a> {L.today}.{' '}
                  {parts.length === 0 ? t.briefAllClear : parts.map((p, i) => <span key={i}>{i > 0 ? (i === parts.length - 1 ? ` ${L.and} ` : L.comma) : ''}{p}</span>)}{parts.length > 0 ? '.' : ''}
                </>
              ) : data.center.status === 'error' && data.focus.status === 'error' ? t.state.error : t.state.loading}
            </p>
            <NaviCommandInput ctx={ctx} disabled={meta.allFailed} />
          </div>

          <div className="nv-kpis" aria-label={t.kpi.active}>
            <div className="nv-kpi"><span className="k">{t.kpi.active}</span><span className="v"><AnimatedNumber value={center?.happening.activeRentals ?? 0} /></span><span className="m">{center ? `${center.happening.utilizationPct}% ${t.kpi.ofFleet} (${center.happening.fleetSize})` : '—'}</span></div>
            <div className="nv-kpi ok"><span className="k">{t.kpi.available}</span><span className="v"><AnimatedNumber value={center?.happening.available ?? 0} /></span><span className="m">{t.kpi.vehicles}</span></div>
            <div className="nv-kpi"><span className="k">{t.kpi.depRet}</span><span className="v"><AnimatedNumber value={center?.happening.departuresToday ?? 0} /> / <AnimatedNumber value={center?.happening.returnsToday ?? 0} /></span><span className="m">{L.today}</span></div>
            <div className={`nv-kpi ${Number(center?.happening.outstandingMad ?? 0) > 0 ? 'warn' : 'ok'}`}><span className="k">{t.kpi.outstanding}</span><span className="v" style={{ fontSize: 18 }}>{center ? mad(center.happening.outstandingMad, lang) : '—'}</span><span className="m">{t.kpi.revenue30}: {center ? mad(center.happening.revenue30Mad, lang) : '—'}</span></div>
          </div>
        </div>
      </motion.section>

      <div className="navi-grid">
        <div className="navi-col">
          <AttentionStack items={attention} loading={data.alerts.status === 'loading' || data.center.status === 'loading'} error={data.alerts.status === 'error' ? data.alerts.error : undefined} onRetry={() => { void reload('alerts'); void reload('center'); void reload('focus'); }} onChanged={onChanged} t={t} />
          <PostReturnPipeline lanes={lanes} loading={data.tasks.status === 'loading' || data.vehicles.status === 'loading'} error={data.tasks.status === 'error' ? data.tasks.error : data.vehicles.status === 'error' ? data.vehicles.error : undefined} onRetry={() => { void reload('tasks'); void reload('vehicles'); }} onChanged={onChanged} t={t} />
        </div>
        <div className="navi-col">
          <OperationLanes focus={focus} vehicles={vehicles} loading={data.focus.status === 'loading'} error={data.focus.status === 'error' ? data.focus.error : undefined} onRetry={() => void reload('focus')} t={t} lang={lang} now={now} />
          <FleetPulse vehicles={vehicles} loading={data.vehicles.status === 'loading'} error={data.vehicles.status === 'error' ? data.vehicles.error : undefined} onRetry={() => void reload('vehicles')} t={t} lang={lang} />
          <ActivityTimeline events={activity} loading={data.alerts.status === 'loading' && data.tasks.status === 'loading'} error={data.alerts.status === 'error' && data.tasks.status === 'error' ? data.alerts.error : undefined} onRetry={() => { void reload('alerts'); void reload('tasks'); }} t={t} now={now} />
        </div>
      </div>
    </div>
  );
}

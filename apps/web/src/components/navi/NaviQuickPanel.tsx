'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCw, X } from 'lucide-react';
import { useNaviData } from '@/lib/navi/useNaviData';
import { briefCounts, deriveAttention, derivePipeline } from '@/lib/navi/derive';
import { naviCopy } from '@/lib/navi/i18n';
import { useLocale } from '@/lib/navi/hooks';
import { NaviCommandInput } from './NaviCommandInput';
import { PanelState } from './primitives';

export function NaviQuickPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const lang = useLocale();
  const t = naviCopy(lang);
  const { data, reloadAll, refreshing, meta } = useNaviData();

  useEffect(() => {
    if (open) onClose();
  }, [path]);

  const center = data.center.data;
  const focus = data.focus.data;
  const tasks = data.tasks.data;
  const alerts = data.alerts.data;
  const vehicles = data.vehicles.data;
  const attention = useMemo(() => deriveAttention({ center, focus, alerts, vehicles }, t, lang), [center, focus, alerts, vehicles, t, lang]);
  const lanes = useMemo(() => (vehicles && tasks ? derivePipeline(vehicles, tasks) : undefined), [vehicles, tasks]);
  const counts = briefCounts(center, focus, attention, lanes);
  const ctx = { center, focus, tasks, alerts, vehicles, attention, lanes, t, lang };

  if (!open) return null;

  const subtitle = lang === 'ar'
    ? 'بحث وتشغيل سريع دون مغادرة الصفحة'
    : lang === 'en'
      ? 'Search and act without leaving the page'
      : 'Rechercher et agir sans quitter la page';
  const live = meta.allFailed ? (lang === 'ar' ? 'غير متصل' : lang === 'en' ? 'Offline' : 'Hors ligne') : meta.errors > 0 ? (lang === 'ar' ? 'بيانات قديمة' : lang === 'en' ? 'Stale data' : 'Données anciennes') : (lang === 'ar' ? 'مباشر' : lang === 'en' ? 'Live' : 'En direct');
  const closeLabel = lang === 'ar' ? 'إغلاق NAVI' : lang === 'en' ? 'Close NAVI' : 'Fermer NAVI';
  const refreshLabel = lang === 'ar' ? 'تحديث البيانات' : lang === 'en' ? 'Refresh data' : 'Actualiser les données';
  const summary = center
    ? (lang === 'ar' ? `${counts.attention} نقاط انتباه · ${center.happening.available} متاح` : lang === 'en' ? `${counts.attention} attention points · ${center.happening.available} available` : `${counts.attention} points d’attention · ${center.happening.available} disponibles`)
    : '';

  return (
    <>
      <button type="button" className="navi-quick-backdrop" aria-label={closeLabel} onClick={onClose} />
      <aside className="navi-quick-panel" aria-label="NAVI" role="dialog" aria-modal="true">
        <div className="navi-quick-head">
          <div>
            <div className="navi-quick-title"><span className="nv-mark" aria-hidden="true">N</span> NAVI</div>
            <div className="navi-quick-sub">{subtitle}</div>
          </div>
          <div className="navi-quick-tools">
            <span className="nv-live" role="status"><i aria-hidden="true" />{live}</span>
            <button type="button" className="nv-btn sm ghost" onClick={() => void reloadAll()} disabled={refreshing} aria-label={refreshLabel}>
              <RefreshCw size={14} className={refreshing ? 'nv-spin' : undefined} aria-hidden="true" />
            </button>
            <button type="button" className="nv-btn sm ghost" onClick={onClose} aria-label={closeLabel}><X size={15} aria-hidden="true" /></button>
          </div>
        </div>
        {meta.allFailed ? (
          <PanelState kind="error" title={lang === 'ar' ? 'بيانات NAVI غير متاحة' : lang === 'en' ? 'NAVI data unavailable' : 'Données NAVI indisponibles'} description={lang === 'ar' ? 'تعذر تحميل البيانات التشغيلية.' : lang === 'en' ? 'Operational data could not be loaded.' : 'Les données opérationnelles ne sont pas disponibles.'} action={{ label: refreshLabel, onClick: () => void reloadAll() }} />
        ) : (
          <>
            {summary && <div className="navi-quick-summary">{summary}</div>}
            <NaviCommandInput ctx={ctx} disabled={meta.allFailed} />
          </>
        )}
      </aside>
    </>
  );
}

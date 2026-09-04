'use client';
import { useEffect, useState } from 'react';
import { FLEET_STRINGS, type Locale } from '@locaos/domain/i18n';
import { clientApiFetch } from '@/lib/client-api';
import { DENSITY_EVENT, LANGUAGE_EVENT, readDensity, readLocale, type Density } from '@/lib/client-preferences';
import { DataTable, EmptyState, PageHeader, Section, StatusBadge } from '@/components';
import type { Column } from '@/components/DataTable';
interface V { id: string; plate: string; vin: string; operationalStatus: string; fleetStatus: string; currentMileageKm: number; fuelLevelPct: number; category: string; model: { make: string; model: string; year: number; fuelType: string }; }
export default function Fleet() {
  const [lang, setLang] = useState<Locale>('fr'); const [dense, setDense] = useState<Density>('comfortable'); const [vehicles, setVehicles] = useState<V[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const handleLanguage = (event: Event) => setLang((event as CustomEvent<Locale>).detail); const handleDensity = (event: Event) => setDense((event as CustomEvent<Density>).detail); setLang(readLocale()); setDense(readDensity()); window.addEventListener(LANGUAGE_EVENT, handleLanguage); window.addEventListener(DENSITY_EVENT, handleDensity); let cancelled = false; clientApiFetch<V[]>('/api/fleet/vehicles').then((data) => { if (!cancelled) setVehicles(data); }).catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger la flotte.'); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; window.removeEventListener(LANGUAGE_EVENT, handleLanguage); window.removeEventListener(DENSITY_EVENT, handleDensity); }; }, []);
  const strings = FLEET_STRINGS[lang]; const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-MA' : 'fr-MA'; const counts = vehicles.reduce<Record<string, number>>((acc, vehicle) => { acc[vehicle.operationalStatus] = (acc[vehicle.operationalStatus] ?? 0) + 1; return acc; }, {});
  const columns: Column<V>[] = [
    { key: 'plate', header: strings.plate, format: (_value, vehicle) => <a href={`/fleet/${vehicle.id}`} className="mono">{vehicle.plate}</a> },
    { key: 'model', header: strings.model, format: (_value, vehicle) => vehicle.model ? `${vehicle.model.make} ${vehicle.model.model} (${vehicle.model.year})` : '—', hideIfDetailed: true },
    { key: 'category', header: strings.category, format: (_value, vehicle) => vehicle.category, hideIfDetailed: true },
    { key: 'operationalStatus', header: strings.status, format: (value) => <StatusBadge status={String(value)} /> },
    { key: 'currentMileageKm', header: strings.mileage, format: (value) => Number(value).toLocaleString(locale) },
    { key: 'fuelLevelPct', header: strings.fuel, format: (value) => `${Number(value)}%` },
  ];
  const statusEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return <div className="navi">
    <PageHeader title={strings.title} subtitle={loading ? strings.loading : `${vehicles.length} ${strings.vehicles}${vehicles.length > 0 ? ` — ${statusEntries.map(([status, count]) => `${count} ${status}`).join(' · ')}` : ''}`} />
    {!loading && !error && vehicles.length > 0 && <section className="nv-panel elev-2" style={{ marginBottom: 16 }}><div className="nv-panel-head"><div><h2 className="nv-panel-title">{lang === 'ar' ? 'نبض الأسطول' : lang === 'en' ? 'Fleet pulse' : 'Pouls de flotte'}</h2><div className="nv-panel-hint">{lang === 'ar' ? 'توزيع الحالات التشغيلية الحالية.' : lang === 'en' ? 'Current operational status distribution.' : 'Répartition actuelle des statuts opérationnels.'}</div></div><a className="nv-link" href="/navi">NAVI ↗</a></div><div className="nv-panel-body"><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{statusEntries.map(([status, count]) => <span key={status} className="nv-chip" data-status={status}><i className="dot" style={{ background: 'var(--st)' }} aria-hidden="true" />{count} {status}</span>)}</div></div></section>}
    <Section>
      {loading && <div className="loading" role="status" aria-live="polite">{strings.loading}</div>}
      {error && <div className="alert alert-CRITICAL" role="alert">{error}</div>}
      {!loading && !error && vehicles.length === 0 && <EmptyState title={strings.emptyTitle} description={strings.emptyDescription} />}
      {!loading && !error && vehicles.length > 0 && <DataTable columns={columns} rows={vehicles} dense={dense} ariaLabel={strings.title} />}
    </Section>
  </div>;
}

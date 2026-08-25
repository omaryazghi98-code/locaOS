'use client';

import { useEffect, useState } from 'react';
import { FLEET_STRINGS, type Locale } from '@locaos/domain/i18n';
import { clientApiFetch } from '@/lib/client-api';
import { DataTable, EmptyState, PageHeader, Section, StatusBadge } from '@/components';
import type { Column } from '@/components/DataTable';

interface V {
  id: string;
  plate: string;
  vin: string;
  operationalStatus: string;
  fleetStatus: string;
  currentMileageKm: number;
  fuelLevelPct: number;
  category: string;
  model: { make: string; model: string; year: number; fuelType: string };
}

type Density = 'compact' | 'comfortable' | 'detailed';

function readLang(): Locale {
  const match = document.cookie.match(/(?:^|;\s*)locaos-lang=([^;]+)/);
  if (match?.[1] === 'ar' || match?.[1] === 'en') return match[1];
  return 'fr';
}

export default function Fleet() {
  const [lang, setLang] = useState<Locale>('fr');
  const [dense, setDense] = useState<Density>('comfortable');
  const [vehicles, setVehicles] = useState<V[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLang(readLang());
    const savedDensity = window.localStorage.getItem('locaos-density');
    if (savedDensity === 'compact' || savedDensity === 'comfortable' || savedDensity === 'detailed') setDense(savedDensity);

    let cancelled = false;
    clientApiFetch<V[]>('/api/fleet/vehicles')
      .then((data) => { if (!cancelled) setVehicles(data); })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger la flotte.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'locaos-density' && (event.newValue === 'compact' || event.newValue === 'comfortable' || event.newValue === 'detailed')) setDense(event.newValue);
    };
    window.addEventListener('storage', handleStorage);
    return () => { cancelled = true; window.removeEventListener('storage', handleStorage); };
  }, []);

  const strings = FLEET_STRINGS[lang];
  const counts = vehicles.reduce<Record<string, number>>((acc, vehicle) => {
    acc[vehicle.operationalStatus] = (acc[vehicle.operationalStatus] ?? 0) + 1;
    return acc;
  }, {});

  const columns: Column<V>[] = [
    { key: 'plate', header: strings.plate, format: (_value, vehicle) => <a href={`/fleet/${vehicle.id}`} className="mono">{vehicle.plate}</a> },
    { key: 'model', header: strings.model, format: (_value, vehicle) => vehicle.model ? `${vehicle.model.make} ${vehicle.model.model} (${vehicle.model.year})` : '—', hideIfDetailed: true },
    { key: 'category', header: strings.category, format: (_value, vehicle) => vehicle.category, hideIfDetailed: true },
    { key: 'operationalStatus', header: strings.status, format: (value) => <StatusBadge status={String(value)} /> },
    { key: 'currentMileageKm', header: strings.mileage, format: (value) => Number(value).toLocaleString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-MA' : 'fr-MA') },
    { key: 'fuelLevelPct', header: strings.fuel, format: (value) => `${Number(value)}%` },
  ];

  return (
    <>
      <PageHeader
        title={strings.title}
        subtitle={loading ? strings.loading : `${vehicles.length} ${strings.vehicles}${vehicles.length > 0 ? ` — ${Object.entries(counts).map(([status, count]) => `${count} ${status}`).join(' · ')}` : ''}`}
      />
      <Section>
        {loading && <div className="loading" role="status" aria-live="polite">{strings.loading}</div>}
        {error && <div className="alert alert-CRITICAL" role="alert">{error}</div>}
        {!loading && !error && vehicles.length === 0 && <EmptyState title={strings.emptyTitle} description={strings.emptyDescription} />}
        {!loading && !error && vehicles.length > 0 && <DataTable columns={columns} rows={vehicles} dense={dense} />}
      </Section>
    </>
  );
}

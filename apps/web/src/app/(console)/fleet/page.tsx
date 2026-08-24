'use client';

import { useEffect, useState } from 'react';
import { UI_STRINGS } from '@locaos/domain/i18n';
import { apiFetch } from '@/lib/api';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Section,
  StatusBadge,
} from '@/components';

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

type ColumnMode = 'compact' | 'comfortable' | 'detailed';

const DENSITIES: Array<{ mode: ColumnMode; label: string; ariaLabel: string }> = [
  { mode: 'compact', label: 'C', ariaLabel: 'Vue compacte' },
  { mode: 'comfortable', label: 'Co', ariaLabel: 'Vue confortable' },
  { mode: 'detailed', label: 'D', ariaLabel: 'Vue détaillée' },
];

function useDensity() {
  const [dense, setDense] = useState<ColumnMode>('comfortable');

  useEffect(() => {
    const saved = window.localStorage.getItem('locaos-density');
    if (saved === 'compact' || saved === 'comfortable' || saved === 'detailed') {
      setDense(saved);
    }
  }, []);

  const setDenseMode = (mode: ColumnMode) => {
    window.localStorage.setItem('locaos-density', mode);
    setDense(mode);
  };

  return { dense, setDenseMode };
}

export default function Fleet() {
  const { dense, setDenseMode } = useDensity();
  const [vehicles, setVehicles] = useState<V[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<V[]>('/api/fleet/vehicles')
      .then((data) => {
        if (!cancelled) setVehicles(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger la flotte.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = vehicles.reduce<Record<string, number>>((acc, vehicle) => {
    acc[vehicle.operationalStatus] = (acc[vehicle.operationalStatus] ?? 0) + 1;
    return acc;
  }, {});

  const columns = [
    {
      key: 'plate',
      header: UI_STRINGS.FLEET.plate.fr,
      format: (_value: unknown, vehicle: V) => (
        <a href={`/fleet/${vehicle.id}`} className="mono">
          {vehicle.plate}
        </a>
      ),
    },
    {
      key: 'model',
      header: UI_STRINGS.FLEET.model.fr,
      format: (_value: unknown, vehicle: V) =>
        vehicle.model ? `${vehicle.model.make} ${vehicle.model.model} (${vehicle.model.year})` : '—',
      hideIfDetailed: false,
    },
    {
      key: 'category',
      header: UI_STRINGS.FLEET.category.fr,
      format: (_value: unknown, vehicle: V) => vehicle.category,
    },
    {
      key: 'operationalStatus',
      header: UI_STRINGS.FLEET.status.fr,
      Component: StatusBadge,
    },
    {
      key: 'currentMileageKm',
      header: UI_STRINGS.FLEET.mileage.fr,
      format: (value: unknown) => Number(value).toLocaleString('fr-MA'),
    },
    {
      key: 'fuelLevelPct',
      header: UI_STRINGS.FLEET.fuel.fr,
      format: (value: unknown) => `${Number(value)}%`,
    },
  ];

  return (
    <>
      <PageHeader
        title={UI_STRINGS.FLEET.title.fr}
        subtitle={
          loading
            ? UI_STRINGS.FLEET.loading.fr
            : `${vehicles.length} ${UI_STRINGS.FLEET.vehicles.fr}${vehicles.length > 0 ? ` — ${Object.entries(counts).map(([status, count]) => `${count} ${status}`).join(' · ')}` : ''}`
        }
      />

      <Section>
        {loading && (
          <div className="loading" role="status" aria-live="polite">
            {UI_STRINGS.COMMON.loading.fr}
          </div>
        )}

        {error && (
          <div className="alert alert-CRITICAL" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && vehicles.length === 0 && (
          <EmptyState
            title={UI_STRINGS.FLEET.emptyTitle.fr}
            description={UI_STRINGS.FLEET.emptyDescription.fr}
          />
        )}

        {!loading && !error && vehicles.length > 0 && (
          <DataTable columns={columns} rows={vehicles} dense={dense} />
        )}

        <div className="density-toggle" role="group" aria-label="Densité de l'affichage" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {DENSITIES.map(({ mode, label, ariaLabel }) => (
            <button
              key={mode}
              type="button"
              className={`btn mini ${dense === mode ? 'primary' : ''}`}
              onClick={() => setDenseMode(mode)}
              aria-label={ariaLabel}
              aria-pressed={dense === mode}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

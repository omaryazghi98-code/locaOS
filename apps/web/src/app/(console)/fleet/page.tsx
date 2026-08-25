'use client';

import { useEffect, useState } from 'react';
import { FLEET_STRINGS } from '@locaos/domain/i18n';
import { clientApiFetch } from '@/lib/client-api';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Section,
  StatusBadge,
} from '@/components';
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
    clientApiFetch<V[]>('/api/fleet/vehicles')
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

  const columns: Column<V>[] = [
    {
      key: 'plate',
      header: FLEET_STRINGS.fr.plate,
      format: (_value, vehicle) => (
        <a href={`/fleet/${vehicle.id}`} className="mono">
          {vehicle.plate}
        </a>
      ),
    },
    {
      key: 'model',
      header: FLEET_STRINGS.fr.model,
      format: (_value, vehicle) =>
        vehicle.model ? `${vehicle.model.make} ${vehicle.model.model} (${vehicle.model.year})` : '—',
    },
    {
      key: 'category',
      header: FLEET_STRINGS.fr.category,
      format: (_value, vehicle) => vehicle.category,
    },
    {
      key: 'operationalStatus',
      header: FLEET_STRINGS.fr.status,
      format: (value) => <StatusBadge status={String(value)} />,
    },
    {
      key: 'currentMileageKm',
      header: FLEET_STRINGS.fr.mileage,
      format: (value) => Number(value).toLocaleString('fr-MA'),
    },
    {
      key: 'fuelLevelPct',
      header: FLEET_STRINGS.fr.fuel,
      format: (value) => `${Number(value)}%`,
    },
  ];

  return (
    <>
      <PageHeader
        title={FLEET_STRINGS.fr.title}
        subtitle={
          loading
            ? FLEET_STRINGS.fr.loading
            : `${vehicles.length} ${FLEET_STRINGS.fr.vehicles}${vehicles.length > 0 ? ` — ${Object.entries(counts).map(([status, count]) => `${count} ${status}`).join(' · ')}` : ''}`
        }
      />

      <Section>
        {loading && (
          <div className="loading" role="status" aria-live="polite">
            {FLEET_STRINGS.fr.loading}
          </div>
        )}

        {error && (
          <div className="alert alert-CRITICAL" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && vehicles.length === 0 && (
          <EmptyState
            title={FLEET_STRINGS.fr.emptyTitle}
            description={FLEET_STRINGS.fr.emptyDescription}
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

'use client';

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from 'react';
import { UI_STRINGS } from '@locaos/domain/i18n';
import {
  PageHeader,
  Section,
  DataTable,
  StatusBadge,
  EmptyState,
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

function useDensity(): { dense: ColumnMode; setDenseMode: (mode: ColumnMode) => void } {
  const [dense, setDense] = useState<ColumnMode>('comfortable');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('locaos-density');
      if (saved) setDense(saved as ColumnMode);
    }
  }, []);
  const setDenseMode = (mode: ColumnMode) => {
    localStorage.setItem('locaos-density', mode);
    setDense(mode);
  };
  return { dense, setDenseMode };
}

export default async function Fleet() {
  const { dense, setDenseMode } = useDensity();
  const vehicles = await apiFetch<V[]>('/api/fleet/vehicles');

  const columns = [
    {
      key: 'plate',
      header: 'Immatriculation',
      format: (_val: string, vehicle: V) => (
        <a href={`/fleet/${vehicle.id}`} className="mono">
          {vehicle.plate}
        </a>
      ),
    },
    {
      key: 'model',
      header: 'Modèle',
      format: (vehicle: V) => vehicle.model
        ? `${vehicle.model.make} ${vehicle.model.model} (${vehicle.model.year})`
        : '—',
      hideIfDetailed: true,
    },
    {
      key: 'category',
      header: 'Catégorie',
      format: (vehicle: V) => vehicle.category,
      hideIfDetailed: true,
    },
    {
      key: 'operationalStatus',
      header: 'Statut',
      Component: StatusBadge,
    },
    {
      key: 'currentMileageKm',
      header: 'KM',
      format: (vehicle: V) => vehicle.currentMileageKm.toLocaleString('fr-MA'),
    },
    {
      key: 'fuelLevelPct',
      header: 'Carburant',
      format: (vehicle: V) => `${vehicle.fuelLevelPct}%`,
    },
  ];

  const counts = vehicles.reduce<Record<string, number>>(
    (acc, v) => { acc[v.operationalStatus] = (acc[v.operationalStatus] ?? 0) + 1; return acc; },
    {}
  );

  return (
    <>
      <PageHeader
        title="Flotte"
        subtitle={`${vehicles.length} véhicules${vehicles.length > 0 ? ' — ' + Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(' · ') : ''}`}
      />
      <Section>
        {vehicles.length === 0 && <EmptyState
          title="Aucun véhicule"
          description="Aucun véhicule dans la flotte"
          action={{
            label: 'Ajouter un véhicule',
            onClick: () => window.location.href = '/brief?scope=fleet',
          }}
        />}

        <DataTable
          columns={columns as any}
          rows={vehicles}
          dense={dense}
          selectableRowIds={undefined}
          onRowSelect={undefined}
        />

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            className="btn mini"
            onClick={() => setDenseMode('compact')}
          >C</button>
          <button
            className="btn mini"
            onClick={() => setDenseMode('comfortable')}
          >Co</button>
          <button
            className="btn mini"
            onClick={() => setDenseMode('detailed')}
          >D</button>
        </div>
      </Section>
    </>
  );
}
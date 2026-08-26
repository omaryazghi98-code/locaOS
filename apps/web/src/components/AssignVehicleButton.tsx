'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id: string;
  plate: string;
  operationalStatus: string;
  categoryId: string;
}

export default function AssignVehicleButton({ reservationId, categoryId }: { reservationId: string; categoryId: string }) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/fleet/vehicles', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error?.message ?? 'Impossible de charger les véhicules');
        return data as Vehicle[];
      })
      .then((all) => {
        const available = all.filter((v) => v.operationalStatus === 'AVAILABLE' && v.categoryId === categoryId);
        setVehicles(available);
        setVehicleId(available[0]?.id ?? '');
      })
      .catch((e: Error) => setError(e.message));
  }, [categoryId]);

  const assign = async () => {
    if (!vehicleId) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/reservations/${reservationId}/assign-vehicle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId }),
    });
    const out = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(out?.error?.message ?? out?.message ?? 'Affectation impossible');
      return;
    }
    router.refresh();
  };

  if (error) return <div className="error-msg">{error}</div>;
  if (!vehicles.length) return <div className="sub">Aucun véhicule disponible dans cette catégorie.</div>;

  return (
    <div className="row" style={{ alignItems: 'end', marginTop: 10 }}>
      <div style={{ flex: 1 }}>
        <label>Véhicule disponible</label>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={busy}>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} · {v.operationalStatus}</option>)}
        </select>
      </div>
      <button className="mini primary" type="button" onClick={assign} disabled={busy || !vehicleId}>
        {busy ? 'Affectation…' : 'Affecter'}
      </button>
    </div>
  );
}

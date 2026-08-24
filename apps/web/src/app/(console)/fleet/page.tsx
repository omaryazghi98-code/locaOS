import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface V { id: string; plate: string; vin: string; operationalStatus: string; fleetStatus: string; currentMileageKm: number; fuelLevelPct: number; category: string; model: { make: string; model: string; year: number; fuelType: string } }

const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: 'ok', RESERVED: 'info', PREPARING: 'info', CONTRACT_READY: 'info', IN_TRANSIT: 'info',
  RENTED: 'info', OVERDUE: 'danger', AWAITING_INSPECTION: 'warn', INSPECTED: 'warn', CLEANING: 'warn',
  MAINTENANCE: 'warn', IMMOBILIZED: 'danger', ACCIDENT: 'danger', UNAVAILABLE: 'muted',
};

export default async function Fleet() {
  const vehicles = await apiFetch<V[]>('/api/fleet/vehicles');
  const counts = vehicles.reduce<Record<string, number>>((acc, v) => { acc[v.operationalStatus] = (acc[v.operationalStatus] ?? 0) + 1; return acc; }, {});
  return (
    <div>
      <div className="topbar"><div><h1>Flotte</h1>
        <div className="sub">{vehicles.length} véhicules — {Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(' · ')}</div></div></div>
      <table className="tbl">
        <thead><tr><th>Immat.</th><th>Modèle</th><th>Catégorie</th><th>Statut</th><th>KM</th><th>Carburant</th></tr></thead>
        <tbody>{vehicles.map((v) => (
          <tr key={v.id}>
            <td><Link className="mono" href={`/fleet/${v.id}`}>{v.plate}</Link></td>
            <td>{v.model ? `${v.model.make} ${v.model.model} (${v.model.year})` : '—'}</td>
            <td>{v.category}</td>
            <td><span className={`pill ${STATUS_CLASS[v.operationalStatus] ?? 'muted'}`}>{v.operationalStatus}</span></td>
            <td className="mono">{v.currentMileageKm.toLocaleString('fr-MA')}</td>
            <td>{v.fuelLevelPct}%</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

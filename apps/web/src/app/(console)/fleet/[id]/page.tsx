import { apiFetch } from '@/lib/api';
import ActionButton from '@/components/ActionButton';

interface Detail {
  vehicle: { id: string; plate: string; vin: string; operationalStatus: string; fleetStatus: string; currentMileageKm: number; fuelLevelPct: number; firstRegistrationDate: string | null };
  category: { name: string } | null;
  model: { make: string; model: string; year: number; fuelType: string } | null;
  documents: { id: string; type: string; refNumber: string | null; expiresAt: string | null }[];
  transitions: { id: string; fromStatus: string; toStatus: string; actorName: string | null; reason: string | null; createdAt: string }[];
  maintenanceWindows: { id: string; windowStart: string; windowEnd: string; note: string | null }[];
}

const OPTIONS: [string, string][] = [
  ['PREPARING', 'Préparer'], ['CONTRACT_READY', 'Prêt (contrat)'], ['MAINTENANCE', 'Maintenance'],
  ['CLEANING', 'Nettoyage'], ['AVAILABLE', 'Remettre en service'], ['IMMOBILIZED', 'Immobiliser'], ['UNAVAILABLE', 'Indisponible'],
];

export default async function VehicleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await apiFetch<Detail>(`/api/fleet/vehicles/${id}`);
  const v = d.vehicle;
  const fmt = (s: string) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'short', timeStyle: 'short' }).format(new Date(s));

  return (
    <div>
      <div className="topbar"><div>
        <h1 className="mono">{v.plate}</h1>
        <div className="sub">{d.model ? `${d.model.make} ${d.model.model} ${d.model.year} · ${d.model.fuelType}` : ''} · {d.category?.name} · VIN {v.vin}</div>
      </div>
        <span className={`pill ${v.operationalStatus === 'AVAILABLE' ? 'ok' : v.operationalStatus === 'RENTED' ? 'info' : 'warn'}`}>{v.operationalStatus}</span></div>

      <div className="grid cards">
        <div className="card"><div className="k">Kilométrage</div><div className="v">{v.currentMileageKm.toLocaleString('fr-MA')} km</div></div>
        <div className="card"><div className="k">Carburant</div><div className="v">{v.fuelLevelPct}%</div></div>
        <div className="card"><div className="k">1ère circ.</div><div className="v">{v.firstRegistrationDate ?? '—'}</div></div>
        <div className="card"><div className="k">Statut flotte</div><div className="v" style={{ fontSize: 15 }}>{v.fleetStatus}</div></div>
      </div>

      <h2>Actions (machine à états)</h2>
      <div className="btnrow">
        {OPTIONS.filter(([s]) => s !== v.operationalStatus).map(([s, label]) => (
          <ActionButton key={s} path={`/api/fleet/vehicles/${v.id}/transition`} body={{ to: s }} label={label}
            variant={s === 'AVAILABLE' || s === 'CONTRACT_READY' ? 'primary' : ['IMMOBILIZED', 'UNAVAILABLE', 'MAINTENANCE'].includes(s) ? 'danger' : ''}
            promptLabel="Motif (obligatoire pour les états exceptionnels)" promptField="reason" />
        ))}
      </div>
      <div className="sub">Toute transition illégale est refusée par la machine à états et journalisée. OVERDUE est réservé à l'évaluateur système.</div>

      <h2>Documents</h2>
      <table className="tbl"><thead><tr><th>Type</th><th>Référence</th><th>Échéance</th></tr></thead>
        <tbody>{d.documents.map((doc) => (
          <tr key={doc.id}><td>{doc.type}</td><td className="mono">{doc.refNumber ?? '—'}</td>
            <td>{doc.expiresAt ?? '—'}</td></tr>
        ))}</tbody></table>

      {d.maintenanceWindows.length > 0 && (<>
        <h2>Fenêtres de maintenance</h2>
        {d.maintenanceWindows.map((w) => <div key={w.id} className="card">{fmt(w.windowStart)} → {fmt(w.windowEnd)} · {w.note ?? ''}</div>)}
      </>)}

      <h2>Historique des transitions (journal immuable)</h2>
      <table className="tbl"><thead><tr><th>Quand</th><th>Transition</th><th>Acteur</th><th>Motif</th></tr></thead>
        <tbody>{d.transitions.map((t) => (
          <tr key={t.id}><td>{fmt(t.createdAt)}</td><td className="mono">{t.fromStatus} → {t.toStatus}</td>
            <td>{t.actorName ?? '—'}</td><td>{t.reason ?? '—'}</td></tr>
        ))}</tbody></table>
    </div>
  );
}

import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ActionButton from '@/components/ActionButton';
import StatusBadge from '@/components/StatusBadge';

const mad = (v?: string | null) => new Intl.NumberFormat('fr-MA').format(Number(v ?? 0) / 100) + ' MAD';
interface Detail {
  vehicle: { id: string; plate: string; vin: string; operationalStatus: string; fleetStatus: string; currentMileageKm: number; fuelLevelPct: number; firstRegistrationDate: string | null };
  category: { name: string } | null; model: { make: string; model: string; year: number; fuelType: string } | null;
  documents: { id: string; type: string; refNumber: string | null; expiresAt: string | null }[];
  transitions: { id: string; fromStatus: string; toStatus: string; actorName: string | null; reason: string | null; createdAt: string }[];
  maintenanceWindows: { id: string; windowStart: string; windowEnd: string; note: string | null }[];
  maintenanceHistory?: { id: string; taskKind: string; performedAt: string; totalCost: string; vendorName: string | null; downtimeHours: number }[];
  profitability?: { revenueMad: string; maintenanceMad: string; profitMad: string; rentedDays: number } | null;
  nextReservation?: { id: string; reference: string; pickupAt: string } | null;
  currentContract?: { id: string; number: number; customerName: string } | null;
}
const OPTIONS: [string, string][] = [
  ['PREPARING', 'Préparer'], ['CONTRACT_READY', 'Prêt (contrat)'], ['MAINTENANCE', 'Maintenance'], ['CLEANING', 'Nettoyage'],
  ['AVAILABLE', 'Remettre en service'], ['IMMOBILIZED', 'Immobiliser'], ['UNAVAILABLE', 'Indisponible'],
];
export default async function VehicleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const d = await apiFetch<Detail>(`/api/fleet/vehicles/${id}`); const v = d.vehicle;
  const fmt = (s: string) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'short', timeStyle: 'short' }).format(new Date(s));
  return (
    <div className="navi">
      <div className="topbar"><div><div className="nv-eyebrow">FLOTTE · FICHE VÉHICULE</div><h1 className="mono">{v.plate}</h1><div className="sub">{d.model ? `${d.model.make} ${d.model.model} ${d.model.year} · ${d.model.fuelType}` : ''} · {d.category?.name} · VIN {v.vin}</div></div>
        <div className="btnrow"><StatusBadge status={v.operationalStatus} />{d.currentContract && <a className="btn mini" href={`/api/contracts/${d.currentContract.id}/pdf`} target="_blank" rel="noreferrer">Contrat / PDF</a>}{d.nextReservation && !d.currentContract && <Link className="btn mini" href={`/reservations/${d.nextReservation.id}`}>Préparer contrat</Link>}{v.operationalStatus === 'INSPECTED' && <Link className="btn mini primary" href="/ops">Traiter préparation</Link>}</div>
      </div>

      <div className="navi-grid-3">
        <div className="nv-panel elev-2"><div className="nv-panel-head"><div className="nv-eyebrow">Exploitation</div></div><div className="nv-panel-body"><div className="nv-display nv-num">{v.currentMileageKm.toLocaleString('fr-MA')}</div><div className="nv-panel-hint">Kilomètres actuels</div></div></div>
        <div className="nv-panel"><div className="nv-panel-head"><div className="nv-eyebrow">Carburant</div></div><div className="nv-panel-body"><div className="nv-display nv-num">{v.fuelLevelPct}%</div><div className="nv-panel-hint">Niveau déclaré</div></div></div>
        <div className="nv-panel"><div className="nv-panel-head"><div className="nv-eyebrow">Statut flotte</div></div><div className="nv-panel-body"><div className="nv-num" style={{ fontSize: 18, fontWeight: 700 }}>{v.fleetStatus}</div><div className="nv-panel-hint">État opérationnel : <StatusBadge status={v.operationalStatus} /></div></div></div>
      </div>

      <section className="nv-panel elev-2"><div className="nv-panel-head"><div><h2 className="nv-panel-title">Actions machine à états</h2><div className="nv-panel-hint">Les transitions restent autorisées ou refusées par le domaine ; NAVI ne contourne pas cette autorité.</div></div></div><div className="nv-panel-body">
        {v.operationalStatus === 'INSPECTED' ? <><strong>Préparation requise avant remise en location.</strong><div className="sub" style={{ marginTop: 5 }}>INSPECTED → AVAILABLE ne peut pas être exécuté directement. Ouvrez Opérations pour trier la préparation post-retour.</div><div className="btnrow" style={{ marginTop: 8 }}><Link className="btn mini primary" href="/ops">Ouvrir les opérations</Link><Link className="btn mini" href="/navi#navi-pipeline">Voir le pipeline NAVI</Link></div></> : <div className="btnrow">{OPTIONS.filter(([s]) => s !== v.operationalStatus).map(([s, label]) => <ActionButton key={s} path={`/api/fleet/vehicles/${v.id}/transition`} body={{ to: s }} label={label} variant={s === 'AVAILABLE' || s === 'CONTRACT_READY' ? 'primary' : ['IMMOBILIZED', 'UNAVAILABLE', 'MAINTENANCE'].includes(s) ? 'danger' : ''} promptLabel="Motif (obligatoire pour les états exceptionnels)" promptField="reason" />)}</div>}
      </div></section>
      <div className="nv-pipe-note">Toute transition illégale est refusée par la machine à états et journalisée. OVERDUE est réservé à l'évaluateur système.</div>

      {d.currentContract && <section className="nv-panel"><div className="nv-panel-head"><h2 className="nv-panel-title">Location en cours</h2></div><div className="nv-panel-body">Contrat #{String(d.currentContract.number).padStart(5, '0')} — {d.currentContract.customerName} · <Link className="nv-link" href={`/contracts/${d.currentContract.id}`}>ouvrir</Link></div></section>}
      {d.nextReservation && <section className="nv-panel"><div className="nv-panel-head"><h2 className="nv-panel-title">Prochaine réservation</h2></div><div className="nv-panel-body">{d.nextReservation.reference} — départ {fmt(d.nextReservation.pickupAt)} · <Link className="nv-link" href={`/reservations/${d.nextReservation.id}`}>ouvrir</Link></div></section>}
      {d.profitability && <section><h2>Profitabilité</h2><div className="navi-grid-3"><div className="nv-panel"><div className="nv-panel-head"><h2 className="nv-panel-title">CA</h2></div><div className="nv-panel-body"><div className="nv-num" style={{ fontSize: 20, fontWeight: 700 }}>{mad(d.profitability.revenueMad)}</div></div></div><div className="nv-panel"><div className="nv-panel-head"><h2 className="nv-panel-title">Coût maintenance</h2></div><div className="nv-panel-body"><div className="nv-num" style={{ fontSize: 20, fontWeight: 700 }}>{mad(d.profitability.maintenanceMad)}</div></div></div><div className="nv-panel"><div className="nv-panel-head"><h2 className="nv-panel-title">Bénéfice est.</h2></div><div className="nv-panel-body"><div className="nv-num" style={{ fontSize: 20, fontWeight: 700 }}>{mad(d.profitability.profitMad)}</div><div className="sub">CA − maintenance − amortissement (valeur/5 ans)</div></div></div></div><div className="sub" style={{ marginTop: 8 }}>{d.profitability.rentedDays} jours loués (30 j).</div></section>}
      {d.maintenanceHistory && d.maintenanceHistory.length > 0 && <><h2>Historique d'entretien</h2><div className="nv-panel"><div className="nv-panel-body flush"><div style={{ overflowX: 'auto' }}><table className="tbl"><thead><tr><th>Date</th><th>Type</th><th>Garage</th><th>Coût</th><th>Immobilisation</th></tr></thead><tbody>{d.maintenanceHistory.map((m) => <tr key={m.id}><td>{fmt(m.performedAt)}</td><td>{m.taskKind}</td><td>{m.vendorName ?? '—'}</td><td className="mono">{mad(m.totalCost)}</td><td>{m.downtimeHours} h</td></tr>)}</tbody></table></div></div></div></>}
      <h2>Documents</h2><div className="nv-panel"><div className="nv-panel-body flush"><div style={{ overflowX: 'auto' }}><table className="tbl"><thead><tr><th>Type</th><th>Référence</th><th>Échéance</th></tr></thead><tbody>{d.documents.map((doc) => <tr key={doc.id}><td>{doc.type}</td><td className="mono">{doc.refNumber ?? '—'}</td><td>{doc.expiresAt ?? '—'}</td></tr>)}</tbody></table></div></div></div>
      {d.maintenanceWindows.length > 0 && <><h2>Fenêtres de maintenance</h2>{d.maintenanceWindows.map((w) => <div key={w.id} className="nv-panel" style={{ padding: 14 }}>{fmt(w.windowStart)} → {fmt(w.windowEnd)} · {w.note ?? ''}</div>)}</>}
      <h2>Historique des transitions (journal immuable)</h2><div className="nv-panel"><div className="nv-panel-body flush"><div style={{ overflowX: 'auto' }}><table className="tbl"><thead><tr><th>Quand</th><th>Transition</th><th>Acteur</th><th>Motif</th></tr></thead><tbody>{d.transitions.map((t) => <tr key={t.id}><td>{fmt(t.createdAt)}</td><td className="mono">{t.fromStatus} → {t.toStatus}</td><td>{t.actorName ?? '—'}</td><td>{t.reason ?? '—'}</td></tr>)}</tbody></table></div></div></div>
    </div>
  );
}

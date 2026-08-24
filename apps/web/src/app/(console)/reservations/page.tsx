import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Res { id: string; reference: string; status: string; pickupAt: string; returnAt: string; customerId: string; vehicleId: string | null; categoryId: string }

export default async function Reservations() {
  const list = await apiFetch<Res[]>('/api/reservations');
  const fmt = (d: string) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
  return (
    <div>
      <div className="topbar"><div><h1>Réservations</h1><div className="sub">{list.length} réservations</div></div>
        <Link className="btn primary" href="/reservations/new">+ Nouvelle réservation</Link></div>
      <table className="tbl">
        <thead><tr><th>Référence</th><th>Statut</th><th>Départ</th><th>Retour</th></tr></thead>
        <tbody>{list.map((r) => (
          <tr key={r.id}>
            <td><Link href={`/reservations/${r.id}`} className="mono">{r.reference}</Link></td>
            <td><span className={`pill ${['CANCELLED', 'NO_SHOW'].includes(r.status) ? 'muted' : r.status === 'IN_PROGRESS' ? 'info' : 'ok'}`}>{r.status}</span></td>
            <td>{fmt(r.pickupAt)}</td><td>{fmt(r.returnAt)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import ActionButton from '@/components/ActionButton';
import AssignVehicleButton from '@/components/AssignVehicleButton';
import ContractFromReservationButton from '@/components/ContractFromReservationButton';

interface Detail {
  reservation: { id: string; reference: string; status: string; pickupAt: string; returnAt: string; flightNumber: string | null; notes: string | null; vehicleId: string | null };
  customer: { firstName: string | null; lastName: string | null; companyName: string | null; phone: string } | null;
  quotes: { id: string; version: number; days: number; total: string; depositRequired: string; belowFloor: boolean }[];
  category: { id: string; name: string } | null;
  vehicle: { id: string; plate: string; operationalStatus: string } | null;
  blockers: string[];
}

export default async function ReservationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await apiFetch<Detail>(`/api/reservations/${id}`);
  const r = d.reservation;
  const q = d.quotes[0];
  const cookieStore = await cookies();
  const rawLang = cookieStore.get('locaos-lang')?.value;
  const language = rawLang === 'ar' ? 'ar' : rawLang === 'en' ? 'en' : 'fr';
  const labels = {
    fr: { contract: 'Préparer / imprimer le contrat', noVehicle: 'Affectez un véhicule depuis la flotte pour préparer le contrat.' },
    ar: { contract: 'إعداد / طباعة العقد', noVehicle: 'قم بتعيين سيارة من الأسطول لإعداد العقد.' },
    en: { contract: 'Prepare / print contract', noVehicle: 'Assign a vehicle from the fleet to prepare the contract.' },
  } as const;
  const fmt = (s: string) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'short', timeStyle: 'short' }).format(new Date(s));
  const mad = (v?: string) => new Intl.NumberFormat('fr-MA').format(Number(v ?? 0) / 100) + ' MAD';

  return (
    <div>
      <div className="topbar"><div>
        <h1 className="mono">{r.reference}</h1>
        <div className="sub">{d.customer ? [d.customer.firstName, d.customer.lastName, d.customer.companyName].filter(Boolean).join(' ') : ''} · {d.category?.name} · {d.vehicle?.plate ?? 'véhicule non affecté'}</div>
      </div><span className={`pill ${r.status === 'IN_PROGRESS' ? 'info' : 'ok'}`}>{r.status}</span></div>

      <div className="grid cols2">
        <div className="card"><h2 style={{ marginTop: 0 }}>Détails</h2>
          <div className="kv">
            <span className="k">Prise en charge</span><span>{fmt(r.pickupAt)}</span>
            <span className="k">Restitution</span><span>{fmt(r.returnAt)}</span>
            <span className="k">Vol</span><span>{r.flightNumber ?? '—'}</span>
            <span className="k">Véhicule</span><span className="mono">{d.vehicle?.plate ?? '—'} {d.vehicle ? `(${d.vehicle.operationalStatus})` : ''}</span>
            <span className="k">Notes</span><span>{r.notes ?? '—'}</span>
          </div>
          {d.blockers.length > 0 && <div style={{ marginTop: 10 }}>
            <h2 style={{ marginTop: 0 }}>Blocages</h2>
            {d.blockers.map((b) => <span key={b} className="pill danger" style={{ marginRight: 4 }}>{b}</span>)}
          </div>}
        </div>
        <div className="card"><h2 style={{ marginTop: 0 }}>Devis {q ? `(v${q.version})` : ''}</h2>
          {q ? (
            <div className="kv">
              <span className="k">Durée</span><span>{q.days} jour(s)</span>
              <span className="k">Total</span><span className="big">{mad(q.total)}</span>
              <span className="k">Caution requise</span><span>{mad(q.depositRequired)}</span>
              {q.belowFloor && <><span className="k">Avertissement</span><span className="pill danger">sous le prix plancher (MAP)</span></>}
            </div>
          ) : <div className="sub">Aucun devis.</div>}
          <div className="btnrow">
            {!d.vehicle && d.category && ['CONFIRMED', 'VEHICLE_ASSIGNED'].includes(r.status) && (
              <AssignVehicleButton reservationId={r.id} categoryId={d.category.id} />
            )}
            {!d.vehicle && <span className="sub">{labels[language].noVehicle}</span>}
          </div>
        </div>
      </div>

      <div className="btnrow" style={{ marginTop: 12 }}>
        {['CONFIRMED', 'VEHICLE_ASSIGNED'].includes(r.status) && <ActionButton path={`/api/reservations/${r.id}/status`} body={{ to: 'READY' }} label="Marquer prête" variant="primary" />}
        {['DRAFT', 'CONFIRMED', 'VEHICLE_ASSIGNED', 'READY'].includes(r.status) && (
          <ActionButton path={`/api/reservations/${r.id}/status`} body={{ to: 'CANCELLED' }} label="Annuler" variant="danger" promptLabel="Motif d'annulation" promptField="reason" />
        )}
        {d.vehicle && <ContractFromReservationButton reservationId={r.id} language={language} label={labels[language].contract} />}
        <a className="btn mini" href={`/field?reservationId=${r.id}&kind=DEPARTURE`}>Inspection départ</a>
      </div>
    </div>
  );
}

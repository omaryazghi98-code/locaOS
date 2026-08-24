import { apiFetch } from '@/lib/api';
import ActionButton from '@/components/ActionButton';

interface Departure {
  reservation: { id: string; reference: string; pickupAt: string; status: string; deliveryKind: string | null; vehicleId: string | null };
  customerName: string; plate: string | null; categoryName: string;
  blockers: string[]; contractId: string | null; contractStatus: string | null;
}
interface Return {
  reservation: { id: string; reference: string; returnAt: string; status: string };
  customerName: string; plate: string | null; categoryName: string;
  contractId: string | null; contractStatus: string | null;
  returnInspectionDone: boolean; vehicleStatus: string | null;
}

const fmt = (d: string) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
const BLOCKERS: Record<string, string> = {
  vehicle_unassigned: 'véhicule non affecté', vehicle_not_ready: 'véhicule pas prêt',
  contract_unsigned: 'contrat non signé', deposit_unsecured: 'caution manquante', inspection_missing: 'inspection départ manquante',
};

export default async function Today() {
  const t = await apiFetch<{ departures: Departure[]; returns: Return[]; tomorrowDepartureCount: number; pendingTransfers: { t: { id: string; reason: string; toBranchId: string }; plate: string }[] }>('/api/ops/today');
  return (
    <div>
      <div className="topbar"><div>
        <h1>Aujourd'hui — poste opérationnel</h1>
        <div className="sub">{t.departures.length} départs · {t.returns.length} retours · {t.tomorrowDepartureCount} demain. Préparez les contrats, sécurisez les cautions, préparez les véhicules.</div>
      </div></div>

      <div className="grid cols2">
        <div>
          <h2>Départs</h2>
          {t.departures.length === 0 && <div className="sub">Aucun départ aujourd'hui.</div>}
          {t.departures.map((d) => (
            <div key={d.reservation.id} className="card" style={{ marginBottom: 10 }}>
              <div className="row spread">
                <div className="big">{fmt(d.reservation.pickupAt)} — {d.customerName}</div>
                <span className={`pill ${d.blockers.length ? 'warn' : 'ok'}`}>{d.blockers.length ? `${d.blockers.length} blocage(s)` : 'prêt'}</span>
              </div>
              <div className="sub mono" style={{ marginTop: 4 }}>
                {d.reservation.reference} · {d.categoryName} · {d.plate ?? 'véhicule à affecter'} · {d.reservation.deliveryKind ?? 'agence'}
                {d.reservation.deliveryKind === 'AIRPORT' ? ' (aéroport)' : ''}
              </div>
              {d.blockers.length > 0 && (
                <div style={{ marginTop: 6 }}>{d.blockers.map((b) => <span key={b} className="pill danger" style={{ marginRight: 4 }}>{BLOCKERS[b] ?? b}</span>)}</div>
              )}
              <div className="btnrow">
                {d.contractId ? (
                  <>
                    <a className="btn mini" href={`/contracts/${d.contractId}`}>Contrat</a>
                    <a className="btn mini" href={`/api/contracts/${d.contractId}/pdf`} target="_blank" rel="noreferrer">Imprimer</a>
                    {d.contractStatus === 'DRAFT' && <ActionButton path={`/api/contracts/${d.contractId}/sign`} promptLabel="Nom du client (signature)" promptField="customerName" label="Signature" variant="primary" />}
                    {d.contractStatus === 'SIGNED' && <ActionButton path={`/api/contracts/${d.contractId}/activate`} label="Remettre le véhicule" variant="primary" confirmText="Confirmer la remise du véhicule ? (véhicule → LOUÉ)" />}
                  </>
                ) : (
                  <ActionButton path="/api/contracts/from-reservation" body={{ reservationId: d.reservation.id, language: 'fr' }} label="Préparer le contrat" variant="primary" />
                )}
                {d.reservation.vehicleId && <>
                  <ActionButton path={`/api/fleet/vehicles/${d.reservation.vehicleId}/transition`} body={{ to: 'PREPARING', reason: `Préparation ${d.reservation.reference}` }} label="Préparer véhicule" />
                  <ActionButton path={`/api/fleet/vehicles/${d.reservation.vehicleId}/transition`} body={{ to: 'CONTRACT_READY', reason: `Prêt — ${d.reservation.reference}` }} label="Véhicule prêt" />
                </>}
                <a className="btn mini" href={`/field?reservationId=${d.reservation.id}&kind=DEPARTURE`}>Inspection départ</a>
                <ActionButton path="/api/contracts/blank" body={{ language: 'fr' }} label="Contrat vierge" />
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2>Transferts recommandés</h2>
          {(!t.pendingTransfers || t.pendingTransfers.length === 0) && <div className="sub">Aucun transfert requis.</div>}
          {(t.pendingTransfers ?? []).map((x) => (
            <div key={x.t.id} className="card" style={{ marginBottom: 10 }}>
              <div className="row spread"><div className="big">{x.plate}</div></div>
              <div className="sub">{x.t.reason}</div>
              <div className="btnrow">
                <ActionButton path={`/api/transfers/${x.t.id}/execute`} label="Transfert effectué" variant="primary" confirmText="Confirmer que le véhicule a bien été conduit à l'agence cible ?" />
                <ActionButton path={`/api/transfers/${x.t.id}/cancel`} promptLabel="Motif d'annulation" promptField="reason" label="Annuler" variant="danger" />
              </div>
            </div>
          ))}
          <h2>Retours</h2>
          {t.returns.length === 0 && <div className="sub">Aucun retour aujourd'hui.</div>}
          {t.returns.map((r) => (
            <div key={r.reservation.id} className="card" style={{ marginBottom: 10 }}>
              <div className="row spread">
                <div className="big">{fmt(r.reservation.returnAt)} — {r.customerName}</div>
                <span className={`pill ${r.returnInspectionDone ? 'ok' : 'warn'}`}>{r.returnInspectionDone ? 'inspecté' : 'inspection à faire'}</span>
              </div>
              <div className="sub mono" style={{ marginTop: 4 }}>
                {r.reservation.reference} · {r.categoryName} · {r.plate ?? '—'} · véhicule: {r.vehicleStatus ?? '—'}
              </div>
              <div className="btnrow">
                {!r.returnInspectionDone && <a className="btn mini primary" href={`/field?reservationId=${r.reservation.id}&kind=RETURN`}>Inspecter le véhicule</a>}
                {r.contractId && <a className="btn mini" href={`/contracts/${r.contractId}`}>Contrat</a>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

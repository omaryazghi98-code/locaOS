import { apiFetch } from '@/lib/api';
import ActionButton from '@/components/ActionButton';

interface Detail {
  contract: { id: string; number: number; status: string; language: string; periodStart: string | null; periodEnd: string | null; voidedReason: string | null; blankIssuedAt: string | null; scannedObjectKey: string | null };
  versions: { id: string; version: number; createdAt: string; contentHash: string }[];
  amendments: { id: string; kind: string; reason: string; createdAt: string }[];
  deposit: { id: string; amount: string; method: string; status: string } | null;
  inspections: { id: string; kind: string; submittedAt: string }[];
  reservation: { id: string; reference: string } | null;
}

export default async function ContractDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await apiFetch<Detail>(`/api/contracts/${id}`);
  const c = d.contract;
  const fmt = (s: string | null) => s ? new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'short', timeStyle: 'short' }).format(new Date(s)) : '—';
  const mad = (v?: string) => new Intl.NumberFormat('fr-MA').format(Number(v ?? 0) / 100) + ' MAD';

  return (
    <div>
      <div className="topbar"><div>
        <h1>Contrat #{String(c.number).padStart(5, '0')} <span className={`pill ${c.status === 'ACTIVE' ? 'ok' : c.status === 'BLANK_ISSUED' ? 'warn' : 'info'}`}>{c.status}</span></h1>
        <div className="sub">Langue {c.language.toUpperCase()} · Réservation {d.reservation?.reference ?? '—'} · Période {fmt(c.periodStart)} → {fmt(c.periodEnd)}</div>
      </div>
        <div className="btnrow">
          <a className="btn primary mini" href={`/api/contracts/${c.id}/pdf`} target="_blank" rel="noreferrer">Voir / imprimer le PDF</a>
        </div>
      </div>

      {c.voidedReason && <div className="alert CRITICAL"><div className="t">Contrat annulé</div><div className="m">{c.voidedReason}</div></div>}

      <div className="btnrow">
        {c.status === 'DRAFT' && <ActionButton path={`/api/contracts/${c.id}/sign`} promptLabel="Nom du client (signature)" promptField="customerName" label="Signer" variant="primary" />}
        {c.status === 'SIGNED' && <ActionButton path={`/api/contracts/${c.id}/activate`} label="Activer (remise)" variant="primary" confirmText="Confirmer la remise du véhicule ?" />}
        {c.status === 'ACTIVE' && <ActionButton path={`/api/contracts/${c.id}/close`} label="Clôturer (retour traité)" variant="primary" />}
        {['BLANK_ISSUED', 'DRAFT', 'SIGNED'].includes(c.status) && (
          <ActionButton path={`/api/contracts/${c.id}/void`} label="Annuler (VOIDED)" variant="danger" promptLabel="Motif d'annulation (trace)" promptField="reason" />
        )}
      </div>

      <div className="grid cols2">
        <div>
          <h2>Versions (immuables)</h2>
          <table className="tbl"><thead><tr><th>v</th><th>Créée le</th><th>Hash</th></tr></thead>
            <tbody>{d.versions.map((v) => (
              <tr key={v.id}><td>v{v.version}</td><td>{fmt(v.createdAt)}</td>
                <td className="mono" title={v.contentHash}>{v.contentHash.slice(0, 16)}…</td></tr>))}</tbody></table>

          <h2>Avenants</h2>
          {d.amendments.length === 0 ? <div className="sub">Aucun avenant.</div> : d.amendments.map((a) => (
            <div key={a.id} className="alert ATTENTION"><div className="t">{a.kind}</div><div className="m">{a.reason} — {fmt(a.createdAt)}</div></div>
          ))}
          {['SIGNED', 'ACTIVE', 'AMENDED'].includes(c.status) && (
            <div className="btnrow">
              <ActionButton path={`/api/contracts/${c.id}/amendments`} body={{ kind: 'PERIOD', reason: 'Prolongation convenue avec le client' }} promptLabel="Nouvelle date/heure de retour (ISO)" promptField="newReturnAt" label="Avenant période" />
            </div>
          )}
        </div>
        <div>
          <h2>Caution</h2>
          {d.deposit ? (
            <div className="card">
              <div className="kv">
                <span className="k">Montant</span><span className="big">{mad(d.deposit.amount)}</span>
                <span className="k">Mode</span><span>{d.deposit.method}</span>
                <span className="k">Statut</span><span><span className="pill info">{d.deposit.status}</span></span>
              </div>
              {['HELD', 'PRE_AUTHORIZED', 'PARTIALLY_CHARGED'].includes(d.deposit.status) && (
                <div className="btnrow">
                  <ActionButton path={`/api/finance/deposits/${d.deposit.id}/release`} promptLabel="Motif de libération" promptField="reason" label="Libérer la caution" />
                </div>
              )}
            </div>
          ) : <div className="sub">Aucune caution enregistrée.</div>}

          <h2>Inspections liées</h2>
          {d.inspections.length === 0 ? <div className="sub">Aucune inspection liée.</div> : d.inspections.map((i) => (
            <div key={i.id} className="card" style={{ marginBottom: 6 }}>{i.kind} — {fmt(i.submittedAt)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

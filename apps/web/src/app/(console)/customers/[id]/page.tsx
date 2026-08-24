import { apiFetch } from '@/lib/api';

interface Detail {
  customer: { id: string; firstName: string | null; lastName: string | null; companyName: string | null; phone: string; email: string | null; segment: string; notes: string | null };
  identityDocuments: { id: string; type: string; numberMasked: string; expiryDate: string | null }[];
  flags: { id: string; kind: string; severity: string; note: string | null }[];
  consents: { id: string; purpose: string; granted: boolean }[];
}

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, full] = await Promise.all([
    apiFetch<Detail>(`/api/customers/${id}`),
    apiFetch<{ reservations: { id: string; reference: string; status: string; pickupAt: string }[]; stats?: { revenue_mad?: string; avg_days?: string; cancellations?: number }; damages: { id: string; zone_code: string; plate: string }[] }>(`/api/customers/${id}/360`).catch(() => null),
  ]);
  const c = d.customer;
  return (
    <div>
      <div className="topbar"><div>
        <h1>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</h1>
        <div className="sub mono">{c.phone} · {c.email ?? 'sans e-mail'} · <span className="pill info">{c.segment}</span></div>
      </div></div>

      <div className="grid cols2">
        <div>
          <h2>Pièces d'identité (numéros chiffrés)</h2>
          <table className="tbl"><thead><tr><th>Type</th><th>Numéro</th><th>Expiration</th></tr></thead>
            <tbody>{d.identityDocuments.map((doc) => (
              <tr key={doc.id}><td>{doc.type}</td><td className="mono">{doc.numberMasked}</td>
                <td>{doc.expiryDate ?? '—'}</td></tr>))}</tbody></table>
          <div className="sub">Démasquage : permission <span className="mono">identity:unmask</span> + audit systématique.</div>

          <h2>Consentements (CNDP — Loi 09-08)</h2>
          {d.consents.length === 0 ? <div className="sub">Aucun consentement enregistré.</div> : (
            <table className="tbl"><thead><tr><th>Finalité</th><th>Accord</th></tr></thead>
              <tbody>{d.consents.map((x) => (
                <tr key={x.id}><td>{x.purpose}</td><td><span className={`pill ${x.granted ? 'ok' : 'muted'}`}>{x.granted ? 'oui' : 'non'}</span></td></tr>))}</tbody></table>
          )}
        </div>
        <div>
          <h2>Signalements (jamais automatiques)</h2>
          {d.flags.length === 0 ? <div className="sub">Aucun signalement.</div> : d.flags.map((f) => (
            <div key={f.id} className={`alert ${f.severity}`}><div className="t">{f.kind}</div><div className="m">{f.note ?? ''}</div></div>
          ))}
          <h2>Notes</h2>
          <div className="card">{c.notes ?? '—'}</div>

          <h2>Historique & valeur (360°)</h2>
          {full && (
            <>
              <div className="grid cards">
                <div className="card"><div className="k">CA total</div><div className="v ok">{new Intl.NumberFormat('fr-MA').format(Number(full.stats?.revenue_mad ?? 0) / 100)} MAD</div></div>
                <div className="card"><div className="k">Durée moyenne</div><div className="v">{Number(full.stats?.avg_days ?? 0).toFixed(1)} j</div></div>
                <div className="card"><div className="k">Annulations</div><div className="v">{full.stats?.cancellations ?? 0}</div></div>
                <div className="card"><div className="k">Locations</div><div className="v">{full.reservations.length}</div></div>
              </div>
              <table className="tbl" style={{ marginTop: 8 }}><thead><tr><th>Référence</th><th>Statut</th><th>Départ</th></tr></thead>
                <tbody>{full.reservations.slice(0, 8).map((r) => (
                  <tr key={r.id}><td className="mono"><a href={`/reservations/${r.id}`}>{r.reference}</a></td>
                    <td>{r.status}</td><td>{new Intl.DateTimeFormat('fr-MA', { dateStyle: 'short' }).format(new Date(r.pickupAt))}</td></tr>
                ))}</tbody></table>
              {full.damages.length > 0 && <div className="sub" style={{ marginTop: 8 }}>Dommages liés: {full.damages.map((x) => `${x.plate}·${x.zone_code}`).join(', ')}</div>}
              <div className="sub" style={{ marginTop: 6 }}>Indicateurs objectifs uniquement — aucun score opaque, aucune liste noire automatisée (V1 §11).</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

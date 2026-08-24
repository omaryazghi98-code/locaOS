import { apiFetch } from '@/lib/api';

interface Detail {
  customer: { id: string; firstName: string | null; lastName: string | null; companyName: string | null; phone: string; email: string | null; segment: string; notes: string | null };
  identityDocuments: { id: string; type: string; numberMasked: string; expiryDate: string | null }[];
  flags: { id: string; kind: string; severity: string; note: string | null }[];
  consents: { id: string; purpose: string; granted: boolean }[];
}

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await apiFetch<Detail>(`/api/customers/${id}`);
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
        </div>
      </div>
    </div>
  );
}

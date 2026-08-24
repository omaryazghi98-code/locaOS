import { apiFetch } from '@/lib/api';
import ActionButton from '@/components/ActionButton';

interface Alert { id: string; ruleKey: string; severity: string; status: string; title: string; message: string; createdAt: string; sourceKind: string; category?: string }
interface Rule { key: string; name: string; severity: string; enabled: boolean; channel: string; description: string }

export default async function Alerts({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = status ?? 'OPEN,ACKNOWLEDGED';
  const [list, rules] = await Promise.all([
    apiFetch<Alert[]>(`/api/alerts?status=${filter}`),
    apiFetch<Rule[]>('/api/alerts/rules'),
  ]);
  const fmt = (s: string) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(s));

  return (
    <div>
      <div className="topbar"><div><h1>Alertes</h1>
        <div className="sub">{list.length} alerte(s) — moteur de règles déclaratives (canal ÉVÉNEMENT / PLANIFIÉ / SIGNAL). Aucune action financière automatique : DETECT → EXPLAIN → décision humaine.</div></div>
        <div className="tabs">
          <a href="/alerts" className={filter.includes('OPEN') ? 'active' : ''}>Ouvertes</a>
          <a href="/alerts?status=RESOLVED" className={filter === 'RESOLVED' ? 'active' : ''}>Résolues</a>
        </div></div>

      {list.map((a) => (
        <div key={a.id} className={`alert ${a.severity} ${a.status !== 'OPEN' ? 'pending' : ''}`}>
          <div className="row spread">
            <div className="t">{a.title}</div>
            <span className={`pill ${a.severity === 'CRITICAL' ? 'danger' : a.severity === 'ATTENTION' ? 'warn' : 'muted'}`}>{a.severity} · {a.status}</span>
          </div>
          <div className="m">{a.message}</div>
          <div className="sub" style={{ marginTop: 4 }}>{a.ruleKey} · {a.sourceKind} · {fmt(a.createdAt)}</div>
          {a.status === 'OPEN' && <div className="btnrow">
            <ActionButton path={`/api/alerts/${a.id}/ack`} label="Prendre en charge" />
            <ActionButton path={`/api/alerts/${a.id}/resolve`} promptLabel="Note de résolution (auditée)" promptField="note" label="Résoudre" variant="primary" />
          </div>}
        </div>
      ))}

      <h2>Règles ({rules.filter((r) => r.enabled).length}/{rules.length} actives)</h2>
      <table className="tbl">
        <thead><tr><th>Règle</th><th>Canal</th><th>Sévérité</th><th>Active</th><th></th></tr></thead>
        <tbody>{rules.map((r) => (
          <tr key={r.key}><td>{r.name}<div className="sub">{r.description}</div></td>
            <td><span className="pill muted">{r.channel}</span></td>
            <td><span className={`pill ${r.severity === 'CRITICAL' || r.severity === 'HIGH' ? 'danger' : 'warn'}`}>{r.severity}</span></td>
            <td>{r.enabled ? 'oui' : 'non'}</td>
            <td>{r.key.startsWith('FLEET') || r.key.startsWith('VEHICLE_AGE') ? (
              <ActionButton path={`/api/alerts/rules/${r.key}/toggle`} body={{ enabled: !r.enabled }} label={r.enabled ? 'Désactiver' : 'Activer (G.2)'}
                confirmText="Moniteur réglementaire (sources secondaires — vérifiez avec votre comptable). Activer ?" />
            ) : null}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

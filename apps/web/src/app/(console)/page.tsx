import { apiFetch } from '@/lib/api';

interface Brief {
  kind: string; day: string; departures: number; returns: number; utilizationPct: number; fleetSize: number;
  vehiclesRequiringAttention: { id: string; plate: string; status: string }[];
  criticalAlerts: Alert[]; attentionAlerts: Alert[];
  openCashSession: { id: string; openedAt: string } | null; tomorrowDepartures: number;
  expectedCashMad?: string; cashInTodayMad?: string; depositsHeldMad?: string;
  overdueRentals: { id: string; plate: string }[];
}
interface Alert { id: string; severity: string; ruleKey: string; title: string; message: string }

const mad = (v?: string) => (v == null ? '—' : new Intl.NumberFormat('fr-MA').format(Number(v) / 100) + ' MAD');

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams;
  const kind = scope === 'eod' ? 'eod' : 'morning';
  const b = await apiFetch<Brief>(`/api/ops/brief?scope=${kind}`);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>{kind === 'morning' ? 'Brief du matin' : 'Brief de fin de journée'}</h1>
          <div className="sub">{new Date(b.day).toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' })} — Ce qui demande votre attention aujourd'hui.</div>
        </div>
        <div className="tabs">
          <a href="/" className={kind === 'morning' ? 'active' : ''}>Matin</a>
          <a href="/?scope=eod" className={kind === 'eod' ? 'active' : ''}>Fin de journée</a>
        </div>
      </div>

      <div className="grid cards">
        <div className="card"><div className="k">Départs aujourd'hui</div><div className="v">{b.departures}</div></div>
        <div className="card"><div className="k">Retours aujourd'hui</div><div className="v">{b.returns}</div></div>
        <div className="card"><div className="k">Utilisation</div><div className="v">{b.utilizationPct}%</div><div className="sub">{b.fleetSize} véhicules en flotte</div></div>
        <div className="card"><div className="k">{kind === 'morning' ? 'Cash attendu (jour)' : 'Cash encaissé'}</div><div className="v">{mad(kind === 'morning' ? b.expectedCashMad : b.cashInTodayMad)}</div></div>
        <div className="card"><div className="k">Cautions bloquées</div><div className="v warn">{mad(b.depositsHeldMad)}</div><div className="sub">espèces + pré-autorisations</div></div>
        <div className="card"><div className="k">Locations en retard</div><div className={`v ${b.overdueRentals.length ? 'crit' : 'ok'}`}>{b.overdueRentals.length}</div>
          {b.overdueRentals.length > 0 && <div className="sub">{b.overdueRentals.map((o) => o.plate).join(', ')}</div>}</div>
      </div>

      <h2>Critique</h2>
      {b.criticalAlerts.length === 0 && <div className="sub">Aucune alerte critique. ✓</div>}
      {b.criticalAlerts.map((a) => (
        <div key={a.id} className={`alert ${a.severity}`}><div className="t">{a.title}</div><div className="m">{a.message}</div></div>
      ))}

      <h2>À surveiller</h2>
      {b.attentionAlerts.length === 0 && <div className="sub">Rien à signaler.</div>}
      {b.attentionAlerts.slice(0, 8).map((a) => (
        <div key={a.id} className={`alert ${a.severity}`}><div className="t">{a.title}</div><div className="m">{a.message}</div></div>
      ))}

      <h2>Véhicules nécessitant une action</h2>
      {b.vehiclesRequiringAttention.length === 0 ? <div className="sub">Toute la flotte est prête.</div> : (
        <table className="tbl"><thead><tr><th>Immat.</th><th>Statut</th></tr></thead>
          <tbody>{b.vehiclesRequiringAttention.map((v) => (
            <tr key={v.id}><td className="mono">{v.plate}</td><td><span className="pill warn">{v.status}</span></td></tr>
          ))}</tbody></table>
      )}

      <div className="sub" style={{ marginTop: 16 }}>
        Demain : {b.tomorrowDepartures} départ(s) planifiés.
        {b.openCashSession ? ' Session de caisse OUVERTE — clôture en fin de journée.' : ' Aucune session de caisse ouverte.'}
      </div>
    </div>
  );
}

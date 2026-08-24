import { apiFetch } from '@/lib/api';

interface Brief {
  kind: string; day: string; departures: number; returns: number; utilizationPct: number; fleetSize: number;
  vehiclesRequiringAttention: { id: string; plate: string; status: string }[];
  criticalAlerts: { id: string; title: string; message: string }[];
  attentionAlerts: { id: string; title: string; message: string }[];
  openCashSession: { id: string; openedAt: string } | null;
  tomorrowDepartures: number; expectedCashMad?: string; cashInTodayMad?: string; depositsHeldMad?: string;
  overdueRentals: { id: string; plate: string }[]; varianceNote?: string;
}
const mad = (v?: string) => new Intl.NumberFormat('fr-MA').format(Number(v ?? 0) / 100) + ' MAD';

export default async function BriefPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams;
  const kind = scope === 'eod' ? 'eod' : 'morning';
  const b = await apiFetch<Brief>(`/api/ops/brief?scope=${kind}`);
  return (
    <div>
      <div className="topbar"><div>
        <h1>{kind === 'morning' ? 'Brief du matin' : 'Brief de fin de journée'}</h1>
        <div className="sub">La routine du patron, accélérée — avec les raisons derrière chaque point.</div>
      </div>
        <div className="tabs"><a href="/brief" className={kind === 'morning' ? 'active' : ''}>Matin</a><a href="/brief?scope=eod" className={kind === 'eod' ? 'active' : ''}>Soir</a></div></div>

      <div className="grid cards">
        <div className="card"><div className="k">Départs / Retours</div><div className="v">{b.departures} / {b.returns}</div></div>
        <div className="card"><div className="k">Utilisation</div><div className="v">{b.utilizationPct}%</div><div className="sub">{b.fleetSize} véhicules</div></div>
        <div className="card"><div className="k">{kind === 'morning' ? 'Cash attendu' : 'Cash encaissé'}</div><div className="v">{mad(kind === 'morning' ? b.expectedCashMad : b.cashInTodayMad)}</div></div>
        <div className="card"><div className="k">Cautions bloquées</div><div className="v warn">{mad(b.depositsHeldMad)}</div></div>
        <div className="card"><div className="k">Retards</div><div className={`v ${b.overdueRentals.length ? 'crit' : 'ok'}`}>{b.overdueRentals.length}</div></div>
        <div className="card"><div className="k">Départs demain</div><div className="v">{b.tomorrowDepartures}</div></div>
      </div>

      <h2>Critique — traiter maintenant</h2>
      {b.criticalAlerts.length === 0 && <div className="sub">Aucune alerte critique. ✓</div>}
      {b.criticalAlerts.map((a) => <div key={a.id} className="alert CRITICAL"><div className="t">{a.title}</div><div className="m">{a.message}</div></div>)}
      <h2>À surveiller</h2>
      {b.attentionAlerts.length === 0 && <div className="sub">Rien à signaler.</div>}
      {b.attentionAlerts.slice(0, 8).map((a) => <div key={a.id} className="alert ATTENTION"><div className="t">{a.title}</div><div className="m">{a.message}</div></div>)}

      <h2>Flotte — véhicules nécessitant une action</h2>
      {b.vehiclesRequiringAttention.length === 0 ? <div className="sub">Toute la flotte est prête.</div> : (
        <table className="tbl"><thead><tr><th>Immat.</th><th>Statut</th></tr></thead>
          <tbody>{b.vehiclesRequiringAttention.map((v) => <tr key={v.id}><td className="mono">{v.plate}</td><td><span className="pill warn">{v.status}</span></td></tr>)}</tbody></table>
      )}
      <div className="sub" style={{ marginTop: 12 }}>
        {b.openCashSession ? '⚠ Session de caisse OUVERTE — clôture + comptage en « Caisse & finances ».' : '✓ Aucune session de caisse ouverte.'}
        {kind === 'eod' && b.varianceNote ? ' ' + b.varianceNote : ''}
      </div>
    </div>
  );
}

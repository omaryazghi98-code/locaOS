import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface FleetRow { id: string; plate: string; revenue: string; maintenance_cost: string; downtime_hours: number; rented_days: number; profit_estimate: string; current_mileage_km: number; utilizationPct?: number }
interface FinanceReport { daily: { day: string; method: string; in_mad: string; out_mad: string }[]; outstandingMad: string; deposits: { status: string; total: string; n: number }[]; cashVariance: { total_variance: string; sessions: number }[] }
interface OpsReport { rentals: { completed: number; cancelled: number; no_show: number; in_progress: number; avg_days: string } | undefined; extensions: number }
interface CustRow { id: string; first_name: string | null; last_name: string | null; company_name: string | null; segment: string; rentals: number; avg_days: string; revenue_mad: string }
interface BranchRow { id: string; name: string; departures: number; revenue_mad: string }

const mad = (v?: string | number | bigint | null) => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Number(v ?? 0) / 100) + ' MAD';
const TABS = [['fleet', 'Flotte'], ['finance', 'Finance'], ['operations', 'Opérations'], ['customers', 'Clients'], ['branches', 'Agences']] as const;

export default async function Reports({ searchParams }: { searchParams: Promise<{ tab?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.find(([t]) => t === sp.tab)?.[0] ?? 'fleet') as string;
  const from = sp.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  const q = `from=${from}&to=${to}`;

  return (
    <div>
      <div className="topbar"><div><h1>Rapports</h1>
        <div className="sub">{from} → {to} · export CSV disponible (flotte)</div></div></div>
      <div className="tabs" style={{ marginBottom: 10 }}>
        {TABS.map(([t, label]) => <a key={t} href={`/reports?tab=${t}&${q}`} className={tab === t ? 'active' : ''}>{label}</a>)}
      </div>

      {tab === 'fleet' && <FleetTab q={q} />}
      {tab === 'finance' && <FinanceTab q={q} />}
      {tab === 'operations' && <OperationsTab q={q} />}
      {tab === 'customers' && <CustomersTab q={q} />}
      {tab === 'branches' && <BranchesTab q={q} />}
    </div>
  );
}

async function FleetTab({ q }: { q: string }) {
  const rows = await apiFetch<FleetRow[]>(`/api/reports/fleet?${q}`);
  return (
    <div>
      <div className="btnrow" style={{ marginBottom: 8 }}>
        <a className="btn mini" href={`/api/reports/fleet?${q}&format=csv`}>⬇ Export CSV</a>
        <span className="sub">Bénéfice = CA − maintenance − amortissement estimé (valeur/5 ans). « Quelques voitures me rapportent réellement ? »</span>
      </div>
      <table className="tbl">
        <thead><tr><th>Immat.</th><th>CA</th><th>Maintenance</th><th>Bénéfice est.</th><th>Jours loués</th><th>Immobilisation</th><th>KM</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td><Link className="mono" href={`/fleet/${r.id}`}>{r.plate}</Link></td>
            <td className="mono">{mad(r.revenue)}</td>
            <td className="mono">{mad(r.maintenance_cost)}</td>
            <td className="mono" style={{ color: Number(r.profit_estimate) < 0 ? 'var(--danger)' : 'var(--ok)' }}>{mad(r.profit_estimate)}</td>
            <td>{r.rented_days}</td>
            <td>{r.downtime_hours} h</td>
            <td className="mono">{Number(r.current_mileage_km).toLocaleString('fr-MA')}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

async function FinanceTab({ q }: { q: string }) {
  const d = await apiFetch<FinanceReport>(`/api/reports/finance?${q}`);
  return (
    <div>
      <div className="grid cards" style={{ marginBottom: 10 }}>
        <div className="card"><div className="k">Encours total</div><div className="v">{mad(d.outstandingMad)}</div></div>
        <div className="card"><div className="k">Écart de caisse cumulé</div><div className={`v ${Number(d.cashVariance[0]?.total_variance ?? 0) === 0 ? 'ok' : 'crit'}`}>{mad(d.cashVariance[0]?.total_variance)}</div><div className="sub">{d.cashVariance[0]?.sessions ?? 0} session(s)</div></div>
        {d.deposits.map((x) => <div key={x.status} className="card"><div className="k">Cautions {x.status}</div><div className="v">{mad(x.total)}</div><div className="sub">{x.n}</div></div>)}
      </div>
      <table className="tbl"><thead><tr><th>Jour</th><th>Mode</th><th>Encaissé</th><th>Sorti</th></tr></thead>
        <tbody>{d.daily.map((r, i) => (
          <tr key={i}><td>{String(r.day).slice(0, 10)}</td><td>{r.method}</td><td className="mono">{mad(r.in_mad)}</td><td className="mono">{mad(r.out_mad)}</td></tr>
        ))}</tbody></table>
    </div>
  );
}

async function OperationsTab({ q }: { q: string }) {
  const d = await apiFetch<OpsReport>(`/api/reports/operations?${q}`);
  const r = d.rentals;
  return (
    <div className="grid cards">
      <div className="card"><div className="k">Terminées</div><div className="v">{r?.completed ?? 0}</div></div>
      <div className="card"><div className="k">En cours</div><div className="v">{r?.in_progress ?? 0}</div></div>
      <div className="card"><div className="k">Annulées / no-show</div><div className="v warn">{r?.cancelled ?? 0} / {r?.no_show ?? 0}</div></div>
      <div className="card"><div className="k">Durée moyenne</div><div className="v">{r?.avg_days ?? 0} j</div></div>
      <div className="card"><div className="k">Prolongations</div><div className="v">{d.extensions}</div></div>
    </div>
  );
}

async function CustomersTab({ q }: { q: string }) {
  const rows = await apiFetch<CustRow[]>(`/api/reports/customers?${q}`);
  return <table className="tbl"><thead><tr><th>Client</th><th>Segment</th><th>Locations</th><th>Durée moy.</th><th>CA</th></tr></thead>
    <tbody>{rows.map((c) => (
      <tr key={c.id}><td><Link href={`/customers/${c.id}`}>{[c.first_name, c.last_name, c.company_name].filter(Boolean).join(' ')}</Link></td>
        <td><span className="pill info">{c.segment}</span></td><td>{c.rentals}</td><td>{c.avg_days} j</td><td className="mono">{mad(c.revenue_mad)}</td></tr>
    ))}</tbody></table>;
}

async function BranchesTab({ q }: { q: string }) {
  const rows = await apiFetch<BranchRow[]>(`/api/reports/branches?${q}`);
  return <table className="tbl"><thead><tr><th>Agence</th><th>Départs</th><th>CA</th></tr></thead>
    <tbody>{rows.map((b) => <tr key={b.id}><td>{b.name}</td><td>{b.departures}</td><td className="mono">{mad(b.revenue_mad)}</td></tr>)}</tbody></table>;
}

import { apiFetch } from '@/lib/api';
import ActionButton from '@/components/ActionButton';
import CloseSession from '@/components/CloseSession';

interface Payment { id: string; direction: string; method: string; purpose: string | null; amount: string; currency: string; fxRate: string | null; madEquivalent: string | null; receivedAt: string; note: string | null; reversesPaymentId: string | null }
interface Session { id: string; branchId: string; openedAt: string; closedAt: string | null; status: string; expectedMAD: string | null; countedMAD: string | null; varianceMAD: string | null; varianceExplanation: string | null; openingBalance: string }
interface Current { session: Session | null; expectedMAD: string; cashPayments: Payment[] }

const mad = (v?: string | bigint | null) => new Intl.NumberFormat('fr-MA').format(Number(v ?? 0) / 100) + ' MAD';
const fmt = (s: string) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' }).format(new Date(s));

export default async function Finance() {
  const [payments, current] = await Promise.all([
    apiFetch<Payment[]>('/api/finance/payments'),
    apiFetch<Current>('/api/finance/cash-sessions/current'),
  ]);

  return (
    <div>
      <div className="topbar"><div><h1>Caisse & finances</h1>
        <div className="sub">Enregistrements en append-only : toute correction = écriture d'annulation liée. Écarts jamais écrasés.</div></div></div>

      <div className="grid cards" style={{ marginBottom: 8 }}>
        <div className="card"><div className="k">Session de caisse</div>
          <div className="v" style={{ fontSize: 15 }}>{current.session ? (current.session.status === 'OPEN' ? 'OUVERTE' : 'clôturée') : 'aucune'}</div>
          {current.session && <div className="sub">ouverte à {fmt(current.session.openedAt)}</div>}</div>
        <div className="card"><div className="k">Cash attendu (tiroir)</div><div className="v ok">{mad(current.expectedMAD)}</div>
          <div className="sub">calculé depuis les paiements liés à la session</div></div>
        <div className="card"><div className="k">Mouvements de la session</div><div className="v">{current.cashPayments.length}</div></div>
      </div>

      {current.session?.status === 'OPEN' && <CloseSession sessionId={current.session.id} expected={current.expectedMAD} />}

      <h2>Derniers paiements (immuables)</h2>
      <table className="tbl">
        <thead><tr><th>Heure</th><th>Sens</th><th>Mode</th><th>Montant</th><th>Équiv. MAD</th><th>Note</th></tr></thead>
        <tbody>{payments.map((p) => (
          <tr key={p.id} className={p.method === 'REFUND' ? 'pending' : ''}>
            <td>{fmt(p.receivedAt)}</td>
            <td><span className={`pill ${p.direction === 'IN' ? 'ok' : 'danger'}`}>{p.direction}</span></td>
            <td>{p.method}{p.reversesPaymentId ? ' (annulation)' : ''}</td>
            <td className="mono">{new Intl.NumberFormat('fr-MA').format(Number(p.amount) / 100)} {p.currency}{p.fxRate ? ` @ ${p.fxRate}` : ''}</td>
            <td className="mono">{p.currency === 'MAD' ? '' : mad(p.madEquivalent)}</td>
            <td className="sub">{p.note ?? p.purpose ?? ''}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

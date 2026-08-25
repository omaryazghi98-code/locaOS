import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import ContractBlankPrintButton from '@/components/ContractBlankPrintButton';

interface C { id: string; number: number; status: string; language: string; customerName: string; plate: string | null; blankIssuedAt: string | null }

export default async function Contracts() {
  const list = await apiFetch<C[]>('/api/contracts');
  const cookieStore = await cookies();
  const rawLang = cookieStore.get('locaos-lang')?.value;
  const language = rawLang === 'ar' ? 'ar' : rawLang === 'en' ? 'en' : 'fr';

  return (
    <div>
      <div className="topbar"><div><h1>Contrats</h1>
        <div className="sub">Moteur structuré — contenu = données, jamais du HTML assemblé à la main. Numérotation par agence (sans trous invisibles).</div></div>
        <ContractBlankPrintButton language={language} />
      </div>
      <table className="tbl">
        <thead><tr><th>N°</th><th>Statut</th><th>Langue</th><th>Client</th><th>Véhicule</th><th></th></tr></thead>
        <tbody>{list.map((c) => (
          <tr key={c.id} className={c.status === 'VOIDED' ? 'pending' : ''}>
            <td className="mono"><Link href={`/contracts/${c.id}`}>#{String(c.number).padStart(5, '0')}</Link></td>
            <td><span className={`pill ${c.status === 'ACTIVE' ? 'ok' : c.status === 'BLANK_ISSUED' ? 'warn' : c.status === 'VOIDED' ? 'muted' : 'info'}`}>{c.status}</span></td>
            <td>{c.language.toUpperCase()}</td>
            <td>{c.customerName ?? '— (vierge)'}</td>
            <td className="mono">{c.plate ?? '—'}</td>
            <td><a className="btn mini" href={`/api/contracts/${c.id}/pdf`} target="_blank" rel="noreferrer">PDF</a></td>
          </tr>
        ))}</tbody>
      </table>
      <div className="sub" style={{ marginTop: 10 }}>
        « Contrat vierge » = papier pré-numéroté traçable : à réconcilier avec une réservation, ou à annuler avec motif — les écarts de séquence sont visibles.
      </div>
    </div>
  );
}

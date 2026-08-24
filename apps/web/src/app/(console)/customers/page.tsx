import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface C { id: string; firstName: string | null; lastName: string | null; companyName: string | null; phone: string; email: string | null; segment: string }

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const list = await apiFetch<C[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  return (
    <div>
      <div className="topbar"><div><h1>Clients</h1><div className="sub">{list.length} clients — CIN/passestock chiffrés au repos (AES-256-GCM)</div></div></div>
      <table className="tbl">
        <thead><tr><th>Nom</th><th>Téléphone</th><th>Segment</th><th>E-mail</th></tr></thead>
        <tbody>{list.map((c) => (
          <tr key={c.id}>
            <td><Link href={`/customers/${c.id}`}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</Link></td>
            <td className="mono">{c.phone}</td>
            <td><span className="pill info">{c.segment}</span></td>
            <td>{c.email ?? '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

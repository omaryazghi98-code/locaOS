import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Intake {
  id: string;
  document_id: string;
  source_document_kind: string;
  entity_type: string | null;
  entity_id: string | null;
  document_family: string;
  status: string;
  provider: string | null;
  created_at: string;
}

export default async function DocumentIntelligenceQueue() {
  const intakes = await apiFetch<Intake[]>('/api/document-intelligence/intakes');

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Intelligence documentaire</h1>
          <div className="sub">File de revue · OCR, extraction et confirmation humaine</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="sub">Le moteur documentaire prépare des candidats ; la donnée métier reste sous contrôle du domaine et de l'opérateur.</div>
      </div>

      {intakes.length === 0 ? (
        <div className="card"><div className="sub">Aucun document en cours de traitement.</div></div>
      ) : (
        <table className="tbl">
          <thead><tr><th>Document</th><th>Famille</th><th>Statut</th><th>Provider</th><th>Créé</th><th /></tr></thead>
          <tbody>{intakes.map((intake) => (
            <tr key={intake.id}>
              <td><div className="mono">{intake.source_document_kind}</div><div className="sub mono">{intake.document_id}</div></td>
              <td>{intake.document_family}</td>
              <td><span className={`pill ${intake.status === 'CONFIRMED' ? 'ok' : intake.status === 'FAILED' ? 'danger' : 'info'}`}>{intake.status}</span></td>
              <td className="mono">{intake.provider ?? '—'}</td>
              <td>{new Intl.DateTimeFormat('fr-MA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(intake.created_at))}</td>
              <td><Link className="btn mini" href={`/document-intelligence/intakes/${intake.id}`}>Ouvrir la revue</Link></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

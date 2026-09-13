import { apiFetch } from '@/lib/api';
import ActionButton from '@/components/ActionButton';

interface Task {
  id: string;
  vehicle_id: string;
  plate: string;
  task_kind: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignee_name: string;
  reservation_id: string | null;
  source_inspection_id: string | null;
  created_at: string;
  completed_at: string | null;
}

const LABELS: Record<string, string> = {
  PREPARATION_REVIEW: 'Revue préparation',
  CLEANING: 'Nettoyage',
  MAINTENANCE: 'Maintenance',
  QA: 'Contrôle qualité',
  OPEN: 'Ouverte',
  ASSIGNED: 'Assignée',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

const fmt = (s: string) => new Intl.DateTimeFormat('fr-MA', {
  timeZone: 'Africa/Casablanca', dateStyle: 'short', timeStyle: 'short',
}).format(new Date(s));

export default async function OperationsPage() {
  const tasks = await apiFetch<Task[]>('/api/ops/tasks');
  const open = tasks.filter((t) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED'].includes(t.status));
  const reviews = open.filter((t) => t.task_kind === 'PREPARATION_REVIEW');
  const work = open.filter((t) => t.task_kind !== 'PREPARATION_REVIEW');

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Opérations</h1>
          <div className="sub">Travaux post-retour · préparation · nettoyage · maintenance · QA</div>
        </div>
        <div className="btnrow">
          <span className={`pill ${open.length ? 'warn' : 'ok'}`}>{open.length} ouverte(s)</span>
        </div>
      </div>

      <div className="grid cards">
        <div className="card"><div className="k">À trier</div><div className="v">{reviews.length}</div></div>
        <div className="card"><div className="k">Travaux ouverts</div><div className="v">{work.length}</div></div>
        <div className="card"><div className="k">Blocages</div><div className="v">{open.filter((t) => t.status === 'BLOCKED').length}</div></div>
      </div>

      {reviews.length > 0 && <>
        <h2>Revues de préparation post-retour</h2>
        {reviews.map((t) => (
          <div className="card" key={t.id} style={{ marginBottom: 10 }}>
            <div className="topbar" style={{ marginBottom: 8 }}>
              <div>
                <div className="mono"><strong>{t.plate}</strong> · {LABELS[t.task_kind] ?? t.task_kind}</div>
                <div>{t.title}</div>
                <div className="sub">Créée {fmt(t.created_at)}{t.description ? ` · ${t.description}` : ''}</div>
              </div>
              <span className={`pill ${t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : 'warn'}`}>{t.priority}</span>
            </div>
            <div className="sub" style={{ marginBottom: 8 }}>
              Une revue doit être triée avant que le véhicule puisse redevenir disponible.
            </div>
            <div className="btnrow">
              <ActionButton path={`/api/ops/tasks/${t.id}/triage-return`} body={{ cleaningNeeded: false, maintenanceNeeded: false }} label="Aucun travail → disponible" variant="primary" confirmText="Confirmer qu'aucun travail supplémentaire n'est requis ?" />
              <ActionButton path={`/api/ops/tasks/${t.id}/triage-return`} body={{ cleaningNeeded: true, maintenanceNeeded: false }} label="Nettoyage" />
              <ActionButton path={`/api/ops/tasks/${t.id}/triage-return`} body={{ cleaningNeeded: false, maintenanceNeeded: true }} label="Maintenance" variant="danger" />
              <ActionButton path={`/api/ops/tasks/${t.id}/triage-return`} body={{ cleaningNeeded: true, maintenanceNeeded: true }} label="Nettoyage + maintenance" variant="danger" />
            </div>
          </div>
        ))}
      </>}

      <h2>Travaux ouverts</h2>
      {work.length === 0 ? <div className="card sub">Aucun travail ouvert.</div> : (
        <table className="tbl">
          <thead><tr><th>Véhicule</th><th>Type</th><th>Statut</th><th>Priorité</th><th>Assigné</th><th>Créée</th><th>Action</th></tr></thead>
          <tbody>{work.map((t) => (
            <tr key={t.id}>
              <td className="mono">{t.plate}</td>
              <td>{LABELS[t.task_kind] ?? t.task_kind}</td>
              <td>{LABELS[t.status] ?? t.status}</td>
              <td>{t.priority}</td>
              <td>{t.assignee_name || '—'}</td>
              <td>{fmt(t.created_at)}</td>
              <td>
                {t.status === 'OPEN' && <ActionButton path={`/api/ops/tasks/${t.id}/update`} body={{ status: 'IN_PROGRESS' }} label="Démarrer" />}
                {t.status === 'IN_PROGRESS' && <ActionButton path={`/api/ops/tasks/${t.id}/update`} body={{ status: 'COMPLETED', completionNote: 'Travail terminé — à contrôler.' }} label="Terminer" variant="primary" confirmText="Confirmer la fin de cette tâche ?" />}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <div className="sub" style={{ marginTop: 12 }}>
        Règle de sécurité : une inspection retour crée la revue de préparation. Un agent ne peut pas libérer directement INSPECTED → AVAILABLE ; la remise en disponibilité passe par le workflow opérations et reste journalisée.
      </div>
    </div>
  );
}

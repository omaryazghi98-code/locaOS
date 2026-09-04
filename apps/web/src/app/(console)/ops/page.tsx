import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { NaviAction } from '@/components/navi/NaviAction';
import StatusBadge from '@/components/StatusBadge';

interface Task {
  id: string; vehicle_id: string; plate: string; task_kind: string; title: string; description: string | null;
  priority: string; status: string; assignee_name: string; reservation_id: string | null; source_inspection_id: string | null;
  created_at: string; completed_at: string | null;
}

const LABELS: Record<string, string> = {
  PREPARATION_REVIEW: 'Revue préparation', CLEANING: 'Nettoyage', MAINTENANCE: 'Maintenance', QA: 'Contrôle qualité',
  OPEN: 'Ouverte', ASSIGNED: 'Assignée', IN_PROGRESS: 'En cours', BLOCKED: 'Bloquée', COMPLETED: 'Terminée', CANCELLED: 'Annulée',
};
const fmt = (s: string) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'short', timeStyle: 'short' }).format(new Date(s));

export default async function OperationsPage() {
  const tasks = await apiFetch<Task[]>('/api/ops/tasks');
  const open = tasks.filter((t) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED'].includes(t.status));
  const reviews = open.filter((t) => t.task_kind === 'PREPARATION_REVIEW');
  const work = open.filter((t) => t.task_kind !== 'PREPARATION_REVIEW');
  const qa = work.filter((t) => t.task_kind === 'QA');

  return (
    <div className="navi">
      <div className="topbar">
        <div><h1>Opérations</h1><div className="sub">Travaux post-retour · préparation · nettoyage · maintenance · QA</div></div>
        <div className="btnrow"><span className={`pill ${open.length ? 'warn' : 'ok'}`}>{open.length} ouverte(s)</span><Link className="btn mini" href="/navi">Ouvrir NAVI</Link></div>
      </div>

      <div className="navi-grid-3">
        <div className="nv-panel elev-2"><div className="nv-panel-head"><div><div className="nv-eyebrow">Post-retour</div><h2 className="nv-panel-title">À trier</h2></div></div><div className="nv-panel-body"><div className="nv-display nv-num">{reviews.length}</div><div className="nv-panel-hint">Revues de préparation ouvertes</div></div></div>
        <div className="nv-panel"><div className="nv-panel-head"><div><div className="nv-eyebrow">Exécution</div><h2 className="nv-panel-title">Travaux ouverts</h2></div></div><div className="nv-panel-body"><div className="nv-display nv-num">{work.length}</div><div className="nv-panel-hint">Nettoyage, maintenance et QA</div></div></div>
        <div className="nv-panel"><div className="nv-panel-head"><div><div className="nv-eyebrow">Contrôle</div><h2 className="nv-panel-title">QA en attente</h2></div></div><div className="nv-panel-body"><div className="nv-display nv-num">{qa.length}</div><div className="nv-panel-hint">Le véhicule reste bloqué jusqu'au contrôle</div></div></div>
      </div>

      {reviews.length > 0 && <section className="nv-panel elev-2">
        <div className="nv-panel-head"><div><h2 className="nv-panel-title">Revue de préparation post-retour</h2><div className="nv-panel-hint">Une revue doit être triée avant toute remise en disponibilité.</div></div><Link className="nv-link" href="/navi#navi-pipeline">Voir dans NAVI ↗</Link></div>
        <div className="nv-panel-body">
          <div className="navi-col">{reviews.map((t) => <div className="card" key={t.id} style={{ margin: 0 }}>
            <div className="topbar" style={{ marginBottom: 8 }}><div><div className="mono"><strong>{t.plate}</strong> · {LABELS[t.task_kind] ?? t.task_kind}</div><div>{t.title}</div><div className="sub">Créée {fmt(t.created_at)}{t.description ? ` · ${t.description}` : ''}</div></div><span className={`pill ${t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : 'warn'}`}>{t.priority}</span></div>
            <div className="btnrow">
              <NaviAction path={`/api/ops/tasks/${t.id}/triage-return`} body={{ cleaningNeeded: false, maintenanceNeeded: false }} label="Aucun travail → disponible" variant="primary" confirm="Confirmer qu'aucun travail supplémentaire n'est requis ?" />
              <NaviAction path={`/api/ops/tasks/${t.id}/triage-return`} body={{ cleaningNeeded: true, maintenanceNeeded: false }} label="Nettoyage" />
              <NaviAction path={`/api/ops/tasks/${t.id}/triage-return`} body={{ cleaningNeeded: false, maintenanceNeeded: true }} label="Maintenance" variant="danger" />
              <NaviAction path={`/api/ops/tasks/${t.id}/triage-return`} body={{ cleaningNeeded: true, maintenanceNeeded: true }} label="Nettoyage + maintenance" variant="danger" />
            </div>
          </div>)}</div>
        </div>
      </section>}

      <section className="nv-panel">
        <div className="nv-panel-head"><div><h2 className="nv-panel-title">Travaux ouverts</h2><div className="nv-panel-hint">Chaque tâche terminée reste soumise au workflow de contrôle avant libération.</div></div></div>
        <div className="nv-panel-body flush">
          {work.length === 0 ? <div className="card sub" style={{ margin: 16 }}>Aucun travail ouvert.</div> : <div style={{ overflowX: 'auto' }}><table className="tbl"><thead><tr><th>Véhicule</th><th>Type</th><th>Statut</th><th>Priorité</th><th>Assigné</th><th>Créée</th><th>Action</th></tr></thead><tbody>{work.map((t) => <tr key={t.id}>
            <td className="mono"><Link href={`/fleet/${t.vehicle_id}`}>{t.plate}</Link></td><td>{LABELS[t.task_kind] ?? t.task_kind}</td><td><StatusBadge status={t.task_kind === 'QA' ? 'QA' : t.status} /></td><td>{t.priority}</td><td>{t.assignee_name || '—'}</td><td>{fmt(t.created_at)}</td><td>
              {t.status === 'OPEN' && <NaviAction path={`/api/ops/tasks/${t.id}/update`} body={{ status: 'IN_PROGRESS' }} label="Démarrer" />}
              {t.status === 'ASSIGNED' && <NaviAction path={`/api/ops/tasks/${t.id}/update`} body={{ status: 'IN_PROGRESS' }} label="Démarrer" />}
              {t.status === 'IN_PROGRESS' && <NaviAction path={`/api/ops/tasks/${t.id}/update`} body={{ status: 'COMPLETED' }} label={t.task_kind === 'QA' ? 'Valider QA' : 'Terminer'} variant="primary" prompt={{ label: t.task_kind === 'QA' ? 'Note de contrôle (obligatoire)' : 'Note de fin (obligatoire)', field: 'completionNote', required: true }} confirm={t.task_kind === 'QA' ? 'Confirmer la validation QA ?' : 'Confirmer la fin de cette tâche ?'} />}
            </td>
          </tr>)}</tbody></table></div>}
        </div>
      </section>

      <div className="nv-pipe-note"><span>Règle de sécurité :</span> une inspection retour crée la revue de préparation. INSPECTED → AVAILABLE ne peut pas être libéré directement par un agent ; la remise en disponibilité passe par les opérations et reste journalisée.</div>
    </div>
  );
}

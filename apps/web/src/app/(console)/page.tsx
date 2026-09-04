import Link from 'next/link';
import { UI_STRINGS } from '@locaos/domain/i18n';
import { apiFetch } from '@/lib/api';

interface CC {
  happening: { activeRentals: number; available: number; fleetSize: number; departuresToday: number; returnsToday: number; utilizationPct: number; revenue30Mad: string; outstandingMad: string };
  wrong: { overdue: { id: string; plate: string }[]; unavailable: { id: string; plate: string; status: string }[]; openCritical: number; openHigh: number };
  willGoWrong: { branchMismatches: { id: string; reference: string; plate: string | null }[]; unassignedTomorrow: number; docsExpiring: { type: string; n: number }[]; pendingTransfers: number };
  actions: { priority: number; kind: string; label: string; href: string; reason: string }[];
}
const mad = (v?: string) => new Intl.NumberFormat('fr-MA').format(Number(v ?? 0) / 100) + ' MAD';
export default async function CommandCenter() {
  const c = await apiFetch<CC>('/api/ops/command-center'); const h = c.happening;
  const lang = 'fr'; const k = UI_STRINGS.COMMAND_KPIS;
  const NO_ACTIONS = 'Aucune action prioritaire'; const SEE_ALERTS = 'Voir les alertes'; const utilizationLabel = '% de la flotte';
  return <div className="navi">
    <div className="topbar"><div><div className="nv-eyebrow">LOCAOS · COMMAND CENTER</div><h1>{UI_STRINGS.COMMAND_CENTER[lang]}</h1><div className="sub">Atlas Rent SARL (démo)</div></div><Link className="btn mini primary" href="/navi">Ouvrir NAVI</Link></div>

    <section className="navi-grid-3">
      <div className="nv-panel elev-2"><div className="nv-panel-head"><div><div className="nv-eyebrow">Exploitation</div><h2 className="nv-panel-title">{k.activeRentals[lang]}</h2></div></div><div className="nv-panel-body"><div className="nv-display nv-num">{h.activeRentals}</div><div className="nv-panel-hint">{h.utilizationPct}{utilizationLabel} · {h.fleetSize} véhicules</div></div></div>
      <div className="nv-panel"><div className="nv-panel-head"><div><div className="nv-eyebrow">Disponibilité</div><h2 className="nv-panel-title">{k.available[lang]}</h2></div></div><div className="nv-panel-body"><div className="nv-display nv-num">{h.available}</div><div className="nv-panel-hint">Véhicules disponibles maintenant</div></div></div>
      <div className="nv-panel"><div className="nv-panel-head"><div><div className="nv-eyebrow">Aujourd'hui</div><h2 className="nv-panel-title">{k.departuresReturns[lang]}</h2></div></div><div className="nv-panel-body"><div className="nv-display nv-num">{h.departuresToday} / {h.returnsToday}</div><div className="nv-panel-hint">Départs / retours</div></div></div>
    </section>
    <section className="navi-two">
      <div className="nv-panel"><div className="nv-panel-head"><div><div className="nv-eyebrow">Finance · 30 jours</div><h2 className="nv-panel-title">{k.revenue30[lang]}</h2></div></div><div className="nv-panel-body"><div className="nv-display nv-num">{mad(h.revenue30Mad)}</div></div></div>
      <div className="nv-panel"><div className="nv-panel-head"><div><div className="nv-eyebrow">Finance · à recouvrer</div><h2 className="nv-panel-title">{k.outstanding[lang]}</h2></div></div><div className="nv-panel-body"><div className={`nv-display nv-num ${Number(h.outstandingMad) > 0 ? 'warn' : 'ok'}`}>{mad(h.outstandingMad)}</div></div></div>
    </section>

    <div className="navi-grid">
      <section className="nv-panel elev-2"><div className="nv-panel-head"><div><h2 className="nv-panel-title">Alertes</h2><div className="nv-panel-hint">Ce qui exige une attention opérationnelle.</div></div><Link className="nv-link" href="/alerts">{SEE_ALERTS} ↗</Link></div><div className="nv-panel-body"><div className="navi-col">
        {c.wrong.overdue.length === 0 && c.wrong.unavailable.length === 0 && c.wrong.openCritical === 0 && <div className="sub">Rien de critique. ✓</div>}
        {c.wrong.overdue.map((v) => <div key={v.id} className="alert CRITICAL"><div className="t">Retard — {v.plate}</div><div className="m">Contrat échu, véhicule non restitué</div></div>)}
        {c.wrong.unavailable.map((v) => <div key={v.id} className="alert ATTENTION"><div className="t">{v.plate} — Statut opérationnel : {v.status}</div></div>)}
        {(c.wrong.openCritical > 0 || c.wrong.openHigh > 0) && <div className="alert ATTENTION"><div className="t">{c.wrong.openCritical} CRITIQUE · {c.wrong.openHigh} HAUTE</div><div className="m"><Link href="/alerts">Voir les alertes</Link></div></div>}
      </div></div></section>

      <section className="nv-panel"><div className="nv-panel-head"><div><h2 className="nv-panel-title">Ce qui va mal tourner</h2><div className="nv-panel-hint">Risques déjà détectés par les règles opérationnelles.</div></div></div><div className="nv-panel-body"><div className="navi-col">
        {c.willGoWrong.branchMismatches.map((m) => <div key={m.id} className="alert ATTENTION"><div className="t">{m.plate ?? 'Véhicule'} — requis sur une autre agence</div><div className="m">Réservation {m.reference} imminente · transfert recommandé (exécution humaine)</div></div>)}
        {c.willGoWrong.unassignedTomorrow > 0 && <div className="alert ATTENTION"><div className="t">{c.willGoWrong.unassignedTomorrow} départ(s) ≤48h sans véhicule</div></div>}
        {c.willGoWrong.docsExpiring.map((d) => <div key={d.type} className="alert ATTENTION"><div className="t">{d.n} document(s) {d.type} expirent sous 30 j</div></div>)}
        {c.willGoWrong.pendingTransfers > 0 && <div className="sub">{c.willGoWrong.pendingTransfers} transfert(s) recommandé(s) en attente — voir <Link href="/navi">Aujourd'hui dans NAVI</Link>.</div>}
        {c.willGoWrong.branchMismatches.length === 0 && c.willGoWrong.unassignedTomorrow === 0 && c.willGoWrong.docsExpiring.length === 0 && <div className="sub">Risque anticipé : rien de signalé.</div>}
      </div></div></section>
    </div>

    <section className="nv-panel"><div className="nv-panel-head"><div><h2 className="nv-panel-title">Quoi faire · priorisé</h2><div className="nv-panel-hint">Actions existantes, exécutées par leurs endpoints autoritatifs.</div></div></div><div className="nv-panel-body"><div className="navi-col">
      {c.actions.length === 0 && <div className="sub">{NO_ACTIONS}</div>}
      {c.actions.map((a, i) => <div key={i} className={`alert ${a.priority === 1 ? 'CRITICAL' : 'ATTENTION'}`}><div className="t"><Link href={a.href}>{a.label}</Link></div><div className="m">{a.reason}</div><div className="sub">Priorité {a.priority === 1 ? 'immédiate' : a.priority === 2 ? "aujourd'hui" : 'cette semaine'} · {a.kind}</div></div>)}
    </div></div></section>
    <div className="nv-pipe-note">NAVI est le centre opérationnel : <Link href="/navi">ouvrir la vue complète</Link> pour le pipeline post-retour, la flotte, les opérations et la timeline.</div>
  </div>;
}

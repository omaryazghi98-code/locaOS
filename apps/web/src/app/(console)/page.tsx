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
  const c = await apiFetch<CC>('/api/ops/command-center');
  const h = c.happening;
  const cookieMatch = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)locaos-lang=([^;]+)/) : null;
  const lang = cookieMatch?.[1] === 'ar' ? 'ar' : 'fr';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const NO_ACTIONS = lang === 'ar' ? 'AUCUNE ACTION PRIORITAIRE' : 'No priority actions';
  const SEE_ALERTS = lang === 'ar' ? 'Voir alertes' : 'See alerts';
  const PRIORITE_1 = 'immédiate';
  const PRIORITE_2 = 'aujourd hui';
  const PRIORITE_3 = 'cette semaine';

  return (
    <div dir={dir}>
      <div className="topbar"><div>
        <h1>{UI_STRINGS.COMMAND_CENTER[lang] ?? UI_STRINGS.COMMAND_CENTER.fr}</h1>
        <div className="sub">{UI_STRINGS.LOGIN[lang] ?? UI_STRINGS.LOGIN.fr}: Atlas Rent SARL (démo)</div>
      </div></div>

      <div className="grid cards">
        <div className="card"><div className="k">{UI_STRINGS.MAIN_NAV.fr[0]}</div><div className="v">{h.activeRentals}</div><div className="sub">{h.utilizationPct}% de la flotte ({h.fleetSize})</div></div>
        <div className="card"><div className="v ok">{h.available}</div></div>
        <div className="card"><div className="k">{UI_STRINGS.MAIN_NAV.fr[4]}</div><div className="v">{h.departuresToday} / {h.returnsToday}</div></div>
        <div className="card"><div className="k">{UI_STRINGS.MAIN_NAV.fr[10]}</div><div className="v">{mad(h.revenue30Mad)}</div></div>
        <div className="card"><div className={Number(h.outstandingMad) > 0 ? 'warn' : 'ok'}>{mad(h.outstandingMad)}</div></div>
      </div>

      <div className="grid cols2">
        <div>
          <h2>{UI_STRINGS.MAIN_NAV.fr[12]}</h2>
          {c.wrong.overdue.length === 0 && c.wrong.unavailable.length === 0 && c.wrong.openCritical === 0 && <div className="sub">Rien de critique. ✓</div>}
          {c.wrong.overdue.map((v) => <div key={v.id} className="alert CRITICAL"><div className="t">Retard — {v.plate}</div><div className="m">Contrat échu, véhicule non restitué</div></div>)}
          {c.wrong.unavailable.map((v) => <div key={v.id} className="alert ATTENTION"><div className="t">{v.plate} — {v.status}</div></div>)}
          {(c.wrong.openCritical > 0 || c.wrong.openHigh > 0) && (
            <div className="alert ATTENTION"><div className="t">{c.wrong.openCritical} alerte(s) CRITIQUE · {c.wrong.openHigh} HAUTE</div><div className="m"><a href="/alerts">{SEE_ALERTS}</a></div></div>
          )}

          <h2>🔮 Ce qui va mal tourner</h2>
          {c.willGoWrong.branchMismatches.map((m) => (
            <div key={m.id} className="alert ATTENTION"><div className="t">{m.plate} — requis sur une autre agence</div><div className="m">Reservation {m.reference} imminente · transfert recommandé (exécution humaine)</div></div>
          ))}
          {c.willGoWrong.unassignedTomorrow > 0 && <div className="alert ATTENTION"><div className="t">{c.willGoWrong.unassignedTomorrow} départ(s) ≤48h sans véhicule</div></div>}
          {c.willGoWrong.docsExpiring.map((d) => <div key={d.type} className="alert ATTENTION"><div className="t">{d.n} document(s) {d.type} expirent sous 30 j</div></div>)}
          {c.willGoWrong.pendingTransfers > 0 && <div className="sub">{c.willGoWrong.pendingTransfers} transfert(s) recommandé(s) en attente — voir Aujourd'hui.</div>}
          {c.willGoWrong.branchMismatches.length === 0 && c.willGoWrong.unassignedTomorrow === 0 && c.willGoWrong.docsExpiring.length === 0 && <div className="sub">Risque anticipé: rien de signalé.</div>}
        </div>

        <div>
          <h2>✅ Quoi faire (priorisé)</h2>
          {c.actions.length === 0 && <div className="sub">{NO_ACTIONS}</div>}
          {c.actions.map((a, i) => (
            <div key={i} className={`alert ${a.priority === 1 ? 'CRITICAL' : 'ATTENTION'}`}>
              <div className="t"><a href={a.href}>{a.label}</a></div>
              <div className="m">{a.reason}</div>
              <div className="sub">priorité {a.priority === 1 ? PRIORITE_1 : a.priority === 2 ? PRIORITE_2 : PRIORITE_3} · {a.kind}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sub" style={{ marginTop: 14 }}>
        Brief détaillé: <a href="/brief?scope=morning">matin</a> · <a href="/brief?scope=eod">fin de journée</a>.
      </div>
    </div>
  );
}

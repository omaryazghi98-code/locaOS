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
  const lang = cookieMatch?.[1] === 'ar' ? 'ar' : cookieMatch?.[1] === 'en' ? 'en' : 'fr';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const k = UI_STRINGS.COMMAND_KPIS;

  const NO_ACTIONS = lang === 'ar' ? 'لا توجد إجراءات ذات أولوية' : lang === 'en' ? 'No priority actions' : 'Aucune action prioritaire';
  const SEE_ALERTS = lang === 'ar' ? 'عرض التنبيهات' : lang === 'en' ? 'See alerts' : 'Voir les alertes';
  const utilizationLabel = lang === 'ar' ? '% من الأسطول' : lang === 'en' ? '% of fleet' : '% de la flotte';
  const priority1 = lang === 'ar' ? 'فورية' : lang === 'en' ? 'immediate' : 'immédiate';
  const priority2 = lang === 'ar' ? 'اليوم' : lang === 'en' ? 'today' : "aujourd'hui";
  const priority3 = lang === 'ar' ? 'هذا الأسبوع' : lang === 'en' ? 'this week' : 'cette semaine';
  const operational = lang === 'ar' ? 'الحالة التشغيلية' : lang === 'en' ? 'Operational status' : 'Statut opérationnel';

  return (
    <div dir={dir}>
      <div className="topbar"><div>
        <h1>{UI_STRINGS.COMMAND_CENTER[lang] ?? UI_STRINGS.COMMAND_CENTER.fr}</h1>
        <div className="sub">{UI_STRINGS.LOGIN[lang] ?? UI_STRINGS.LOGIN.fr}: Atlas Rent SARL (démo)</div>
      </div></div>

      <div className="grid cards">
        <div className="card"><div className="k">{k.activeRentals[lang]}</div><div className="v">{h.activeRentals}</div><div className="sub">{h.utilizationPct}{utilizationLabel} ({h.fleetSize})</div></div>
        <div className="card"><div className="k">{k.available[lang]}</div><div className="v ok">{h.available}</div></div>
        <div className="card"><div className="k">{k.departuresReturns[lang]}</div><div className="v">{h.departuresToday} / {h.returnsToday}</div></div>
        <div className="card"><div className="k">{k.revenue30[lang]}</div><div className="v">{mad(h.revenue30Mad)}</div></div>
        <div className="card"><div className="k">{k.outstanding[lang]}</div><div className={Number(h.outstandingMad) > 0 ? 'warn v' : 'ok v'}>{mad(h.outstandingMad)}</div></div>
      </div>

      <div className="grid cols2">
        <div>
          <h2>{lang === 'ar' ? 'التنبيهات' : lang === 'en' ? 'Alerts' : 'Alertes'}</h2>
          {c.wrong.overdue.length === 0 && c.wrong.unavailable.length === 0 && c.wrong.openCritical === 0 && <div className="sub">{lang === 'ar' ? 'لا يوجد شيء حرج. ✓' : lang === 'en' ? 'Nothing critical. ✓' : 'Rien de critique. ✓'}</div>}
          {c.wrong.overdue.map((v) => <div key={v.id} className="alert CRITICAL"><div className="t">{lang === 'ar' ? `تأخير — ${v.plate}` : lang === 'en' ? `Overdue — ${v.plate}` : `Retard — ${v.plate}`}</div><div className="m">{lang === 'ar' ? 'العقد منتهٍ والسيارة لم تُعد' : lang === 'en' ? 'Contract expired; vehicle not returned' : 'Contrat échu, véhicule non restitué'}</div></div>)}
          {c.wrong.unavailable.map((v) => <div key={v.id} className="alert ATTENTION"><div className="t">{v.plate} — {operational}: {v.status}</div></div>)}
          {(c.wrong.openCritical > 0 || c.wrong.openHigh > 0) && (
            <div className="alert ATTENTION"><div className="t">{c.wrong.openCritical} {lang === 'ar' ? 'حرج' : lang === 'en' ? 'CRITICAL' : 'CRITIQUE'} · {c.wrong.openHigh} {lang === 'ar' ? 'مرتفع' : lang === 'en' ? 'HIGH' : 'HAUTE'}</div><div className="m"><a href="/alerts">{SEE_ALERTS}</a></div></div>
          )}

          <h2>🔮 {lang === 'ar' ? 'ما الذي قد يسوء' : lang === 'en' ? 'What may go wrong' : 'Ce qui va mal tourner'}</h2>
          {c.willGoWrong.branchMismatches.map((m) => (
            <div key={m.id} className="alert ATTENTION"><div className="t">{m.plate} — {lang === 'ar' ? 'مطلوب في وكالة أخرى' : lang === 'en' ? 'Required at another branch' : 'Requis sur une autre agence'}</div><div className="m">{lang === 'ar' ? `الحجز ${m.reference} قريب · تحويل موصى به (تنفيذ بشري)` : lang === 'en' ? `Reservation ${m.reference} imminent · transfer recommended (human execution)` : `Réservation ${m.reference} imminente · transfert recommandé (exécution humaine)`}</div></div>
          ))}
          {c.willGoWrong.unassignedTomorrow > 0 && <div className="alert ATTENTION"><div className="t">{c.willGoWrong.unassignedTomorrow} {lang === 'ar' ? 'مغادرة خلال 48 ساعة بدون سيارة' : lang === 'en' ? 'departure(s) ≤48h without vehicle' : 'départ(s) ≤48h sans véhicule'}</div></div>}
          {c.willGoWrong.docsExpiring.map((d) => <div key={d.type} className="alert ATTENTION"><div className="t">{d.n} {lang === 'ar' ? `وثيقة ${d.type} تنتهي خلال 30 يومًا` : lang === 'en' ? `${d.n} ${d.type} document(s) expire within 30 days` : `document(s) ${d.type} expirent sous 30 j`}</div></div>)}
          {c.willGoWrong.pendingTransfers > 0 && <div className="sub">{c.willGoWrong.pendingTransfers} {lang === 'ar' ? 'تحويلات موصى بها معلقة — راجع اليوم.' : lang === 'en' ? "recommended transfer(s) pending — see Today's view." : "transfert(s) recommandé(s) en attente — voir Aujourd'hui."}</div>}
          {c.willGoWrong.branchMismatches.length === 0 && c.willGoWrong.unassignedTomorrow === 0 && c.willGoWrong.docsExpiring.length === 0 && <div className="sub">{lang === 'ar' ? 'المخاطر المتوقعة: لا شيء مُبلّغ عنه.' : lang === 'en' ? 'Anticipated risk: nothing flagged.' : 'Risque anticipé : rien de signalé.'}</div>}
        </div>

        <div>
          <h2>✅ {lang === 'ar' ? 'ماذا يجب أن نفعل (بالأولوية)' : lang === 'en' ? 'What to do (prioritized)' : 'Quoi faire (priorisé)'}</h2>
          {c.actions.length === 0 && <div className="sub">{NO_ACTIONS}</div>}
          {c.actions.map((a, i) => (
            <div key={i} className={`alert ${a.priority === 1 ? 'CRITICAL' : 'ATTENTION'}`}>
              <div className="t"><a href={a.href}>{a.label}</a></div>
              <div className="m">{a.reason}</div>
              <div className="sub">{lang === 'ar' ? 'الأولوية' : lang === 'en' ? 'Priority' : 'Priorité'} {a.priority === 1 ? priority1 : a.priority === 2 ? priority2 : priority3} · {a.kind}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sub" style={{ marginTop: 14 }}>
        {lang === 'ar' ? 'الموجز المفصل' : lang === 'en' ? 'Detailed brief' : 'Brief détaillé'}: <a href="/brief?scope=morning">{lang === 'ar' ? 'الصباح' : lang === 'en' ? 'morning' : 'matin'}</a> · <a href="/brief?scope=eod">{lang === 'ar' ? 'نهاية اليوم' : lang === 'en' ? 'end of day' : 'fin de journée'}</a>.
      </div>
    </div>
  );
}

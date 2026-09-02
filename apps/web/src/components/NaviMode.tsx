'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Bot, CalendarClock, CheckCircle2, ChevronRight, CircleGauge, Clock3, CreditCard, Sparkles, Wrench, CarFront } from 'lucide-react';
import { clientApiFetch } from '@/lib/client-api';
import { LANGUAGE_EVENT, readLocale, type Locale } from '@/lib/client-preferences';

type Brief = {
  day: string;
  departures: number;
  returns: number;
  tomorrowDepartures: number;
  utilizationPct: number;
  fleetSize: number;
  expectedCashMad?: string;
  cashInTodayMad?: string;
  depositsHeldMad: string;
  overdueRentals: { id: string; plate: string }[];
  vehiclesRequiringAttention: { id: string; plate: string; status: string }[];
  criticalAlerts: { id: string; title?: string; message?: string; severity: string }[];
  attentionAlerts: { id: string; title?: string; message?: string; severity: string }[];
};

type Focus = {
  pickups: { reservationId: string; customerName: string; plate: string | null; categoryName: string; pickupAt: string; contractId: string | null; contractStatus: string | null; blockers: string[] }[];
  returns: { reservationId: string; customerName: string; plate: string | null; categoryName: string; returnAt: string; contractId: string | null; contractStatus: string | null; returnInspectionDone: boolean }[];
  overdueTasks: { reservationId: string; customerName: string; blockers: string[] }[];
  unresolvedBlockers: string[];
  inspectionsPending: boolean;
  contractActions: { id: string; reservationId: string; customerName: string; href: string }[];
};

const fr = {
  eyebrow: 'Centre opérationnel',
  greeting: 'Bonjour. Voici ce qui compte aujourd’hui.',
  live: 'Données en direct',
  departures: 'Départs',
  returns: 'Retours',
  utilization: 'Utilisation',
  fleet: 'Flotte',
  attention: 'À vous',
  risk: 'Risques détectés',
  tomorrow: 'Demain',
  tomorrowHint: 'départs prévus',
  cash: 'Encaissements',
  deposits: 'Cautions détenues',
  upcoming: 'Prochaines opérations',
  all: 'Tout voir',
  pickup: 'Départ',
  return: 'Retour',
  blocked: 'Bloqué',
  ready: 'Prêt',
  inspection: 'Inspection retour à faire',
  prepare: 'Préparer',
  investigate: 'Voir le problème',
  naviHint: 'Demandez-moi ce qui se passe. Je réponds avec le contexte disponible dans locaOS.',
  prompt1: 'Qu’est-ce qui risque de poser problème aujourd’hui ?',
  prompt2: 'Pourquoi cette voiture est-elle indisponible ?',
  prompt3: 'Quelles locations nécessitent mon attention ?',
  unavailable: 'Impossible de charger les données opérationnelles.',
  none: 'Rien d’urgent détecté.',
};

function moneyMad(value: string | undefined) {
  if (!value) return '0 MAD';
  const n = Number(value) / 100;
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);
}

function time(value: string) {
  return new Intl.DateTimeFormat('fr-MA', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function NaviMode() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lang, setLang] = useState<Locale>('fr');

  useEffect(() => {
    setLang(readLocale());
    const onLanguage = (event: Event) => setLang((event as CustomEvent<Locale>).detail);
    window.addEventListener(LANGUAGE_EVENT, onLanguage);
    let cancelled = false;
    Promise.all([
      clientApiFetch<Brief>('/api/ops/brief?scope=morning'),
      clientApiFetch<Focus>('/api/ops/focus'),
    ])
      .then(([nextBrief, nextFocus]) => {
        if (cancelled) return;
        setBrief(nextBrief);
        setFocus(nextFocus);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; window.removeEventListener(LANGUAGE_EVENT, onLanguage); };
  }, []);

  const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-MA' : 'fr-MA';
  const copy = useMemo(() => lang === 'fr' ? fr : fr, [lang]);
  const topAlerts = (brief?.criticalAlerts.length ?? 0) + (brief?.attentionAlerts.length ?? 0);
  const urgentReturns = focus?.returns.filter((item) => !item.returnInspectionDone) ?? [];
  const blockedPickups = focus?.pickups.filter((item) => item.blockers.length > 0) ?? [];
  const attentionCount = urgentReturns.length + blockedPickups.length + (brief?.overdueRentals.length ?? 0) + (focus?.contractActions.length ?? 0);

  if (loading) return <div className="navi-state">Chargement de votre contexte opérationnel…</div>;
  if (error || !brief || !focus) return <div className="navi-state navi-state-error">{copy.unavailable}</div>;

  return (
    <div className="navi-page" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <style>{`
        .navi-page{--nv-bg:#f4f6f8;--nv-panel:#fff;--nv-ink:#111827;--nv-muted:#6b7280;--nv-line:#e5e7eb;--nv-accent:#2563eb;--nv-soft:#eef4ff;--nv-danger:#b42318;--nv-warn:#9a6700;min-height:100%;margin:-18px -18px -40px;padding:26px;background:radial-gradient(circle at 20% 0%,rgba(37,99,235,.08),transparent 28%),var(--nv-bg);color:var(--nv-ink)}
        .navi-hero{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:20px;align-items:stretch;margin-bottom:18px}
        .navi-command{background:linear-gradient(135deg,#0f172a 0%,#18243a 58%,#17345e 100%);color:#fff;border-radius:24px;padding:26px;box-shadow:0 18px 45px rgba(15,23,42,.16);position:relative;overflow:hidden}
        .navi-command:after{content:"";position:absolute;width:280px;height:280px;border:1px solid rgba(255,255,255,.1);border-radius:50%;right:-90px;top:-90px;box-shadow:0 0 0 40px rgba(255,255,255,.02),0 0 0 80px rgba(255,255,255,.015)}
        .navi-command-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.navi-eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:rgba(255,255,255,.62);font-weight:700}.navi-live{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#c8f7d2;background:rgba(255,255,255,.08);padding:7px 10px;border-radius:999px}.navi-live i{width:7px;height:7px;border-radius:50%;background:#35c76f;box-shadow:0 0 0 4px rgba(53,199,111,.15)}
        .navi-title{font-size:34px;line-height:1.08;margin:36px 0 24px;max-width:620px;letter-spacing:-.03em}.navi-sub{max-width:650px;color:rgba(255,255,255,.72);font-size:14px;line-height:1.6}.navi-prompt-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.navi-prompt{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;border-radius:12px;padding:9px 11px;font-size:12px;display:inline-flex;align-items:center;gap:7px;text-align:left}
        .navi-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}.navi-stat{background:var(--nv-panel);border:1px solid var(--nv-line);border-radius:18px;padding:16px;min-height:100px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 6px 20px rgba(15,23,42,.04)}.navi-stat-label{font-size:11px;color:var(--nv-muted);text-transform:uppercase;letter-spacing:.08em;font-weight:700}.navi-stat-value{font-size:28px;font-weight:700;letter-spacing:-.03em}.navi-stat-meta{font-size:11px;color:var(--nv-muted)}
        .navi-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:18px}.navi-panel{background:var(--nv-panel);border:1px solid var(--nv-line);border-radius:20px;box-shadow:0 8px 24px rgba(15,23,42,.035);overflow:hidden}.navi-panel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:17px 18px 13px;border-bottom:1px solid var(--nv-line)}.navi-panel-title{font-size:14px;font-weight:800}.navi-panel-hint{font-size:11px;color:var(--nv-muted);margin-top:3px}.navi-link{font-size:12px;color:var(--nv-accent);font-weight:700;text-decoration:none}.navi-link:hover{text-decoration:underline}
        .navi-signal{padding:15px 18px;border-bottom:1px solid var(--nv-line);display:flex;gap:12px;align-items:flex-start}.navi-signal:last-child{border-bottom:0}.navi-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none}.navi-icon-risk{background:#fff0ee;color:var(--nv-danger)}.navi-icon-ok{background:#effcf3;color:#17803d}.navi-icon-info{background:var(--nv-soft);color:var(--nv-accent)}.navi-signal-main{min-width:0;flex:1}.navi-signal-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.navi-chip{font-size:10px;font-weight:800;padding:4px 7px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em}.navi-chip-risk{background:#fff0ee;color:var(--nv-danger)}.navi-chip-warn{background:#fff7da;color:var(--nv-warn)}.navi-chip-ok{background:#effcf3;color:#17803d}.navi-signal-title{font-size:13px;font-weight:750}.navi-signal-copy{font-size:12px;color:var(--nv-muted);line-height:1.5;margin-top:4px}.navi-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.navi-action{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--nv-line);border-radius:9px;padding:6px 9px;color:var(--nv-ink);background:#fff;font-size:11px;font-weight:700;text-decoration:none}.navi-action-primary{background:var(--nv-accent);border-color:var(--nv-accent);color:#fff}
        .navi-ops{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:14px 18px}.navi-op{border:1px solid var(--nv-line);border-radius:14px;padding:12px;background:#fbfcfe}.navi-op-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.navi-op-time{font-size:12px;font-weight:800}.navi-op-kind{font-size:10px;color:var(--nv-muted);text-transform:uppercase;letter-spacing:.06em}.navi-op-customer{font-size:12px;font-weight:700;margin-top:8px}.navi-op-meta{font-size:11px;color:var(--nv-muted);margin-top:2px}.navi-op-link{font-size:10px;color:var(--nv-accent);font-weight:800;margin-top:8px;display:inline-flex;align-items:center;gap:3px;text-decoration:none}
        .navi-side-note{padding:16px 18px;background:linear-gradient(135deg,#f9fbff,#f5f9ff);border-top:1px solid var(--nv-line)}.navi-side-note strong{font-size:12px}.navi-side-note p{font-size:12px;color:var(--nv-muted);line-height:1.5;margin:5px 0 0}.navi-relationships{padding:14px 18px;display:flex;gap:7px;flex-wrap:wrap}.navi-relationship{padding:8px 10px;border:1px solid var(--nv-line);background:#fbfcfe;border-radius:999px;font-size:11px;color:#374151;display:inline-flex;align-items:center;gap:6px}
        .navi-state{padding:50px;text-align:center;color:var(--nv-muted)}.navi-state-error{color:var(--nv-danger)}
        @media(max-width:1050px){.navi-hero,.navi-grid{grid-template-columns:1fr}.navi-stats{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media(max-width:760px){.navi-page{margin:-12px -12px -32px;padding:14px}.navi-stats{grid-template-columns:1fr 1fr}.navi-title{font-size:28px;margin-top:26px}.navi-ops{grid-template-columns:1fr}.navi-command{padding:20px;border-radius:20px}}
      `}</style>

      <div className="navi-hero">
        <section className="navi-command">
          <div className="navi-command-top">
            <span className="navi-eyebrow">NAVI · {copy.eyebrow}</span>
            <span className="navi-live"><i /> {copy.live}</span>
          </div>
          <h1 className="navi-title">{copy.greeting}</h1>
          <p className="navi-sub">{attentionCount > 0 ? `${attentionCount} éléments méritent votre attention. NAVI les relie à leurs dossiers et vous montre pourquoi ils comptent.` : copy.none}</p>
          <div className="navi-prompt-row">
            <button className="navi-prompt" type="button"><Bot size={14} /> {copy.prompt1}</button>
            <button className="navi-prompt" type="button"><CarFront size={14} /> {copy.prompt2}</button>
            <button className="navi-prompt" type="button"><CircleGauge size={14} /> {copy.prompt3}</button>
          </div>
        </section>

        <section className="navi-stats" aria-label="Vue d'ensemble">
          <div className="navi-stat"><span className="navi-stat-label">{copy.departures}</span><span className="navi-stat-value">{brief.departures}</span><span className="navi-stat-meta">aujourd’hui</span></div>
          <div className="navi-stat"><span className="navi-stat-label">{copy.returns}</span><span className="navi-stat-value">{brief.returns}</span><span className="navi-stat-meta">aujourd’hui</span></div>
          <div className="navi-stat"><span className="navi-stat-label">{copy.utilization}</span><span className="navi-stat-value">{brief.utilizationPct}%</span><span className="navi-stat-meta">{brief.fleetSize} véhicules</span></div>
          <div className="navi-stat"><span className="navi-stat-label">{copy.tomorrow}</span><span className="navi-stat-value">{brief.tomorrowDepartures}</span><span className="navi-stat-meta">{copy.tomorrowHint}</span></div>
        </section>
      </div>

      <div className="navi-grid">
        <section className="navi-panel">
          <header className="navi-panel-head"><div><div className="navi-panel-title">{copy.attention}</div><div className="navi-panel-hint">Les signaux sont dérivés de l’état opérationnel réel.</div></div><Link className="navi-link" href="/alerts">{copy.all}</Link></header>

          {brief.criticalAlerts.slice(0, 3).map((alert) => <div className="navi-signal" key={alert.id}><div className="navi-icon navi-icon-risk"><AlertTriangle size={16} /></div><div className="navi-signal-main"><div className="navi-signal-line"><span className="navi-chip navi-chip-risk">Critique</span><span className="navi-signal-title">{alert.title ?? 'Alerte opérationnelle'}</span></div><div className="navi-signal-copy">{alert.message ?? 'Cette alerte nécessite une vérification.'}</div><div className="navi-actions"><Link className="navi-action navi-action-primary" href="/alerts">{copy.investigate} <ArrowUpRight size={13} /></Link></div></div></div>)}

          {blockedPickups.slice(0, 3).map((pickup) => <div className="navi-signal" key={pickup.reservationId}><div className="navi-icon navi-icon-risk"><CalendarClock size={16} /></div><div className="navi-signal-main"><div className="navi-signal-line"><span className="navi-chip navi-chip-warn">{copy.blocked}</span><span className="navi-signal-title">{pickup.customerName} · {pickup.categoryName}</span></div><div className="navi-signal-copy">Départ à {time(pickup.pickupAt)}{pickup.plate ? ` · ${pickup.plate}` : ''}. {pickup.blockers.join(' · ')}</div><div className="navi-actions"><Link className="navi-action navi-action-primary" href={`/brief?scope=morning&reservationId=${pickup.reservationId}`}>{copy.prepare} <ChevronRight size={13} /></Link></div></div></div>)}

          {urgentReturns.slice(0, 3).map((item) => <div className="navi-signal" key={item.reservationId}><div className="navi-icon navi-icon-info"><CheckCircle2 size={16} /></div><div className="navi-signal-main"><div className="navi-signal-line"><span className="navi-chip navi-chip-warn">Retour</span><span className="navi-signal-title">{item.customerName} · {item.plate ?? item.categoryName}</span></div><div className="navi-signal-copy">Prévu à {time(item.returnAt)}. {copy.inspection}.</div><div className="navi-actions"><Link className="navi-action navi-action-primary" href={`/field?reservationId=${item.reservationId}&kind=RETURN`}>Inspecter <ChevronRight size={13} /></Link></div></div></div>)}

          {brief.vehiclesRequiringAttention.slice(0, 3).map((vehicle) => <div className="navi-signal" key={vehicle.id}><div className="navi-icon navi-icon-ok"><Wrench size={16} /></div><div className="navi-signal-main"><div className="navi-signal-line"><span className="navi-chip navi-chip-ok">Flotte</span><span className="navi-signal-title">{vehicle.plate}</span></div><div className="navi-signal-copy">Statut actuel: {vehicle.status.replaceAll('_', ' ').toLowerCase()}.</div><div className="navi-actions"><Link className="navi-action" href={`/fleet/${vehicle.id}`}>Voir véhicule <ArrowUpRight size={13} /></Link></div></div></div>)}

          {topAlerts === 0 && blockedPickups.length === 0 && urgentReturns.length === 0 && brief.vehiclesRequiringAttention.length === 0 && <div className="navi-signal"><div className="navi-icon navi-icon-ok"><CheckCircle2 size={16} /></div><div className="navi-signal-main"><div className="navi-signal-title">Tout est sous contrôle.</div><div className="navi-signal-copy">Aucun signal critique ou blocage n’est remonté par le contexte opérationnel actuel.</div></div></div>}
        </section>

        <aside className="navi-panel">
          <header className="navi-panel-head"><div><div className="navi-panel-title">{copy.cash}</div><div className="navi-panel-hint">Vue financière rapide</div></div><Link className="navi-link" href="/finance">Finance</Link></header>
          <div className="navi-relationships">
            <span className="navi-relationship"><CreditCard size={13} /> {moneyMad(brief.cashInTodayMad ?? brief.expectedCashMad)}</span>
            <span className="navi-relationship"><CircleGauge size={13} /> {moneyMad(brief.depositsHeldMad)}</span>
            <span className="navi-relationship"><Clock3 size={13} /> {brief.overdueRentals.length} retard(s)</span>
          </div>
          <div className="navi-side-note"><strong>Contexte NAVI</strong><p>{copy.naviHint}</p></div>

          <header className="navi-panel-head" style={{ borderTop: '1px solid var(--nv-line)' }}><div><div className="navi-panel-title">{copy.upcoming}</div><div className="navi-panel-hint">Ce qui arrive ensuite</div></div><Link className="navi-link" href="/calendar">Planning</Link></header>
          <div className="navi-ops">
            {focus.pickups.slice(0, 4).map((item) => <div className="navi-op" key={`p-${item.reservationId}`}><div className="navi-op-top"><span className="navi-op-time">{time(item.pickupAt)}</span><span className="navi-op-kind">{copy.pickup}</span></div><div className="navi-op-customer">{item.customerName}</div><div className="navi-op-meta">{item.plate ?? item.categoryName}</div><Link className="navi-op-link" href={item.contractId ? `/contracts/${item.contractId}` : `/brief?scope=morning&reservationId=${item.reservationId}`}>Ouvrir <ChevronRight size={12} /></Link></div>)}
            {focus.returns.slice(0, 4).map((item) => <div className="navi-op" key={`r-${item.reservationId}`}><div className="navi-op-top"><span className="navi-op-time">{time(item.returnAt)}</span><span className="navi-op-kind">{copy.return}</span></div><div className="navi-op-customer">{item.customerName}</div><div className="navi-op-meta">{item.plate ?? item.categoryName}</div><Link className="navi-op-link" href={item.returnInspectionDone ? `/contracts/${item.contractId}` : `/field?reservationId=${item.reservationId}&kind=RETURN`}>Ouvrir <ChevronRight size={12} /></Link></div>)}
          </div>
        </aside>
      </div>
    </div>
  );
}

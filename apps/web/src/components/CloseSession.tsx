'use client';
import { UI_STRINGS } from '@locaos/domain/i18n';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DENOMS_MAD = ['200', '100', '50', '20', '10', '5'];
const DENOMS_EUR = ['50', '20', '10', '5'];

type Lang = 'fr' | 'ar' | 'en';

export default function CloseSession({ sessionId, expected }: { sessionId: string; expected: string }) {
  const router = useRouter();
  const [counted, setCounted] = useState<Record<string, Record<string, string>>>({ MAD: {}, EUR: {} });
  const [fx, setFx] = useState('10.85');
  const [explanation, setExplanation] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cookieMatch = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)locaos-lang=([^;]+)/) : null;
  const lang: Lang = cookieMatch?.[1] === 'ar' ? 'ar' : cookieMatch?.[1] === 'en' ? 'en' : 'fr';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const totalMAD = DENOMS_MAD.reduce((a, d) => a + Number(d) * 100 * Number(counted.MAD?.[d] ?? 0), 0);
  const totalEUR = DENOMS_EUR.reduce((a, d) => a + Number(d) * 100 * Number(counted.EUR?.[d] ?? 0), 0);
  const eurInMad = Math.round(totalEUR * Number(fx || 0));
  const variance = totalMAD + eurInMad - Number(expected);
  const mad = (n: number) => new Intl.NumberFormat('fr-MA').format(n / 100) + ' MAD';

  const close = async () => {
    setBusy(true); setErr(null);
    const body = {
      counted: {
        MAD: Object.fromEntries(DENOMS_MAD.map((d) => [d, Number(counted.MAD?.[d] ?? 0)]).filter((e) => (e[1] as number) > 0)),
        EUR: Object.fromEntries(DENOMS_EUR.map((d) => [d, Number(counted.EUR?.[d] ?? 0)]).filter((e) => (e[1] as number) > 0)),
      },
      fxRates: { EUR: Number(fx) },
      varianceExplanation: explanation || undefined,
    };
    const res = await fetch(`/api/finance/cash-sessions/${sessionId}/close`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) { await res.json().catch(() => null); setErr(UI_STRINGS.ERROR[lang] ?? UI_STRINGS.ERROR.fr); setBusy(false); return; }
    setBusy(false); router.refresh();
  };

  return (
    <div className="card" style={{ maxWidth: 640, marginBottom: 10, direction: dir }}>
      <h2 style={{ marginTop: 0 }}>{UI_STRINGS.CLOSE_SESSION[lang] ?? UI_STRINGS.CLOSE_SESSION.fr}</h2>
      <div className="sub">{UI_STRINGS.CLOSE_SESSION[lang] ?? UI_STRINGS.CLOSE_SESSION.fr}: Attendu : <b>{mad(Number(expected))}</b> — comptez le tiroir par devise. L'écart est calculé et journalisé, jamais écrasé.</div>
      <div className="row" style={{ gap: 16, marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <label>{UI_STRINGS.ACTION[lang] ?? UI_STRINGS.ACTION.fr} — MAD</label>
          {DENOMS_MAD.map((d) => (
            <div key={d} className="row" style={{ gap: 6, marginBottom: 4 }}>
              <span className="mono" style={{ width: 40 }}>{d}</span>
              <input inputMode="numeric" value={counted.MAD?.[d] ?? ''} onChange={(e) => setCounted((c) => ({ ...c, MAD: { ...c.MAD, [d]: e.target.value } }))} placeholder="0" />
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <label>{UI_STRINGS.ACTION[lang] ?? UI_STRINGS.ACTION.fr} — EUR (MRE/touristes) — taux du jour (confirmé humain)</label>
          <input value={fx} onChange={(e) => setFx(e.target.value)} />
          {DENOMS_EUR.map((d) => (
            <div key={d} className="row" style={{ gap: 6, marginBottom: 4 }}>
              <span className="mono" style={{ width: 40 }}>€{d}</span>
              <input inputMode="numeric" value={counted.EUR?.[d] ?? ''} onChange={(e) => setCounted((c) => ({ ...c, EUR: { ...c.EUR, [d]: e.target.value } }))} placeholder="0" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid cards" style={{ marginTop: 10 }}>
        <div className="card"><div className="k">{UI_STRINGS.ACTION[lang] ?? UI_STRINGS.ACTION.fr} MAD</div><div className="v">{mad(totalMAD)}</div></div>
        <div className="card"><div className="k">{UI_STRINGS.ACTION[lang] ?? UI_STRINGS.ACTION.fr} → MAD</div><div className="v">{mad(eurInMad)}</div></div>
        <div className="card"><div className="k">{UI_STRINGS.ACTION[lang] ?? UI_STRINGS.ACTION.fr} Écart</div>
          <div className={`v ${variance === 0 ? 'ok' : 'crit'}`}>{mad(variance)}</div></div>
      </div>
      {variance !== 0 && (<><label>{UI_STRINGS.ACTION[lang] ?? UI_STRINGS.ACTION.fr} de l'écart (audité)</label><input value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="ex: rendu monnaie mal compté" /></>)}
      {err && <div className="error-msg">{err}</div>}
      <div className="btnrow"><button className="primary" onClick={close} disabled={busy}>{busy ? 'Clôture…' : UI_STRINGS.CLOSE_SESSION[lang] ?? UI_STRINGS.CLOSE_SESSION.fr}</button></div>
    </div>
  );
}

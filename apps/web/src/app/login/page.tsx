'use client';
import { UI_STRINGS } from '@locaos/domain/i18n';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@atlasrent.ma');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lang = (typeof window !== 'undefined' && document.cookie.match(/locaos-lang=([^;])/))?.[1] === 'ar' ? 'ar' : 'fr';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) { router.push('/'); router.refresh(); return; }
    const body = await res.json().catch(() => null);
    setErr(UI_STRINGS.ERROR[lang] ?? UI_STRINGS.ERROR.fr);
    setBusy(false);
  };

  return (
    <div className="login-wrap" style={{ dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <div>
        <form className="login-box" onSubmit={submit}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{UI_STRINGS.SHELL[lang] ?? UI_STRINGS.SHELL.fr}</div>
          <div className="sub" style={{ marginBottom: 14 }}>{UI_STRINGS.LOGIN[lang] ?? UI_STRINGS.LOGIN.fr}: Atlas Rent SARL (démo)</div>
          <label>{UI_STRINGS.LOGIN[lang] ?? UI_STRINGS.LOGIN.fr} e-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <label>{UI_STRINGS.LOGIN[lang] ?? UI_STRINGS.LOGIN.fr} mot de passe</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoFocus />
          <div style={{ marginTop: 16 }}>
            <button className="primary" style={{ width: '100%' }} disabled={busy} type="submit">
              {busy ? 'Connexion…' : UI_STRINGS.LOGIN[lang] ?? UI_STRINGS.LOGIN.fr}
            </button>
          </div>
          {err && <div className="error-msg">{err}</div>}
          <div className="sub" style={{ marginTop: 14 }}>
            Démo : owner / manager / agent / field / compta @atlasrent.ma — mot de passe <span className="mono">locaos-demo-2026</span>
          </div>
        </form>
      </div>
    </div>
  );
}
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@atlasrent.ma');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) { router.push('/'); router.refresh(); return; }
    const body = await res.json().catch(() => null);
    setErr(body?.error?.message ?? 'Connexion échouée');
    setBusy(false);
  };

  return (
    <div className="login-wrap">
      <div>
        <form className="login-box" onSubmit={submit}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>loca<span style={{ color: 'var(--brand)' }}>OS</span></div>
          <div className="sub" style={{ marginBottom: 14 }}>Le système d'exploitation de l'agence — Atlas Rent SARL (démo)</div>
          <label>Adresse e-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <label>Mot de passe</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoFocus />
          <div style={{ marginTop: 16 }}>
            <button className="primary" style={{ width: '100%' }} disabled={busy} type="submit">
              {busy ? 'Connexion…' : 'Se connecter'}
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateDepositForm({ contractId, defaultAmount }: { contractId: string; defaultAmount: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState('CASH_HELD');
  const [providerRef, setProviderRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!amount.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/deposits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractId,
          amount,
          method,
          ...(providerRef.trim() ? { providerRef: providerRef.trim() } : {}),
        }),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok) {
        setError(out?.error?.message ?? out?.message ?? 'Impossible de sécuriser la caution');
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="k">Sécuriser la caution</div>
      <div className="row" style={{ alignItems: 'end', marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <label>Montant (MAD)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" disabled={busy} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Mode</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={busy}>
            <option value="CASH_HELD">Espèces</option>
            <option value="CARD_PREAUTH">Pré-autorisation carte</option>
            <option value="BANK">Virement / banque</option>
          </select>
        </div>
        {method === 'CARD_PREAUTH' && (
          <div style={{ flex: 1 }}>
            <label>Référence</label>
            <input value={providerRef} onChange={(e) => setProviderRef(e.target.value)} disabled={busy} />
          </div>
        )}
        <button className="mini primary" type="button" onClick={submit} disabled={busy || !amount.trim()}>
          {busy ? 'Enregistrement…' : 'Sécuriser'}
        </button>
      </div>
      {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}

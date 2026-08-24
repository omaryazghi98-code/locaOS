'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ActionButton({
  path, body, label, variant = '', confirmText, promptLabel, promptField,
}: {
  path: string; body?: Record<string, unknown>; label: string; variant?: string;
  confirmText?: string; promptLabel?: string; promptField?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const run = async (extra?: Record<string, unknown>) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch(path, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...(body ?? {}), ...(extra ?? {}) }),
    });
    const out = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      alert(out?.error?.message ?? out?.message ?? `Erreur ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
    return out;
  };

  if (promptLabel && promptField) {
    return (
      <button
        className={`mini ${variant}`} disabled={busy}
        onClick={async () => { const v = prompt(promptLabel); if (v == null || !v.trim()) return; await run({ [promptField]: v }); }}
      >{busy ? '…' : label}</button>
    );
  }
  return <button className={`mini ${variant}`} disabled={busy} onClick={() => run()}>{busy ? '…' : label}</button>;
}

export function money(mad: string | bigint | number): string {
  const n = typeof mad === 'bigint' ? Number(mad) : Number(mad);
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n / 100) + ' MAD';
}

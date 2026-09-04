'use client';

import { useState } from 'react';

export default function ContractFromReservationButton({
  reservationId,
  language,
  label,
}: {
  reservationId: string;
  language: 'fr' | 'ar' | 'en';
  label: string;
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/contracts/from-reservation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reservationId, language }),
      });
      const out = await res.json().catch(() => null) as { contract?: { id?: string }; error?: { message?: string }; message?: string } | null;
      if (!res.ok || !out?.contract?.id) {
        throw new Error(out?.error?.message ?? out?.message ?? 'Impossible de préparer le contrat');
      }
      // Creating/preparing a contract should land on its operational workspace.
      // Printing is an explicit action there so agents can review missing fields first.
      window.location.href = `/contracts/${encodeURIComponent(out.contract.id)}`;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Impossible de préparer le contrat');
      setBusy(false);
    }
  };

  return (
    <button type="button" className="mini" onClick={run} disabled={busy} aria-busy={busy}>
      {busy ? '…' : label}
    </button>
  );
}

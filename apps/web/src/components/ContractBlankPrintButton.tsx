'use client';

import { useState } from 'react';
import { UI_STRINGS } from '@locaos/domain/i18n';

export default function ContractBlankPrintButton({ language = 'fr' }: { language?: 'fr' | 'ar' | 'en' }) {
  const [busy, setBusy] = useState(false);

  const labels = {
    fr: 'Imprimer un contrat vierge',
    ar: 'طباعة عقد فارغ',
    en: 'Print blank contract',
  } as const;

  const errorLabels = {
    fr: UI_STRINGS.ERROR.fr,
    ar: UI_STRINGS.ERROR.ar,
    en: UI_STRINGS.ERROR.en,
  } as const;

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/contracts/blank', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const out = await res.json().catch(() => null) as { id?: string; error?: { message?: string }; message?: string } | null;
      if (!res.ok || !out?.id) {
        throw new Error(out?.error?.message ?? out?.message ?? errorLabels[language]);
      }
      const popup = window.open(`/api/contracts/${encodeURIComponent(out.id)}/pdf`, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.href = `/api/contracts/${encodeURIComponent(out.id)}/pdf`;
        return;
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : errorLabels[language]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="primary" onClick={run} disabled={busy} aria-busy={busy}>
      {busy ? '…' : labels[language]}
    </button>
  );
}

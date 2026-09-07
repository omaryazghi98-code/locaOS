'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const CANDIDATE_FIELDS = [
  ['licenseNumber', 'N° permis'],
  ['firstName', 'Prénom'],
  ['lastName', 'Nom'],
  ['dateOfBirth', 'Date de naissance'],
  ['issueDate', "Date d'émission"],
  ['expiryDate', "Date d'expiration"],
  ['issuerCountry', "Pays d'émission"],
] as const;

type Candidate = { value: string | null; confidence: number | null; sourceFieldKey: string | null };

type Props = {
  intake: { id: string; document_id: string; document_family: string; status: string; provider: string | null; created_at: string };
  runs: { id: string; provider: string; status: string; raw_text: string | null; provider_metadata: Record<string, unknown> | null; created_at: string; completed_at: string | null }[];
  fields: { id: string; extraction_run_id: string; field_key: string; value_text: string | null; confidence: number | null; source_region: unknown; validation_status: string; confirmed_value: string | null }[];
  documentUrl: string | null;
  initialCustomerId: string;
};

function confidenceLabel(value: number | null) {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

export default function DriverLicenseReview({ intake, runs, fields, documentUrl, initialCustomerId }: Props) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'classify' | 'ocr' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latestRun = runs[0];
  const candidates = useMemo(() => {
    const out: Record<string, Candidate> = {};
    for (const [key] of CANDIDATE_FIELDS) {
      const row = fields.find((f) => f.extraction_run_id === latestRun?.id && f.field_key === `driver_license.${key}`);
      out[key] = {
        value: row?.confirmed_value ?? row?.value_text ?? null,
        confidence: row?.confidence ?? null,
        sourceFieldKey: typeof row?.source_region === 'object' && row?.source_region && 'sourceFieldKey' in row.source_region
          ? String((row.source_region as { sourceFieldKey?: unknown }).sourceFieldKey ?? '') || null
          : null,
      };
    }
    return out;
  }, [fields, latestRun?.id]);

  function valueFor(key: string) {
    return values[key] ?? candidates[key]?.value ?? '';
  }

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function post(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const out = await response.json().catch(() => null);
    if (!response.ok) throw new Error(out?.error?.message ?? out?.message ?? `HTTP ${response.status}`);
    return out;
  }

  async function classify() {
    setBusy('classify'); setError(null);
    try { await post(`/api/document-intelligence/intakes/${intake.id}/classify`, { family: 'DRIVER_LICENSE' }); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Classification impossible'); }
    finally { setBusy(null); }
  }

  async function runOcr() {
    setBusy('ocr'); setError(null);
    try { await post(`/api/document-intelligence/intakes/${intake.id}/ocr`); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'OCR impossible'); }
    finally { setBusy(null); }
  }

  async function confirm() {
    if (!customerId.trim()) { setError('Sélectionnez ou renseignez le client cible avant confirmation.'); return; }
    const confirmed: Record<string, Candidate> = {};
    for (const [key] of CANDIDATE_FIELDS) {
      const candidate = candidates[key];
      confirmed[key] = {
        value: valueFor(key).trim() || null,
        confidence: candidate?.confidence ?? null,
        sourceFieldKey: candidate?.sourceFieldKey ?? null,
      };
    }
    if (!confirmed.licenseNumber.value) { setError('Le numéro de permis est obligatoire.'); return; }
    setBusy('confirm'); setError(null);
    try {
      await post(`/api/document-intelligence/intakes/${intake.id}/driver-license/confirm`, { customerId: customerId.trim(), confirmed });
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Confirmation impossible'); }
    finally { setBusy(null); }
  }

  return (
    <div className="grid cols2" style={{ alignItems: 'start', gap: 14 }}>
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div><h2 style={{ margin: 0 }}>Document source</h2><div className="sub mono">{intake.document_id}</div></div>
          <span className={`pill ${intake.status === 'CONFIRMED' ? 'ok' : intake.status === 'FAILED' ? 'danger' : 'info'}`}>{intake.status}</span>
        </div>
        <div style={{ marginTop: 12, minHeight: 420, display: 'grid', placeItems: 'center', background: 'var(--surface-2, #f4f5f7)', borderRadius: 10, overflow: 'hidden' }}>
          {documentUrl ? (
            <img src={documentUrl} alt="Document source à vérifier" style={{ maxWidth: '100%', maxHeight: 520, objectFit: 'contain' }} />
          ) : (
            <div className="sub" style={{ padding: 24, textAlign: 'center' }}>Aperçu indisponible. Le document existe mais son URL signée n'a pas pu être chargée.</div>
          )}
        </div>
        <div className="btnrow" style={{ marginTop: 12 }}>
          {intake.document_family !== 'DRIVER_LICENSE' && <button className="primary" onClick={classify} disabled={busy !== null}>{busy === 'classify' ? 'Classification…' : 'Classer comme permis'}</button>}
          {intake.document_family === 'DRIVER_LICENSE' && intake.status !== 'CONFIRMED' && <button className="primary" onClick={runOcr} disabled={busy !== null}>{busy === 'ocr' ? 'OCR en cours…' : latestRun ? 'Relancer OCR' : 'Lancer OCR'}</button>}
        </div>
      </section>

      <section className="card">
        <div>
          <h2 style={{ margin: 0 }}>Vérification humaine</h2>
          <div className="sub">Les valeurs OCR sont des propositions. Rien n'est inscrit dans l'identité client avant votre confirmation.</div>
        </div>

        <label style={{ marginTop: 14 }}>Client cible *</label>
        <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="UUID du client" disabled={intake.status === 'CONFIRMED'} />
        <div className="sub">Le client lié au document est prérempli lorsqu'il existe. Aucun rapprochement automatique n'est effectué.</div>

        <div style={{ marginTop: 14 }}>
          {CANDIDATE_FIELDS.map(([key, label]) => {
            const candidate = candidates[key];
            const confidence = candidate?.confidence ?? null;
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, .8fr) minmax(180px, 1.5fr) 56px', gap: 8, alignItems: 'end', marginBottom: 10 }}>
                <label style={{ margin: 0 }}>{label}</label>
                <input value={valueFor(key)} onChange={(e) => setValue(key, e.target.value)} disabled={intake.status === 'CONFIRMED'} />
                <span className="mono sub" title="Confiance OCR">{confidenceLabel(confidence)}</span>
              </div>
            );
          })}
        </div>

        {error && <div className="error-msg" role="alert" style={{ marginTop: 10 }}>{error}</div>}

        <div className="btnrow" style={{ marginTop: 14 }}>
          <button className="primary" onClick={confirm} disabled={busy !== null || intake.status === 'CONFIRMED' || !latestRun}>{busy === 'confirm' ? 'Confirmation…' : intake.status === 'CONFIRMED' ? 'Confirmation enregistrée' : 'Confirmer le permis'}</button>
        </div>

        <details style={{ marginTop: 18 }}>
          <summary>Voir le texte OCR brut</summary>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', marginTop: 10 }}>{latestRun?.raw_text || 'Aucun texte OCR disponible.'}</pre>
        </details>
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';

export interface CreatedCustomer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string;
  email: string | null;
}

export default function NewCustomerForm({
  onCreated,
  compact = false,
}: {
  onCreated: (customer: CreatedCustomer) => void;
  compact?: boolean;
}) {
  const [kind, setKind] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [segment, setSegment] = useState<'DOMESTIC' | 'MRE' | 'TOURIST' | 'BUSINESS'>('DOMESTIC');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        kind,
        segment,
        firstName: kind === 'INDIVIDUAL' ? firstName.trim() || undefined : undefined,
        lastName: kind === 'INDIVIDUAL' ? lastName.trim() || undefined : undefined,
        companyName: kind === 'COMPANY' ? companyName.trim() || undefined : undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(out?.error?.message ?? out?.message ?? 'Impossible de créer le client');
      }
      onCreated(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le client');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginTop: 10 }}>
      {!compact && <h2 style={{ marginTop: 0 }}>Nouveau client</h2>}
      <div className="row" style={{ gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as 'INDIVIDUAL' | 'COMPANY')}>
            <option value="INDIVIDUAL">Particulier</option>
            <option value="COMPANY">Entreprise</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Segment</label>
          <select value={segment} onChange={(e) => setSegment(e.target.value as typeof segment)}>
            <option value="DOMESTIC">Domestic</option>
            <option value="MRE">MRE</option>
            <option value="TOURIST">Tourist</option>
            <option value="BUSINESS">Business</option>
          </select>
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        {kind === 'INDIVIDUAL' ? (
          <>
            <div style={{ flex: 1 }}><label>Prénom</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div style={{ flex: 1 }}><label>Nom</label><input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
          </>
        ) : (
          <div style={{ flex: 1 }}><label>Raison sociale</label><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required /></div>
        )}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <div style={{ flex: 1 }}><label>Téléphone *</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2126..." required /></div>
        <div style={{ flex: 1 }}><label>E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>

      <label>Notes</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

      {error && <div className="error-msg">{error}</div>}
      <div className="btnrow">
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer le client'}</button>
      </div>
    </form>
  );
}

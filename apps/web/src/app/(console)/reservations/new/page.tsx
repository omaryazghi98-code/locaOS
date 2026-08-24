'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewReservation() {
  const router = useRouter();
  const [data, setData] = useState<{ customers: { id: string; firstName: string | null; lastName: string | null; companyName: string | null }[]; categories: { id: string; name: string; code: string; floorDailyRate: string }[]; branches: { id: string; name: string }[]; vehicles: { id: string; plate: string; categoryId: string; operationalStatus: string }[] }>({ customers: [], categories: [], branches: [], vehicles: [] });
  const [form, setForm] = useState({ customerId: '', categoryId: '', vehicleId: '', branchOutId: '', branchInId: '', pickupAt: '', returnAt: '', dailyRate: '', flightNumber: '', deliveryAddress: '', notes: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [customers, categories, branches, vehicles] = await Promise.all([
        fetch('/api/customers').then((r) => r.json()), fetch('/api/fleet/categories').then((r) => r.json()),
        fetch('/api/ops/branches').then((r) => r.json()), fetch('/api/fleet/vehicles').then((r) => r.json()),
      ]);
      setData({ customers, categories, branches, vehicles: vehicles.filter((v: { operationalStatus: string }) => v.operationalStatus === 'AVAILABLE') });
      setForm((f) => ({ ...f, customerId: customers[0]?.id ?? '', categoryId: categories[0]?.id ?? '', branchOutId: branches[0]?.id ?? '', branchInId: branches[0]?.id ?? '' }));
    })();
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await fetch('/api/reservations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
        vehicleId: form.vehicleId || null,
        pickupAt: new Date(form.pickupAt).toISOString(), returnAt: new Date(form.returnAt).toISOString(),
      }),
    });
    const out = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(out?.error?.detail ?? out?.error?.message ?? 'Erreur'); return; }
    router.push(`/reservations/${out.reservation.id}`);
  };

  const cat = data.categories.find((c) => c.id === form.categoryId);

  return (
    <div><h1>Nouvelle réservation</h1>
      <form className="stack" onSubmit={submit}>
        <label>Client</label>
        <select value={form.customerId} onChange={(e) => set('customerId', e.target.value)} required>
          {data.customers.map((c) => <option key={c.id} value={c.id}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</option>)}
        </select>
        <div className="row">
          <div style={{ flex: 1 }}><label>Catégorie</label>
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div style={{ flex: 1 }}><label>Véhicule (optionnel — défaut: catégorie)</label>
            <select value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
              <option value="">— affectation ultérieure —</option>
              {data.vehicles.filter((v) => !form.categoryId || v.categoryId === form.categoryId).map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
            </select></div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}><label>Départ (agence)</label>
            <select value={form.branchOutId} onChange={(e) => set('branchOutId', e.target.value)}>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div style={{ flex: 1 }}><label>Retour (agence)</label>
            <select value={form.branchInId} onChange={(e) => set('branchInId', e.target.value)}>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}><label>Prise en charge</label><input type="datetime-local" value={form.pickupAt} onChange={(e) => set('pickupAt', e.target.value)} required /></div>
          <div style={{ flex: 1 }}><label>Restitution</label><input type="datetime-local" value={form.returnAt} onChange={(e) => set('returnAt', e.target.value)} required /></div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}><label>Tarif journalier (MAD){cat ? ` — plancher ${Number(cat.floorDailyRate) / 100} MAD` : ''}</label>
            <input value={form.dailyRate} onChange={(e) => set('dailyRate', e.target.value)} placeholder="350" required /></div>
          <div style={{ flex: 1 }}><label>Numéro de vol (optionnel)</label><input value={form.flightNumber} onChange={(e) => set('flightNumber', e.target.value)} placeholder="AT765" /></div>
        </div>
        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        {err && <div className="error-msg">{err}</div>}
        <div style={{ marginTop: 14 }}><button className="primary" type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer la réservation'}</button></div>
        <div className="sub">Les conflits (double réservation, maintenance) sont refusés par la base de données — pas de surbooking possible.</div>
      </form>
    </div>
  );
}

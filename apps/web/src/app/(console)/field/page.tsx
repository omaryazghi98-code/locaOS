'use client';
// Field PWA — offline-first inspection workflow (< 60 s target; evidence quality first).
// Agents work from reservation references and plates; UUIDs remain internal identifiers.
import { useCallback, useEffect, useState } from 'react';

const CHECKLIST = ['roueSecours', 'triangle', 'extincteur', 'gilets', 'cleRoue', 'autoradio', 'tapis', 'clim'];
const CHECK_LABELS: Record<string, string> = {
  roueSecours: 'Roue de secours', triangle: 'Triangle', extincteur: 'Extincteur', gilets: 'Gilets',
  cleRoue: 'Clé de roue', autoradio: 'Autoradio', tapis: 'Tapis', clim: 'Clim.',
};

interface Queued { clientUuid: string; payload: unknown; at: string }
interface Picker { reservationId: string; vehicleId: string; label: string; plate: string | null }

function loadQueue(): Queued[] {
  try { return JSON.parse(localStorage.getItem('locaos:outbox') ?? '[]'); } catch { return []; }
}
function saveQueue(q: Queued[]) { localStorage.setItem('locaos:outbox', JSON.stringify(q)); }

async function flushQueue(log: (s: string) => void) {
  const q = loadQueue();
  for (const item of q) {
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item.payload),
      });
      if (res.ok || res.status === 400) {
        saveQueue(loadQueue().filter((x) => x.clientUuid !== item.clientUuid));
        log(`Synchronisé (${item.clientUuid.slice(0, 8)}…)`);
      }
    } catch { log('Hors ligne — nouvelle tentative plus tard'); return; }
  }
}

export default function FieldPage() {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [pickers, setPickers] = useState<Picker[]>([]);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', reservationId: '', kind: 'DEPARTURE', mileageKm: '', fuelLevelPct: '100', customerAckName: '', notes: '' });
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [damages, setDamages] = useState<{ zoneCode: string; severity: string; description: string }[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [online, setOnline] = useState(true);
  const [queueLen, setQueueLen] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reservationId = params.get('reservationId') ?? '';
    const kind = params.get('kind') ?? 'DEPARTURE';
    setForm((f) => ({ ...f, reservationId, kind }));

    (async () => {
      try {
        // The today's list is useful for the generic field workflow, but a reservation opened
        // directly must resolve itself even when its pickup date is not today.
        const detail = reservationId
          ? await fetch(`/api/reservations/${reservationId}`).then((r) => r.ok ? r.json() : null)
          : null;
        if (detail?.reservation?.vehicleId) {
          const plate = detail.vehicle?.plate ?? null;
          const customer = detail.customer ? `${detail.customer.firstName ?? ''} ${detail.customer.lastName ?? ''}`.trim() : '';
          const label = `${detail.reservation.reference}${customer ? ` — ${customer}` : ''}${plate ? ` · ${plate}` : ''}`;
          setResolvedLabel(label);
          setForm((f) => ({ ...f, reservationId, vehicleId: detail.reservation.vehicleId }));
        }

        const t = await fetch('/api/ops/today').then((r) => r.json());
        const deps = (t.departures ?? []).map((d: { reservation: { id: string; reference: string; vehicleId: string | null }; customerName: string; plate: string | null }) => ({
          reservationId: d.reservation.id, vehicleId: d.reservation.vehicleId ?? '',
          plate: d.plate ?? null,
          label: `${d.reservation.reference} — ${d.customerName}${d.plate ? ' · ' + d.plate : ''}`,
        })).filter((x: Picker) => x.vehicleId);
        setPickers(deps);
        if (!reservationId) {
          const pre = deps[0];
          if (pre) setForm((f) => ({ ...f, reservationId: pre.reservationId, vehicleId: pre.vehicleId }));
        }
      } catch {
        // A directly opened reservation may still be usable from a cached/local URL state;
        // never fall back to asking an agent for an internal UUID.
      }
    })();

    setOnline(navigator.onLine);
    const on = () => { setOnline(true); void flushQueue((s) => setStatus((x) => [s, ...x].slice(0, 5))); setQueueLen(loadQueue().length); };
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    setQueueLen(loadQueue().length);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const log = useCallback((s: string) => setStatus((x) => [s, ...x].slice(0, 5)), []);

  const submit = async () => {
    if (!form.vehicleId || !form.mileageKm) { log('Véhicule affecté et kilométrage obligatoires'); return; }
    const clientUuid = crypto.randomUUID();
    const startedAtIso = startedAt ?? new Date().toISOString();
    const payload = {
      clientUuid, kind: form.kind,
      vehicleId: form.vehicleId,
      reservationId: form.reservationId || undefined,
      startedAt: startedAtIso,
      mileageKm: Number(form.mileageKm), fuelLevelPct: Number(form.fuelLevelPct),
      checklist, customerAck: Boolean(form.customerAckName), customerAckName: form.customerAckName || undefined,
      notes: form.notes || undefined, newDamages: damages,
      deviceInfo: { ua: navigator.userAgent.slice(0, 80), online: navigator.onLine },
    };
    if (!navigator.onLine) {
      saveQueue([...loadQueue(), { clientUuid, payload, at: new Date().toISOString() }]);
      setQueueLen(loadQueue().length);
      log(`Mis en file d'attente (hors ligne) — ${clientUuid.slice(0, 8)}…`);
    } else {
      try {
        const res = await fetch('/api/inspections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        const out = await res.json();
        const seconds = Math.round((Date.now() - new Date(startedAtIso).getTime()) / 1000);
        if (res.ok) { log(`Inspection enregistrée${out.duplicate ? ' (doublon ignoré)' : ''} en ${seconds}s`); }
        else { log(`Erreur: ${out?.error?.message ?? res.status}`); }
      } catch { saveQueue([...loadQueue(), { clientUuid, payload, at: new Date().toISOString() }]); setQueueLen(loadQueue().length); log('Hors ligne — mis en file'); }
    }
    setStartedAt(null); setChecklist({}); setDamages([]); setForm((f) => ({ ...f, mileageKm: '', customerAckName: '', notes: '' }));
  };

  return (
    <div>
      <div className="topbar"><div>
        <h1>Terrain — inspection</h1>
        <div className="sub">Mode hors ligne prêt. Objectif &lt; 60 s — sans sacrifier les preuves photo.</div>
      </div>
        <span className={`pill ${online ? 'ok' : 'danger'}`}>{online ? 'en ligne' : 'hors ligne'}</span>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        {!startedAt && <button className="primary" onClick={() => { setStartedAt(new Date().toISOString()); log('Chrono démarré'); }}>Démarrer l'inspection ({form.kind === 'DEPARTURE' ? 'départ' : 'retour'})</button>}
        {startedAt && <>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}><label>Type</label>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="DEPARTURE">Départ</option><option value="RETURN">Retour</option>
              </select></div>
            <div style={{ flex: 2.6 }}><label>Réservation / véhicule</label>
              {resolvedLabel && form.reservationId ? (
                <div className="sub" style={{ minHeight: 38, display: 'flex', alignItems: 'center' }}>{resolvedLabel}</div>
              ) : (
                <select onChange={(e) => {
                  const p = pickers.find((x) => x.reservationId === e.target.value);
                  setForm((f) => ({ ...f, reservationId: e.target.value, vehicleId: p?.vehicleId ?? '' }));
                }} value={form.reservationId}>
                  <option value="">— choisir une réservation —</option>
                  {pickers.map((p) => <option key={p.reservationId} value={p.reservationId}>{p.label}</option>)}
                </select>
              )}
            </div>
          </div>
          {!form.vehicleId && <div className="sub" style={{ marginTop: 6 }}>Aucun véhicule affecté à cette réservation. Retournez à la réservation pour affecter un véhicule.</div>}
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}><label>Kilométrage</label><input inputMode="numeric" value={form.mileageKm} onChange={(e) => setForm({ ...form, mileageKm: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label>Carburant %</label><input inputMode="numeric" value={form.fuelLevelPct} onChange={(e) => setForm({ ...form, fuelLevelPct: e.target.value })} /></div>
            <div style={{ flex: 1.6 }}><label>Accord client (nom)</label><input value={form.customerAckName} onChange={(e) => setForm({ ...form, customerAckName: e.target.value })} placeholder="signature orale constatée — nom" /></div>
          </div>
          <label>Accessoires</label>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {CHECKLIST.map((c) => (
              <button key={c} type="button" className={`mini ${checklist[c] ? 'primary' : ''}`}
                onClick={() => setChecklist((x) => ({ ...x, [c]: !x[c] }))}>{(checklist[c] ? '✓ ' : '') + CHECK_LABELS[c]}</button>
            ))}
          </div>
          <label>Nouveaux dommages ({form.kind === 'RETURN' ? 'retour' : 'constatés'})</label>
          {damages.map((dm, i) => (
            <div key={i} className="sub mono">{dm.zoneCode} · {dm.severity} · {dm.description}</div>
          ))}
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="mini" onClick={() => setDamages((d) => [...d, { zoneCode: prompt('Zone (ex: AVD = avant droit)', 'AVG') ?? 'AVG', severity: 'MINOR', description: prompt('Description', 'Rayure pare-choc') ?? '' }])}>+ Dommage</button>
          </div>
          <label>Notes</label>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="btnrow">
            <button className="primary" onClick={submit}>Soumettre l'inspection</button>
            <button onClick={() => setStartedAt(null)}>Annuler</button>
          </div>
        </>}
        {queueLen > 0 && <div className="sub" style={{ marginTop: 8 }}>{queueLen} inspection(s) en file d'attente — synchronisation auto au retour du réseau.</div>}
        {status.length > 0 && <div style={{ marginTop: 10 }}>{status.map((s, i) => <div key={i} className="sub mono">{s}</div>)}</div>}
      </div>
      <div className="sub" style={{ marginTop: 10, maxWidth: 640 }}>
        Captures photo standardisées par emplacement : disponible via l'API <span className="mono">POST /api/inspections/:id/photos</span> (JPG/PNG/WebP ≤ 8 Mo, type vérifié). La détection IA de dommages n'est PAS incluse (V3) — les preuves d'abord.
      </div>
    </div>
  );
}

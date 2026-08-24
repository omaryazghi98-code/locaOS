import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Row { p: { vehicleId: string; lat: string; lng: string; speedKmh: number; ignitionOn: boolean | null; fixedAt: string }; plate: string; status: string }

// Casablanca-region rough projection onto an SVG viewport (no external tiles — works offline).
const BB = { minLat: 33.0, maxLat: 34.1, minLng: -8.4, maxLng: -6.8 };
const proj = (lat: number, lng: number) => ({
  x: ((lng - BB.minLng) / (BB.maxLng - BB.minLng)) * 100,
  y: (1 - (lat - BB.minLat) / (BB.maxLat - BB.minLat)) * 100,
});

export default async function MapPage() {
  const rows = await apiFetch<Row[]>('/api/telematics/positions');
  const pts = rows.map((r) => ({ ...r, xy: proj(Number(r.p.lat), Number(r.p.lng)) }));
  return (
    <div>
      <div className="topbar"><div><h1>Positions véhicules (télématrie)</h1>
        <div className="sub">Vue interne sans tuiles externes (fonctionne hors ligne). Fournisseur telematique: <span className="pill warn">MOCK</span> — données simulées explicitement, aucun GPS réel intégré.</div>
      </div></div>
      {rows.length === 0 ? <div className="sub">Aucune position connue — aucun appareil configuré.</div> : (
        <div className="grid cols2">
          <div className="card" style={{ padding: 8 }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1', background: 'var(--bg)', borderRadius: 6 }}>
              <rect x="0" y="0" width="100" height="100" fill="none" stroke="var(--line)" />
              {[[33.6, -7.6, 'Casablanca'], [33.37, -7.59, 'Aéroport CMN'], [33.57, -7.59, 'Mohammedia']].map(([lat, lng, label], i) => {
                const c = proj(Number(lat), Number(lng));
                return <g key={i}><circle cx={c.x} cy={c.y} r="0.8" fill="#9aa7b4" /><text x={c.x + 1.5} y={c.y + 1} fontSize="2.6" fill="#9aa7b4">{label}</text></g>;
              })}
              {pts.map((p) => (
                <g key={p.p.vehicleId}>
                  <circle cx={p.xy.x} cy={p.xy.y} r="1.4" fill={p.p.speedKmh > 5 ? 'var(--warn)' : 'var(--ok)'} />
                  <text x={p.xy.x + 2} y={p.xy.y} fontSize="2.4" fill="var(--text)">{p.plate}</text>
                </g>
              ))}
            </svg>
          </div>
          <div>
            <table className="tbl"><thead><tr><th>Véhicule</th><th>Statut</th><th>Vitesse</th><th>Contact</th><th>Fix</th></tr></thead>
              <tbody>{pts.map((p) => (
                <tr key={p.p.vehicleId}>
                  <td><Link className="mono" href={`/fleet/${p.p.vehicleId}`}>{p.plate}</Link></td>
                  <td><span className="pill info">{p.status}</span></td>
                  <td>{p.p.speedKmh} km/h</td>
                  <td>{p.p.ignitionOn == null ? '—' : p.p.ignitionOn ? 'ON' : 'OFF'}</td>
                  <td className="sub">{new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' }).format(new Date(p.p.fixedAt))}</td>
                </tr>
              ))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}

import { apiFetch } from '@/lib/api';

interface Ev { id: string; reference: string; status: string; pickupAt: string; returnAt: string; customerName: string; plate: string | null; categoryName: string }

export default async function Calendar() {
  const evs = await apiFetch<Ev[]>('/api/reservations/calendar');
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today.getTime() + i * 86400000); return d; });
  const key = (d: Date) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit' }).format(d);
  const sameDay = (a: Date, iso: string) => {
    const fmt = new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit' });
    return fmt.format(a) === fmt.format(new Date(iso));
  };

  return (
    <div>
      <div className="topbar"><div><h1>Calendrier — 7 jours</h1>
        <div className="sub">Bleu = départ · Vert = retour. La disponibilité est garantie par contrainte d'exclusion (aucun chevauchement possible).</div></div></div>
      <div className="cal">
        {days.map((d) => (
          <div key={d.toISOString()} className="day">
            <h4>{new Intl.DateTimeFormat('fr-MA', { weekday: 'short', day: 'numeric' }).format(d)}</h4>
            {evs.filter((e) => sameDay(d, e.pickupAt)).map((e) => (
              <a key={`d-${e.id}`} className="ev dep" href={`/reservations/${e.id}`} title={`${e.customerName ?? e.reference} — ${e.categoryName}`}>
                → {(e.customerName ?? e.reference).split(' ')[0]} {e.plate ? `· ${e.plate}` : ''}
              </a>
            ))}
            {evs.filter((e) => sameDay(d, e.returnAt)).map((e) => (
              <a key={`r-${e.id}`} className="ev ret" href={`/reservations/${e.id}`} title={`${e.customerName ?? e.reference} — retour`}>
                ← {(e.customerName ?? e.reference).split(' ')[0]}
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

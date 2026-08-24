'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Brief du jour' },
  { href: '/today', label: "Aujourd'hui" },
  { href: '/brief', label: 'Briefs' },
  { href: '/reservations', label: 'Réservations' },
  { href: '/calendar', label: 'Calendrier' },
  { href: '/fleet', label: 'Flotte' },
  { href: '/customers', label: 'Clients' },
  { href: '/contracts', label: 'Contrats' },
  { href: '/map', label: 'Positions' },
  { href: '/field', label: 'Terrain (PWA)' },
  { href: '/finance', label: 'Caisse & finances' },
  { href: '/reports', label: 'Rapports' },
  { href: '/alerts', label: 'Alertes' },
];

export default function Shell({ children, user, agency }: { children: React.ReactNode; user: string; agency: string }) {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login'); router.refresh();
  };
  return (
    <div className="layout">
      <aside className="side">
        <div className="logo">loca<span>OS</span></div>
        <div className="agency">{agency}</div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href || (n.href !== '/' && path.startsWith(n.href)) ? 'active' : ''}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div style={{ position: 'absolute', bottom: 14, left: 10, right: 10 }}>
          <div className="sub" style={{ marginBottom: 6 }}>{user}</div>
          <button className="mini" style={{ width: '100%' }} onClick={logout}>Déconnexion</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UI_STRINGS } from '@locaos/domain/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

type NavEntry = { href: string; label: string; labelAr: string; labelEn: string };

const NAV: NavEntry[] = [
  { href: '/', label: UI_STRINGS.MAIN_NAV.fr[0], labelAr: UI_STRINGS.MAIN_NAV.ar[0], labelEn: UI_STRINGS.MAIN_NAV.en[0] },
  { href: '/today', label: UI_STRINGS.MAIN_NAV.fr[1], labelAr: UI_STRINGS.MAIN_NAV.ar[1], labelEn: UI_STRINGS.MAIN_NAV.en[1] },
  { href: '/brief', label: UI_STRINGS.MAIN_NAV.fr[2], labelAr: UI_STRINGS.MAIN_NAV.ar[2], labelEn: UI_STRINGS.MAIN_NAV.en[2] },
  { href: '/reservations', label: UI_STRINGS.MAIN_NAV.fr[3], labelAr: UI_STRINGS.MAIN_NAV.ar[3], labelEn: UI_STRINGS.MAIN_NAV.en[3] },
  { href: '/calendar', label: UI_STRINGS.MAIN_NAV.fr[4], labelAr: UI_STRINGS.MAIN_NAV.ar[4], labelEn: UI_STRINGS.MAIN_NAV.en[4] },
  { href: '/fleet', label: UI_STRINGS.MAIN_NAV.fr[5], labelAr: UI_STRINGS.MAIN_NAV.ar[5], labelEn: UI_STRINGS.MAIN_NAV.en[5] },
  { href: '/customers', label: UI_STRINGS.MAIN_NAV.fr[6], labelAr: UI_STRINGS.MAIN_NAV.ar[6], labelEn: UI_STRINGS.MAIN_NAV.en[6] },
  { href: '/contracts', label: UI_STRINGS.MAIN_NAV.fr[7], labelAr: UI_STRINGS.MAIN_NAV.ar[7], labelEn: UI_STRINGS.MAIN_NAV.en[7] },
  { href: '/map', label: UI_STRINGS.MAIN_NAV.fr[8], labelAr: UI_STRINGS.MAIN_NAV.ar[8], labelEn: UI_STRINGS.MAIN_NAV.en[8] },
  { href: '/field', label: UI_STRINGS.MAIN_NAV.fr[9], labelAr: UI_STRINGS.MAIN_NAV.ar[9], labelEn: UI_STRINGS.MAIN_NAV.en[9] },
  { href: '/finance', label: UI_STRINGS.MAIN_NAV.fr[10], labelAr: UI_STRINGS.MAIN_NAV.ar[10], labelEn: UI_STRINGS.MAIN_NAV.en[10] },
  { href: '/reports', label: UI_STRINGS.MAIN_NAV.fr[11], labelAr: UI_STRINGS.MAIN_NAV.ar[11], labelEn: UI_STRINGS.MAIN_NAV.en[11] },
  { href: '/alerts', label: UI_STRINGS.MAIN_NAV.fr[12], labelAr: UI_STRINGS.MAIN_NAV.ar[12], labelEn: UI_STRINGS.MAIN_NAV.en[12] },
];

export default function Shell({ children, user, agency }: { children: React.ReactNode; user: string; agency: string }) {
  const path = usePathname();
  const router = useRouter();
  const [lang, setLang] = (async () => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/locaos-lang=([^;])/);
      if (match) return match[1] === 'ar' ? 'ar' : 'fr';
      return 'fr';
    }
    return 'fr';
  })();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login'); router.refresh();
  };

  return (
    <html lang={lang} dir={dir}>
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
        <LanguageSwitcher onLangChange={setLang} />
        <div style={{ position: 'absolute', bottom: 14, left: 10, right: 10 }}>
          <div className="sub" style={{ marginBottom: 6 }}>{user}</div>
          <button className="mini" style={{ width: '100%' }} onClick={logout}>Déconnexion</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
    </html>
  );
}
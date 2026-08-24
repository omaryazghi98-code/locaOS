'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UI_STRINGS, FOCUS_STRINGS } from '@locaos/domain/i18n';
import { ROLE_KEYS, type RoleKey } from '@locaos/domain/permissions';
import { LanguageSwitcher } from './LanguageSwitcher';

type Lang = 'fr' | 'ar' | 'en';
type Density = 'compact' | 'comfortable' | 'detailed';
type NavEntry = { href: string; label: string; labelAr: string; labelEn: string; roles: readonly RoleKey[] };

const ALL_ROLES = ROLE_KEYS;
const NAV: NavEntry[] = [
  { href: '/', label: UI_STRINGS.MAIN_NAV.fr[0] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[0] as string, labelEn: UI_STRINGS.MAIN_NAV.en[0] as string, roles: ALL_ROLES },
  { href: '/today', label: UI_STRINGS.MAIN_NAV.fr[1] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[1] as string, labelEn: UI_STRINGS.MAIN_NAV.en[1] as string, roles: ['owner', 'manager', 'agent'] },
  { href: '/brief', label: UI_STRINGS.MAIN_NAV.fr[2] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[2] as string, labelEn: UI_STRINGS.MAIN_NAV.en[2] as string, roles: ALL_ROLES },
  { href: '/reservations', label: UI_STRINGS.MAIN_NAV.fr[3] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[3] as string, labelEn: UI_STRINGS.MAIN_NAV.en[3] as string, roles: ['owner', 'manager', 'agent', 'field_agent'] },
  { href: '/calendar', label: UI_STRINGS.MAIN_NAV.fr[4] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[4] as string, labelEn: UI_STRINGS.MAIN_NAV.en[4] as string, roles: ALL_ROLES },
  { href: '/fleet', label: UI_STRINGS.MAIN_NAV.fr[5] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[5] as string, labelEn: UI_STRINGS.MAIN_NAV.en[5] as string, roles: ['owner', 'manager', 'mechanic'] },
  { href: '/customers', label: UI_STRINGS.MAIN_NAV.fr[6] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[6] as string, labelEn: UI_STRINGS.MAIN_NAV.en[6] as string, roles: ['owner', 'manager', 'agent', 'accountant'] },
  { href: '/contracts', label: UI_STRINGS.MAIN_NAV.fr[7] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[7] as string, labelEn: UI_STRINGS.MAIN_NAV.en[7] as string, roles: ['owner', 'manager', 'agent', 'field_agent'] },
  { href: '/map', label: UI_STRINGS.MAIN_NAV.fr[8] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[8] as string, labelEn: UI_STRINGS.MAIN_NAV.en[8] as string, roles: ['owner', 'manager', 'agent', 'field_agent'] },
  { href: '/focus', label: FOCUS_STRINGS.fr.title, labelAr: FOCUS_STRINGS.ar.title, labelEn: FOCUS_STRINGS.en.title, roles: ['agent', 'field_agent'] },
  { href: '/field', label: UI_STRINGS.MAIN_NAV.fr[9] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[9] as string, labelEn: UI_STRINGS.MAIN_NAV.en[9] as string, roles: ['field_agent'] },
  { href: '/finance', label: UI_STRINGS.MAIN_NAV.fr[10] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[10] as string, labelEn: UI_STRINGS.MAIN_NAV.en[10] as string, roles: ['owner', 'manager', 'accountant'] },
  { href: '/reports', label: UI_STRINGS.MAIN_NAV.fr[11] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[11] as string, labelEn: UI_STRINGS.MAIN_NAV.en[11] as string, roles: ['owner', 'manager', 'agent', 'accountant'] },
  { href: '/alerts', label: UI_STRINGS.MAIN_NAV.fr[12] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[12] as string, labelEn: UI_STRINGS.MAIN_NAV.en[12] as string, roles: ['owner', 'manager', 'agent', 'accountant'] },
];

function readLang(): Lang {
  const match = document.cookie.match(/(?:^|;\s*)locaos-lang=([^;]+)/);
  if (match?.[1] === 'ar' || match?.[1] === 'en') return match[1];
  return 'fr';
}

export default function Shell({ children, user, agency, role }: { children: React.ReactNode; user: string; agency: string; role: RoleKey }) {
  const path = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('fr');
  const [density, setDensity] = useState<Density>('comfortable');

  useEffect(() => {
    const nextLang = readLang();
    setLang(nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';

    const saved = window.localStorage.getItem('locaos-density');
    if (saved === 'compact' || saved === 'comfortable' || saved === 'detailed') setDensity(saved);
  }, []);

  const handleLangChange = (next: Lang) => {
    setLang(next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };

  const setDensityMode = (next: Density) => {
    window.localStorage.setItem('locaos-density', next);
    setDensity(next);
  };

  const filteredNav = NAV.filter((entry) => entry.roles.includes(role));
  const labels = { fr: (n: NavEntry) => n.label, ar: (n: NavEntry) => n.labelAr, en: (n: NavEntry) => n.labelEn }[lang];
  const densityLabel = lang === 'ar' ? (density === 'compact' ? 'مضغوط' : density === 'detailed' ? 'تفصيلي' : 'مريح') : lang === 'en' ? (density === 'compact' ? 'Compact' : density === 'detailed' ? 'Detailed' : 'Comfortable') : (density === 'compact' ? 'Compact' : density === 'detailed' ? 'Détaillé' : 'Confortable');

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="layout">
      <aside className="side">
        <div className="logo">loca<span>OS</span></div>
        <div className="agency">{agency}</div>
        <nav className="nav" aria-label="Primary navigation">
          {filteredNav.map((entry) => (
            <Link key={entry.href} href={entry.href} className={path === entry.href || (entry.href !== '/' && path.startsWith(entry.href)) ? 'active' : ''}>
              {labels(entry)}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher onLangChange={handleLangChange} />
        <div style={{ position: 'absolute', bottom: 14, left: 10, right: 10 }}>
          <div className="sub" style={{ marginBottom: 6 }}>{user}</div>
          <button className="mini" style={{ width: '100%' }} onClick={logout}>{lang === 'ar' ? 'تسجيل الخروج' : lang === 'en' ? 'Log out' : 'Déconnexion'}</button>
          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <span className="sub">{densityLabel}</span>
            <div role="group" aria-label={lang === 'ar' ? 'كثافة العرض' : lang === 'en' ? 'Display density' : 'Densité d’affichage'}>
              <button type="button" aria-label="Compact" aria-pressed={density === 'compact'} onClick={() => setDensityMode('compact')}>C</button>
              <button type="button" aria-label="Comfortable" aria-pressed={density === 'comfortable'} onClick={() => setDensityMode('comfortable')}>Co</button>
              <button type="button" aria-label="Detailed" aria-pressed={density === 'detailed'} onClick={() => setDensityMode('detailed')}>D</button>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

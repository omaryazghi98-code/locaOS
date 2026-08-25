'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UI_STRINGS, FOCUS_STRINGS } from '@locaos/domain/i18n';
import { ROLE_KEYS, type RoleKey } from '@locaos/domain/permissions';
import { LanguageSwitcher } from './LanguageSwitcher';
import { DENSITY_EVENT, LANGUAGE_EVENT, readDensity, readLocale, setDensity, type Density, type Locale } from '@/lib/client-preferences';

type NavEntry = { href: string; label: string; labelAr: string; labelEn: string; roles: readonly RoleKey[] };
const ALL_ROLES = ROLE_KEYS;
const NAV: NavEntry[] = [
  { href: '/', label: UI_STRINGS.MAIN_NAV.fr[0] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[0] as string, labelEn: UI_STRINGS.MAIN_NAV.en[0] as string, roles: ALL_ROLES },
  { href: '/today', label: UI_STRINGS.MAIN_NAV.fr[1] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[1] as string, labelEn: UI_STRINGS.MAIN_NAV.en[1] as string, roles: ['owner', 'manager', 'agent'] },
  { href: '/brief', label: UI_STRINGS.MAIN_NAV.fr[2] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[2] as string, labelEn: UI_STRINGS.MAIN_NAV.en[2] as string, roles: ALL_ROLES },
  { href: '/reservations', label: UI_STRINGS.MAIN_NAV.fr[3] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[3] as string, labelEn: UI_STRINGS.MAIN_NAV.en[3] as string, roles: ['owner', 'manager', 'agent', 'field_agent'] },
  { href: '/calendar', label: UI_STRINGS.MAIN_NAV.fr[4] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[4] as string, labelEn: UI_STRINGS.MAIN_NAV.en[4] as string, roles: ALL_ROLES },
  { href: '/fleet', label: UI_STRINGS.MAIN_NAV.fr[5] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[5] as string, labelEn: UI_STRINGS.MAIN_NAV.en[5] as string, roles: ['owner', 'manager', 'mechanic'] },
  { href: '/customers', label: UI_STRINGS.MAIN_NAV.fr[6] as string, labelAr: UI_STRINGS.MAIN_NAV.en[6] as string, labelEn: UI_STRINGS.MAIN_NAV.en[6] as string, roles: ['owner', 'manager', 'agent', 'accountant'] },
  { href: '/contracts', label: UI_STRINGS.MAIN_NAV.fr[7] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[7] as string, labelEn: UI_STRINGS.MAIN_NAV.en[7] as string, roles: ['owner', 'manager', 'agent', 'field_agent'] },
  { href: '/map', label: UI_STRINGS.MAIN_NAV.fr[8] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[8] as string, labelEn: UI_STRINGS.MAIN_NAV.en[8] as string, roles: ['owner', 'manager', 'agent', 'field_agent'] },
  { href: '/focus', label: FOCUS_STRINGS.fr.title, labelAr: FOCUS_STRINGS.ar.title, labelEn: FOCUS_STRINGS.en.title, roles: ['agent', 'field_agent'] },
  { href: '/field', label: UI_STRINGS.MAIN_NAV.fr[9] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[9] as string, labelEn: UI_STRINGS.MAIN_NAV.en[9] as string, roles: ['field_agent'] },
  { href: '/finance', label: UI_STRINGS.MAIN_NAV.fr[10] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[10] as string, labelEn: UI_STRINGS.MAIN_NAV.en[10] as string, roles: ['owner', 'manager', 'accountant'] },
  { href: '/reports', label: UI_STRINGS.MAIN_NAV.fr[11] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[11] as string, labelEn: UI_STRINGS.MAIN_NAV.en[11] as string, roles: ['owner', 'manager', 'agent', 'accountant'] },
  { href: '/alerts', label: UI_STRINGS.MAIN_NAV.fr[12] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[12] as string, labelEn: UI_STRINGS.MAIN_NAV.en[12] as string, roles: ['owner', 'manager', 'agent', 'accountant'] },
];

export default function Shell({ children, user, agency, role }: { children: React.ReactNode; user: string; agency: string; role: RoleKey }) {
  const path = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Locale>('fr');
  const [density, setDensityState] = useState<Density>('comfortable');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleLanguage = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      setLang(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    };
    const handleDensity = (event: Event) => setDensityState((event as CustomEvent<Density>).detail);
    setLang(readLocale());
    setDensityState(readDensity());
    window.addEventListener(LANGUAGE_EVENT, handleLanguage);
    window.addEventListener(DENSITY_EVENT, handleDensity);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, handleLanguage);
      window.removeEventListener(DENSITY_EVENT, handleDensity);
    };
  }, []);

  useEffect(() => setMobileNavOpen(false), [path]);

  const handleLangChange = (next: Locale) => {
    setLang(next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };

  const filteredNav = NAV.filter((entry) => entry.roles.includes(role));
  const labels = { fr: (n: NavEntry) => n.label, ar: (n: NavEntry) => n.labelAr, en: (n: NavEntry) => n.labelEn }[lang];
  const densityLabel = lang === 'ar' ? (density === 'compact' ? 'مضغوط' : density === 'detailed' ? 'تفصيلي' : 'مريح') : lang === 'en' ? (density === 'compact' ? 'Compact' : density === 'detailed' ? 'Detailed' : 'Comfortable') : (density === 'compact' ? 'Compact' : density === 'detailed' ? 'Détaillé' : 'Confortable');
  const menuLabel = lang === 'ar' ? 'فتح التنقل' : lang === 'en' ? 'Open navigation' : 'Ouvrir la navigation';
  const closeMenuLabel = lang === 'ar' ? 'إغلاق التنقل' : lang === 'en' ? 'Close navigation' : 'Fermer la navigation';

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="layout">
      <button type="button" className="mobile-menu-toggle" aria-controls="primary-navigation" aria-expanded={mobileNavOpen} aria-label={mobileNavOpen ? closeMenuLabel : menuLabel} onClick={() => setMobileNavOpen((open) => !open)}>
        <span aria-hidden="true">☰</span>
      </button>
      {mobileNavOpen && <button type="button" className="mobile-menu-backdrop" aria-label={closeMenuLabel} onClick={() => setMobileNavOpen(false)} />}
      <aside className={`side${mobileNavOpen ? ' open' : ''}`}>
        <div className="logo">loca<span>OS</span></div>
        <div className="agency">{agency}</div>
        <nav id="primary-navigation" className="nav" aria-label={lang === 'ar' ? 'التنقل الرئيسي' : lang === 'en' ? 'Primary navigation' : 'Navigation principale'}>
          {filteredNav.map((entry) => (
            <Link key={entry.href} href={entry.href} className={path === entry.href || (entry.href !== '/' && path.startsWith(entry.href)) ? 'active' : ''} aria-current={path === entry.href ? 'page' : undefined} onClick={() => setMobileNavOpen(false)}>
              <span>{labels(entry)}</span>
            </Link>
          ))}
        </nav>
        <LanguageSwitcher onLangChange={handleLangChange} />
        <div className="shell-footer">
          <div className="sub shell-user">{user}</div>
          <button className="mini shell-logout" onClick={logout}>{lang === 'ar' ? 'تسجيل الخروج' : lang === 'en' ? 'Log out' : 'Déconnexion'}</button>
          <div className="shell-density">
            <span className="sub">{densityLabel}</span>
            <div role="group" aria-label={lang === 'ar' ? 'كثافة العرض' : lang === 'en' ? 'Display density' : 'Densité d’affichage'}>
              <button type="button" aria-label="Compact" aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}>C</button>
              <button type="button" aria-label="Comfortable" aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')}>Co</button>
              <button type="button" aria-label="Detailed" aria-pressed={density === 'detailed'} onClick={() => setDensity('detailed')}>D</button>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

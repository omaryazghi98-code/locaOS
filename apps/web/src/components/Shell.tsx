'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { UI_STRINGS, FOCUS_STRINGS } from '@locaos/domain/i18n';
import { ROLE_KEYS, type RoleKey } from '@locaos/domain/permissions';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NaviQuickPanel } from './navi/NaviQuickPanel';
import { DENSITY_EVENT, LANGUAGE_EVENT, readDensity, readLocale, setDensity, type Density, type Locale } from '@/lib/client-preferences';

type NavEntry = { href: string; label: string; labelAr: string; labelEn: string; roles: readonly RoleKey[] };
const ALL_ROLES = ROLE_KEYS;
const NAV: NavEntry[] = [
  { href: '/navi', label: 'NAVI', labelAr: 'NAVI', labelEn: 'NAVI', roles: ALL_ROLES },
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
  { href: '/ops', label: 'Opérations', labelAr: 'العمليات', labelEn: 'Operations', roles: ['owner', 'manager', 'agent', 'field_agent', 'mechanic'] },
  { href: '/finance', label: UI_STRINGS.MAIN_NAV.fr[10] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[10] as string, labelEn: UI_STRINGS.MAIN_NAV.en[10] as string, roles: ['owner', 'manager', 'accountant'] },
  { href: '/reports', label: UI_STRINGS.MAIN_NAV.fr[11] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[11] as string, labelEn: UI_STRINGS.MAIN_NAV.en[11] as string, roles: ['owner', 'manager', 'agent', 'accountant'] },
  { href: '/alerts', label: UI_STRINGS.MAIN_NAV.fr[12] as string, labelAr: UI_STRINGS.MAIN_NAV.ar[12] as string, labelEn: UI_STRINGS.MAIN_NAV.en[12] as string, roles: ['owner', 'manager', 'agent', 'accountant'] },
];

export default function Shell({ children, user, agency, role }: { children: React.ReactNode; user: string; agency: string; role: RoleKey }) {
  const path = usePathname();
  const router = useRouter();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [lang, setLang] = useState<Locale>('fr');
  const [density, setDensityState] = useState<Density>('comfortable');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [naviQuickOpen, setNaviQuickOpen] = useState(false);

  useEffect(() => {
    const handleLanguage = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      setLang(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    };
    const handleDensity = (event: Event) => setDensityState((event as CustomEvent<Density>).detail);
    document.body.style.overflowX = 'clip';
    setLang(readLocale());
    setDensityState(readDensity());
    window.addEventListener(LANGUAGE_EVENT, handleLanguage);
    window.addEventListener(DENSITY_EVENT, handleDensity);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, handleLanguage);
      window.removeEventListener(DENSITY_EVENT, handleDensity);
      document.body.style.removeProperty('overflow-x');
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setNaviQuickOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, [path]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#primary-navigation a, #primary-navigation button')?.focus());
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!naviQuickOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNaviQuickOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [naviQuickOpen]);

  const handleLangChange = (next: Locale) => {
    setLang(next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  const filteredNav = NAV.filter((entry) => entry.roles.includes(role));
  const labels = { fr: (n: NavEntry) => n.label, ar: (n: NavEntry) => n.labelAr, en: (n: NavEntry) => n.labelEn }[lang];
  const densityLabel = lang === 'ar' ? (density === 'compact' ? 'مضغوط' : density === 'detailed' ? 'تفصيلي' : 'مريح') : lang === 'en' ? (density === 'compact' ? 'Compact' : density === 'detailed' ? 'Detailed' : 'Comfortable') : (density === 'compact' ? 'Compact' : density === 'detailed' ? 'Détaillé' : 'Confortable');
  const densityButtonLabels = lang === 'ar'
    ? { compact: 'مضغوط', comfortable: 'مريح', detailed: 'تفصيلي' }
    : lang === 'en'
      ? { compact: 'Compact', comfortable: 'Comfortable', detailed: 'Detailed' }
      : { compact: 'Compact', comfortable: 'Confortable', detailed: 'Détaillé' };
  const densityGroupLabel = lang === 'ar' ? 'كثافة العرض' : lang === 'en' ? 'Display density' : 'Densité d’affichage';
  const menuLabel = lang === 'ar' ? 'فتح التنقل' : lang === 'en' ? 'Open navigation' : 'Ouvrir la navigation';
  const closeMenuLabel = lang === 'ar' ? 'إغلاق التنقل' : lang === 'en' ? 'Close navigation' : 'Fermer la navigation';
  const naviLabel = lang === 'ar' ? 'فتح NAVI السريع' : lang === 'en' ? 'Open NAVI quick panel' : 'Ouvrir NAVI';

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <style>{`@media (min-width: 768px) and (max-width: 1100px) { .layout{grid-template-columns:228px minmax(0,1fr)} .side{width:228px;padding-inline:10px} .side .agency,.side .sub,.side nav a span,.side .lang-label{display:block} .side .logo{text-align:start;margin-inline:8px} .nav a,.nav button{text-align:start;padding-inline:10px;min-height:40px;display:flex;align-items:center;width:100%} .main{padding-inline:18px} .shell-footer{position:relative!important;inset:auto!important;margin-top:18px} } @media(max-width:767px){ .side:not(.open){visibility:hidden;pointer-events:none} } .shell-footer{margin-top:auto;padding-top:10px;border-top:1px solid var(--line)} .shell-density{display:grid;gap:6px;margin-top:10px} .shell-density > div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px} .shell-density button{min-width:0;min-height:36px;padding-inline:6px} .nav button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:start;min-height:40px;padding:0 10px;border-radius:8px} .nav button:hover,.nav button.active{background:var(--surface-2,#1c2530);color:var(--text,#fff)} @media(max-width:767px){.shell-density button{min-height:44px}} .navi-quick-backdrop{position:fixed;inset:0;z-index:90;border:0;background:rgb(3 7 12 / .52);backdrop-filter:blur(3px);cursor:default} .navi-quick-panel{position:fixed;z-index:91;inset-block:0;inset-inline-end:0;width:min(560px,94vw);overflow:auto;background:var(--panel,#111821);border-inline-start:1px solid var(--line);box-shadow:-24px 0 70px rgb(0 0 0 / .38);padding:24px} .navi-quick-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:16px} .navi-quick-title{display:flex;align-items:center;gap:9px;font-weight:750;letter-spacing:.02em} .navi-quick-sub{margin-top:5px;color:var(--text-soft);font-size:12px} .navi-quick-tools{display:flex;align-items:center;gap:6px} .navi-quick-summary{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;color:var(--text-soft);font-size:12px;background:rgb(255 255 255 / .025)} @media(max-width:767px){.navi-quick-panel{width:100%;padding:18px}.navi-quick-head{padding-top:10px}}`}</style>
      <div className="layout">
        <button ref={menuButtonRef} type="button" className="mobile-menu-toggle" aria-controls="primary-navigation" aria-expanded={mobileNavOpen} aria-label={mobileNavOpen ? closeMenuLabel : menuLabel} onClick={() => setMobileNavOpen((open) => !open)}>
          <span aria-hidden="true">☰</span>
        </button>
        {mobileNavOpen && <button type="button" className="mobile-menu-backdrop" aria-label={closeMenuLabel} onClick={closeMobileNav} />}
        <aside className={`side${mobileNavOpen ? ' open' : ''}`}>
          <div className="logo">loca<span>OS</span></div>
          <div className="agency">{agency}</div>
          <nav id="primary-navigation" className="nav" aria-label={lang === 'ar' ? 'التنقل الرئيسي' : lang === 'en' ? 'Primary navigation' : 'Navigation principale'}>
            {filteredNav.map((entry) => entry.href === '/navi' ? (
              <button key={entry.href} type="button" className={naviQuickOpen ? 'active' : ''} aria-label={naviLabel} aria-pressed={naviQuickOpen} onClick={() => { setNaviQuickOpen(true); setMobileNavOpen(false); }}><span>{labels(entry)}</span></button>
            ) : (
              <Link key={entry.href} href={entry.href} className={path === entry.href || (entry.href !== '/' && path.startsWith(entry.href)) ? 'active' : ''} aria-current={path === entry.href ? 'page' : undefined} onClick={closeMobileNav}><span>{labels(entry)}</span></Link>
            ))}
          </nav>
          <LanguageSwitcher onLangChange={handleLangChange} />
          <div className="shell-footer">
            <div className="sub shell-user">{user}</div>
            <button className="mini shell-logout" onClick={logout}>{lang === 'ar' ? 'تسجيل الخروج' : lang === 'en' ? 'Log out' : 'Déconnexion'}</button>
            <div className="shell-density">
              <span className="sub">{densityLabel}</span>
              <div role="group" aria-label={densityGroupLabel}>
                <button type="button" title={densityButtonLabels.compact} aria-label={densityButtonLabels.compact} aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}>C</button>
                <button type="button" title={densityButtonLabels.comfortable} aria-label={densityButtonLabels.comfortable} aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')}>Co</button>
                <button type="button" title={densityButtonLabels.detailed} aria-label={densityButtonLabels.detailed} aria-pressed={density === 'detailed'} onClick={() => setDensity('detailed')}>D</button>
              </div>
            </div>
          </div>
        </aside>
        <main id="app-content" className="main">{children}</main>
      </div>
      {naviQuickOpen && path !== '/navi' && <NaviQuickPanel open onClose={() => setNaviQuickOpen(false)} />}
    </>
  );
}

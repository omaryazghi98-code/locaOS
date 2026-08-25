'use client';

export type Locale = 'fr' | 'ar' | 'en';
export type Density = 'compact' | 'comfortable' | 'detailed';

export const LANGUAGE_COOKIE = 'locaos-lang';
export const DENSITY_STORAGE_KEY = 'locaos-density';
export const LANGUAGE_EVENT = 'locaos-language-change';
export const DENSITY_EVENT = 'locaos-density-change';

export function readLocale(): Locale {
  const match = document.cookie.match(/(?:^|;\s*)locaos-lang=([^;]+)/);
  if (match?.[1] === 'ar' || match?.[1] === 'en') return match[1];
  return 'fr';
}

export function setLocale(locale: Locale) {
  document.cookie = `${LANGUAGE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  window.dispatchEvent(new CustomEvent<Locale>(LANGUAGE_EVENT, { detail: locale }));
}

export function readDensity(): Density {
  const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return saved === 'compact' || saved === 'detailed' ? saved : 'comfortable';
}

export function setDensity(density: Density) {
  window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  window.dispatchEvent(new CustomEvent<Density>(DENSITY_EVENT, { detail: density }));
}

'use client';

import { useEffect, useState } from 'react';
import { LANGUAGE_EVENT, readLocale, type Locale } from '@/lib/client-preferences';

/** Follows the existing locaos-lang cookie + LANGUAGE_EVENT contract used by Shell. */
export function useLocale(): Locale {
  const [lang, setLang] = useState<Locale>('fr');
  useEffect(() => {
    setLang(readLocale());
    const onLanguage = (event: Event) => setLang((event as CustomEvent<Locale>).detail);
    window.addEventListener(LANGUAGE_EVENT, onLanguage);
    return () => window.removeEventListener(LANGUAGE_EVENT, onLanguage);
  }, []);
  return lang;
}

export const intlLocale = (lang: Locale) => (lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-MA' : 'fr-MA');

/** True when the OS asks for reduced motion. SSR-safe (defaults to false). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

/** Ticks every `ms` — used for "now" markers and relative times. */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

/** Whether the element is visible in the viewport (used to pause heavy effects). */
export function useInViewport<T extends Element>(ref: React.RefObject<T | null>): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

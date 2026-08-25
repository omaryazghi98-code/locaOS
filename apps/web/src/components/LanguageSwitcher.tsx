'use client';

import { useEffect, useState } from 'react';
import { readLocale, setLocale, type Locale } from '@/lib/client-preferences';

export function LanguageSwitcher({ onLangChange }: { onLangChange: (lang: Locale) => void }) {
  const [lang, setLang] = useState<Locale>('fr');

  useEffect(() => {
    setLang(readLocale());
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as Locale;
    setLang(next);
    setLocale(next);
    onLangChange(next);
  };

  return (
    <label>
      <span className="sr-only">Language</span>
      <select value={lang} onChange={handleChange} aria-label="Language">
        <option value="fr">FR</option>
        <option value="ar">AR</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}

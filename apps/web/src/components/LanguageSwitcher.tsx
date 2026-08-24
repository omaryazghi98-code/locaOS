'use client';
import { useEffect, useState } from 'react';

type Lang = 'fr' | 'ar' | 'en';
const LANG_COOKIE = 'locaos-lang';

function setLangCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang};path=/;max-age=31536000;SameSite=Lax`;
}

function readLangCookie(): Lang {
  const match = document.cookie.match(/(?:^|;\s*)locaos-lang=([^;]+)/);
  if (match?.[1] === 'ar' || match?.[1] === 'en') return match[1];
  return 'fr';
}

export function LanguageSwitcher({ onLangChange }: { onLangChange: (lang: Lang) => void }) {
  const [lang, setLang] = useState<Lang>('fr');

  useEffect(() => {
    setLang(readLangCookie());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Lang;
    setLang(next);
    setLangCookie(next);
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

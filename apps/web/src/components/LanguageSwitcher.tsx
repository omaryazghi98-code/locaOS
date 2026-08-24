'use client';
import { useState, useEffect } from 'react';

const LANG_COOKIE = 'locaos-lang';

function setLangCookie(lang: 'fr' | 'ar' | 'en') {
  document.cookie = `${LANG_COOKIE}=${lang};path=/;max-age=31536000`;
}

export function LanguageSwitcher({ onLangChange }: { onLangChange: (lang: 'fr' | 'ar' | 'en') => void }) {
  const [lang, setLang] = useState<'fr' | 'ar' | 'en'>('fr');

  useEffect(() => {
    // Read from cookie on mount
    const match = document.cookie.match(/locaos-lang=([^;])/);
    if (match) setLang(match[1] === 'ar' ? 'ar' : 'fr');
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as 'fr' | 'ar' | 'en';
    if (next !== lang) {
      setLang(next);
      setLangCookie(next);
      onLangChange(next);
    }
  };

  return (
    <select
      value={lang}
      onChange={handleChange}
      style={{ marginLeft: 12, height: '24px', fontSize: '12px' }}
    >
      <option value="fr">FR</option>
      <option value="ar">AR</option>
      <option value="en">EN</option>
    </select>
  );
}
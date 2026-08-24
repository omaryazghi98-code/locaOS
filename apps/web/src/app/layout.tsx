import type { Metadata, Viewport } from 'next';
import './globals.css';
import { UI_STRINGS } from '@locaos/domain/i18n';

export const metadata: Metadata = {
  title: 'locaOS — Console agence',
  description: 'Le système d\'exploitation des agences de location de voitures marocaines',
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor: '#0f1216' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Determine language from cookie (set by client language switcher)
  const lang = (typeof document !== 'undefined' && document.cookie.replace(/(?:(?:^|.*)\slocaos-lang=([^;])).*$|^.*$/, '$1')) === 'ar' ? 'ar' : 'fr';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
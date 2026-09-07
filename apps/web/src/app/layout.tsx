import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import './navi.css';

export const metadata: Metadata = {
  title: 'locaOS — Console agence',
  description: "Le système d'exploitation des agences de location de voitures marocaines",
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor: '#0f1216' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get('locaos-lang')?.value;
  const lang = rawLang === 'ar' ? 'ar' : rawLang === 'en' ? 'en' : 'fr';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'locaOS — Console agence',
  description: 'Le système d\'exploitation des agences de location de voitures marocaines',
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor: '#0f1216' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

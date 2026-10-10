import type { Metadata, Viewport } from 'next';
import '../design/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Relio — Préparation BEPC Mathématiques',
  description:
    'Relio accompagne les élèves de 3e du Cameroun dans leur préparation au BEPC de mathématiques.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // La couleur suit le thème choisi : une barre d'adresse claire sous une page
  // sombre donne l'impression que la page flotte.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F2' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1020' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
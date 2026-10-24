import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tamani',
  description: 'Ta communauté parle. Tu sais quoi acheter.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      {/* Session providers live in (app)/ and (admin)/ layouts so public
          pages (incl. the /c/[code] popup) ship no session JS. */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}

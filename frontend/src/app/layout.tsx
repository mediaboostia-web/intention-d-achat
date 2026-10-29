import type { Metadata, Viewport } from 'next';
import { Andika, Bowlby_One, Kalam } from 'next/font/google';
import { InkFilters } from '@/components/ui/InkFilters';
import { SHELL_PREFS_SCRIPT } from '@/lib/tamani/prefs';
import './globals.css';

// Tamani type roles (docs/brand/tamani-brand.md): Andika for all text,
// Kalam for hand-written titles and notes, Bowlby One for the figures
// that matter. globals.css maps them to font-sans / font-hand / font-sign.
const andika = Andika({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-andika',
  display: 'swap',
});

const kalam = Kalam({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-kalam',
  display: 'swap',
});

const bowlby = Bowlby_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bowlby',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tamani',
  description: 'Ta communauté parle. Tu sais quoi acheter.',
};

export const viewport: Viewport = {
  themeColor: '#1A4FBF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${andika.variable} ${kalam.variable} ${bowlby.variable}`}
      // The shop space sets data-theme and data-sidebar before hydration.
      suppressHydrationWarning
    >
      <head>
        {/* The shop space's night and folded choices, before the first paint (only under /app). */}
        <script dangerouslySetInnerHTML={{ __html: SHELL_PREFS_SCRIPT }} />
      </head>
      {/* Session providers live in (app)/ and (admin)/ layouts so public
          pages (incl. the /c/[code] popup) ship no session JS. */}
      <body>
        <InkFilters />
        {children}
      </body>
    </html>
  );
}

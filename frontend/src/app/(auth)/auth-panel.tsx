'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Illustration } from '@/components/landing/Illustration';
import { Logo } from '@/components/ui';

// The picture of the sign-in pages (porteur, 2026-10-30, enlarged 2026-11-05
// after the AMU capture): a band above the form on a phone, a big rounded
// card that stays in view from lg. Signing up (and its code) asks the
// community first; every other page is a return, where the answers may
// already be waiting. The sentence sits on a deep wash, readable in both themes.
const SIGN_UP = ['/signup', '/verify-email'];

const COPY = {
  up: {
    image: 'inscription',
    title: 'Avant de commander, demande à ta communauté.',
    line: "3 jours d'essai gratuit, sans carte bancaire.",
  },
  in: {
    image: 'connexion',
    title: 'Tes clients ont peut-être déjà répondu.',
    line: 'Connecte-toi pour voir qui veut acheter, et combien.',
  },
} as const;

export function AuthPanel() {
  const pathname = usePathname();
  const copy = SIGN_UP.some((p) => pathname.startsWith(p)) ? COPY.up : COPY.in;
  return (
    <aside className="relative m-3 flex h-56 flex-col justify-between overflow-hidden rounded-card border-[2.5px] border-ink bg-surface p-4 sm:h-64 lg:sticky lg:top-4 lg:m-4 lg:h-[calc(100dvh-2rem)] lg:p-8">
      <Illustration
        name={copy.image}
        alt=""
        sizes="(min-width: 1024px) 46vw, 100vw"
        fill
        className="object-cover object-[center_30%] brightness-[1.03]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-deep/90 via-deep/45 to-transparent"
      />
      {/* Porteur, 2026-11-12: the logo is the way back to the site, no separate button. */}
      <div className="relative flex items-start">
        <Link
          href="/"
          aria-label="Tamani, retour à l'accueil"
          className="inline-flex min-h-11 items-center rounded-control bg-surface px-2 py-1 focus-visible:outline-accent"
        >
          <Logo variant="lockup" size={28} />
        </Link>
      </div>
      <div className="relative max-w-lg text-deep-ink">
        <p className="font-hand text-2xl leading-tight font-bold lg:text-4xl">{copy.title}</p>
        <p className="mt-1 text-sm lg:mt-3 lg:text-lg">{copy.line}</p>
      </div>
    </aside>
  );
}

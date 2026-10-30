'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Illustration } from '@/components/landing/Illustration';
import { Logo } from '@/components/ui';

// The computer-only panel of the sign-in pages (porteur, 2026-10-30): each page
// speaks to the visitor with its own drawing, and stays in view while the form
// scrolls. Signing up (and its code) asks the community first; every other page
// is a return, where the answers may already be waiting.
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
    <aside className="hidden flex-col gap-8 border-r-[2.5px] border-ink bg-surface px-12 pt-12 lg:sticky lg:top-0 lg:flex lg:h-dvh">
      <Link href="/" className="self-start rounded-control focus-visible:outline-accent">
        <Logo variant="lockup" size={34} />
      </Link>
      <div className="max-w-lg">
        <p className="font-hand text-4xl leading-tight font-bold text-ink">{copy.title}</p>
        <p className="mt-3 text-lg text-ink-soft">{copy.line}</p>
      </div>
      <div className="relative min-h-0 flex-1">
        <Illustration
          name={copy.image}
          alt=""
          sizes="(min-width: 1024px) 40vw, 1px"
          fill
          className="object-contain object-bottom brightness-[1.03]"
        />
      </div>
    </aside>
  );
}

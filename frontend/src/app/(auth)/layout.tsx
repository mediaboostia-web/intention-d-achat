import type { ReactNode } from 'react';
import Link from 'next/link';
import { AuthIllustration, Logo } from '@/components/ui';

// Sign-in pages: a narrow column on squared paper and, from lg, a blue panel
// on the left with the promise and a drawing (lot 5b). No session provider —
// the shop space mounts its own once the visitor is signed in.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-2">
      <aside className="hidden flex-col justify-between gap-12 bg-primary p-12 text-primary-ink lg:flex">
        <Link href="/" className="self-start rounded-control focus-visible:outline-accent">
          <Logo variant="lockup" tone="inverse" size={34} />
        </Link>
        <div className="max-w-md">
          <p className="font-hand text-4xl leading-tight font-bold">
            Avant de commander, demande à ta communauté.
          </p>
          <AuthIllustration className="mt-10 w-full" />
        </div>
      </aside>
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pt-8 pb-16 lg:justify-center lg:py-16">
        <Link href="/" className="self-start rounded-control lg:hidden">
          <Logo variant="lockup" size={34} />
        </Link>
        <main className="mt-12 lg:mt-0">{children}</main>
      </div>
    </div>
  );
}

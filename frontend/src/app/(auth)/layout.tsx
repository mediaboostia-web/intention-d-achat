import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui';
import { AuthPanel } from './auth-panel';

// Sign-in pages: a narrow column on squared paper and, from lg, a panel on the
// left that speaks to the visitor with a drawing (lot 5b, redrawn 2026-10-30).
// No session provider — the shop space mounts its own once signed in.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-2 lg:items-start">
      <AuthPanel />
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pt-8 pb-16 lg:min-h-dvh lg:justify-center lg:py-16">
        <Link href="/" className="self-start rounded-control lg:hidden">
          <Logo variant="lockup" size={34} />
        </Link>
        <main className="mt-12 lg:mt-0">{children}</main>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui';

// Sign-in pages: a narrow column on squared paper. No session provider —
// the shop space mounts its own once the visitor is signed in.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pt-8 pb-16">
        <Link href="/" className="self-start rounded-control">
          <Logo variant="lockup" size={34} />
        </Link>
        <main className="mt-12">{children}</main>
      </div>
    </div>
  );
}

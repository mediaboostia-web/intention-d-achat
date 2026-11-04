import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui';
import { ADMIN_HOME, adminRoleLabel } from '@/lib/tamani/admin-nav';
import { AdminNav } from './AdminNav';

/** The back-office frame: the notebook cover on top, the page on squared paper. */
export function AdminShell({
  email,
  role,
  children,
}: {
  email: string;
  role: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg bg-paper text-ink">
      <header className="border-b-[2.5px] border-ink bg-deep text-deep-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-3">
          <Link href={ADMIN_HOME} className="flex min-h-11 items-center gap-2">
            <Logo variant="mark" tone="inverse" size={28} />
            <span className="font-hand text-xl font-bold">Support-admin</span>
          </Link>
          <p className="min-w-0 truncate text-sm">
            {email} · <b>{adminRoleLabel(role)}</b>
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-2">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 lg:py-8">{children}</main>
    </div>
  );
}

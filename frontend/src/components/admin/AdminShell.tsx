import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, Logo } from '@/components/ui';
import { ADMIN_HOME, adminRoleLabel } from '@/lib/tamani/admin-nav';
import { AdminNav } from './AdminNav';
import { SignOutButton } from './SignOutButton';

/**
 * The back-office frame (lot 11b, after the porteur's model): a white sidebar
 * from 1024px (four tabs on top below), a search, then the page on a
 * violet-tinted ground. Inside it the kit's « primary » is the admin violet,
 * so buttons, links and fields leave the shop space's blue pen behind.
 */
export function AdminShell({
  email,
  role,
  unread = 0,
  children,
}: {
  email: string;
  role: string;
  /** What is new in the notifications for this admin (lot 13a). */
  unread?: number;
  children: ReactNode;
}) {
  const who = (
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-ink">{email}</p>
      <p className="text-sm text-admin">{adminRoleLabel(role)}</p>
    </div>
  );
  return (
    <div className="min-h-dvh bg-admin-bg text-ink [--color-primary-ink:var(--color-admin-ink)] [--color-primary:var(--color-admin)] lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-0 lg:h-dvh lg:p-4">
        <div className="flex flex-col gap-3 border-b border-admin-soft bg-surface px-4 pt-3 pb-2 lg:h-full lg:rounded-card lg:border lg:px-3 lg:py-5 lg:shadow-[0_12px_32px_-20px_color-mix(in_srgb,var(--color-admin)_55%,transparent)]">
          <div className="flex items-center justify-between gap-3 lg:px-2">
            <Link href={ADMIN_HOME} className="flex min-h-11 items-center gap-2">
              <Logo variant="mark" size={28} />
              <span className="text-lg font-bold text-ink">Support-admin</span>
            </Link>
            <SignOutButton className="lg:hidden" />
          </div>
          <AdminNav unread={unread} />
          <div className="mt-auto hidden space-y-2 lg:block">
            <div className="rounded-control bg-admin-bg p-3">{who}</div>
            <SignOutButton className="w-full" />
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 lg:px-8 lg:pt-6">
          <form
            action={`${ADMIN_HOME}/boutiques`}
            role="search"
            className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-md"
          >
            <label htmlFor="admin-search" className="sr-only">
              Chercher une boutique
            </label>
            <div className="relative min-w-0 flex-1">
              <Icon
                name="search"
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-muted"
              />
              <input
                id="admin-search"
                name="q"
                type="search"
                placeholder="Boutique ou e-mail du propriétaire"
                className="admin-field w-full pl-10"
              />
            </div>
          </form>
        </div>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

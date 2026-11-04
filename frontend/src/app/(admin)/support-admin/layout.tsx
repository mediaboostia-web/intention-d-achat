import { NextResponse } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/server/middleware';
import { ADMIN_HOME, adminGate } from '@/lib/tamani/admin-nav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Support-admin · Tamani',
  robots: { index: false, follow: false },
};

// Every page below reads the base on the server: the gate runs first.
export default async function SupportAdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireAdmin('ADMIN');
  if (auth instanceof NextResponse) {
    const gate = adminGate(auth.status === 401 ? 401 : 403);
    if (gate === 'login') redirect(`/login?next=${encodeURIComponent(ADMIN_HOME)}`);
    notFound();
  }
  return (
    <AdminShell email={auth.admin.email} role={auth.admin.role}>
      {children}
    </AdminShell>
  );
}

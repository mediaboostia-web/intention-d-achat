import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminOnly } from '@/lib/server/tamani/admin/guard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Support-admin · Tamani',
  robots: { index: false, follow: false },
};

export default async function SupportAdminLayout({ children }: { children: ReactNode }) {
  const admin = await adminOnly();
  return (
    <AdminShell email={admin.email} role={admin.role}>
      {children}
    </AdminShell>
  );
}

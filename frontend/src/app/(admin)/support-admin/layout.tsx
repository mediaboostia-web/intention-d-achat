import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { prisma } from '@/lib/server/prisma';
import { countUnreadFeed } from '@/lib/server/tamani/admin/feed';
import { adminOnly } from '@/lib/server/tamani/admin/guard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Support-admin · Tamani',
  robots: { index: false, follow: false },
};

export default async function SupportAdminLayout({ children }: { children: ReactNode }) {
  const admin = await adminOnly();
  const unread = await countUnreadFeed(prisma, admin.id, new Date());
  return (
    <AdminShell email={admin.email} role={admin.role} unread={unread}>
      {children}
    </AdminShell>
  );
}

import { WaitlistView } from '@/components/admin/WaitlistView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { listWaitlist, waitlistStats } from '@/lib/server/tamani/waitlist';

export default async function AdminWaitlistPage() {
  const viewer = await adminOnly();
  const [rows, stats] = await Promise.all([
    listWaitlist(prisma),
    waitlistStats(prisma, new Date()),
  ]);
  return <WaitlistView rows={rows} stats={stats} canDelete={viewer.role === 'SUPERADMIN'} />;
}

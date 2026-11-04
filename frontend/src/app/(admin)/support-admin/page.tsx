import { DashboardView } from '@/components/admin/DashboardView';
import { prisma } from '@/lib/server/prisma';
import { loadAdminDashboard } from '@/lib/server/tamani/admin/dashboard';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { currentMonth, parseMonth, shiftMonth } from '@/lib/server/tamani/admin/metrics';

export default async function SupportAdminHome({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string | string[] }>;
}) {
  const admin = await adminOnly();
  const now = new Date();
  const current = currentMonth(now);
  const asked = (await searchParams).mois;
  const parsed = parseMonth(typeof asked === 'string' ? asked : null, now);
  // The future has no figures yet.
  const month = parsed > current ? current : parsed;
  const data = await loadAdminDashboard(prisma, month, now);
  return (
    <DashboardView
      data={data}
      prevMonth={shiftMonth(month, -1)}
      nextMonth={month < current ? shiftMonth(month, 1) : null}
      canEdit={admin.role === 'SUPERADMIN'}
    />
  );
}

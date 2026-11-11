import { AdminsSection } from '@/components/admin/AdminsSection';
import { SettingsView } from '@/components/admin/SettingsView';
import { prisma } from '@/lib/server/prisma';
import { listAdmins } from '@/lib/server/tamani/admin/admins';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';

export default async function AdminSettingsPage() {
  const admin = await adminOnly();
  const canEdit = admin.role === 'SUPERADMIN';
  const [settings, admins] = await Promise.all([loadPlatformSettings(prisma), listAdmins(prisma)]);
  return (
    <div className="space-y-10">
      <SettingsView
        settings={settings}
        canEdit={canEdit}
        appUrl={process.env.APP_URL ?? 'http://localhost:3000'}
      />
      <AdminsSection admins={admins} viewerId={admin.id} canEdit={canEdit} />
    </div>
  );
}

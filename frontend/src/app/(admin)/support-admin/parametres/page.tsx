import { SettingsView } from '@/components/admin/SettingsView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';

export default async function AdminSettingsPage() {
  const admin = await adminOnly();
  const settings = await loadPlatformSettings(prisma);
  return (
    <SettingsView
      settings={settings}
      canEdit={admin.role === 'SUPERADMIN'}
      appUrl={process.env.APP_URL ?? 'http://localhost:3000'}
    />
  );
}

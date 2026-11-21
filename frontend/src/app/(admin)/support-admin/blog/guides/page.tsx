import { GuidesManager } from '@/components/admin/blog/GuidesManager';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { listGuides } from '@/lib/server/tamani/blog';

export default async function AdminBlogGuidesPage() {
  const viewer = await adminOnly();
  return <GuidesManager guides={await listGuides(prisma)} canEdit={viewer.role === 'SUPERADMIN'} />;
}

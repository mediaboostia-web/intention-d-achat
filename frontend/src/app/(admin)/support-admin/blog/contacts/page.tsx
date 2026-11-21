import { LeadsView } from '@/components/admin/blog/LeadsView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { listLeads } from '@/lib/server/tamani/blog';

export default async function AdminBlogContactsPage() {
  await adminOnly();
  return <LeadsView rows={await listLeads(prisma)} />;
}

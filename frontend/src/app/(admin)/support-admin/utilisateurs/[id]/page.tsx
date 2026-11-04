import { notFound } from 'next/navigation';
import { UserDetailView } from '@/components/admin/UserDetailView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { getAdminUser } from '@/lib/server/tamani/admin/users';

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await adminOnly();
  const { id } = await params;
  const user = await getAdminUser(prisma, id, new Date());
  if (!user) notFound();
  return <UserDetailView user={user} viewer={{ id: admin.id, role: admin.role }} />;
}

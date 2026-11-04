import { UsersView } from '@/components/admin/UsersView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { listAdminUsers } from '@/lib/server/tamani/admin/users';
import { parseUserQuery } from '@/lib/tamani/admin-users';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await adminOnly();
  const query = parseUserQuery(await searchParams);
  const list = await listAdminUsers(prisma, query, new Date());
  return <UsersView list={list} query={query} canCreate={admin.role === 'SUPERADMIN'} />;
}

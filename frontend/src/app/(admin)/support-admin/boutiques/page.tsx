import { ShopsView } from '@/components/admin/ShopsView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { listAdminShops } from '@/lib/server/tamani/admin/shops';
import { parseShopQuery } from '@/lib/tamani/admin-shops';

export default async function AdminShopsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await adminOnly();
  const query = parseShopQuery(await searchParams);
  const list = await listAdminShops(prisma, query, new Date());
  return <ShopsView list={list} query={query} />;
}

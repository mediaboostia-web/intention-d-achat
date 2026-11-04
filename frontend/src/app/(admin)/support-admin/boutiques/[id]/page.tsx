import { notFound } from 'next/navigation';
import { ShopDetailView } from '@/components/admin/ShopDetailView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { getAdminShop } from '@/lib/server/tamani/admin/shops';

export default async function AdminShopPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await adminOnly();
  const { id } = await params;
  const shop = await getAdminShop(prisma, id, new Date());
  if (!shop) notFound();
  return <ShopDetailView shop={shop} canEdit={admin.role === 'SUPERADMIN'} />;
}

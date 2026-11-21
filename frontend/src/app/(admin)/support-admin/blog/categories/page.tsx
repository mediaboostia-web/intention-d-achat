import { CategoriesManager } from '@/components/admin/blog/CategoriesManager';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { listCategories } from '@/lib/server/tamani/blog';

export default async function AdminBlogCategoriesPage() {
  const viewer = await adminOnly();
  return (
    <CategoriesManager
      categories={await listCategories(prisma)}
      canEdit={viewer.role === 'SUPERADMIN'}
    />
  );
}

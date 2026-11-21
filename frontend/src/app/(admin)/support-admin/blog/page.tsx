import { PostsView } from '@/components/admin/blog/PostsView';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { adminPosts, blogStats, listCategories } from '@/lib/server/tamani/blog';

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function AdminBlogPage({ searchParams }: { searchParams: Search }) {
  const viewer = await adminOnly();
  const sp = await searchParams;
  const filter = { q: one(sp['q']), status: one(sp['status']), categorie: one(sp['categorie']) };
  const [rows, stats, categories] = await Promise.all([
    adminPosts(prisma, { q: filter.q, status: filter.status, categoryId: filter.categorie }),
    blogStats(prisma, new Date()),
    listCategories(prisma),
  ]);
  return (
    <PostsView
      rows={rows}
      stats={stats}
      categories={categories}
      filter={filter}
      canEdit={viewer.role === 'SUPERADMIN'}
    />
  );
}

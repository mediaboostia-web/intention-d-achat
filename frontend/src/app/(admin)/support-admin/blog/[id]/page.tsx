import { notFound } from 'next/navigation';
import { PostEditor } from '@/components/admin/blog/PostEditor';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { adminPost, listCategories, listGuides } from '@/lib/server/tamani/blog';

export default async function AdminEditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await adminOnly();
  if (viewer.role !== 'SUPERADMIN') notFound();
  const { id } = await params;
  const [post, categories, guides] = await Promise.all([
    adminPost(prisma, id),
    listCategories(prisma),
    listGuides(prisma),
  ]);
  if (!post) notFound();
  return <PostEditor key={post.id} post={post} categories={categories} guides={guides} />;
}

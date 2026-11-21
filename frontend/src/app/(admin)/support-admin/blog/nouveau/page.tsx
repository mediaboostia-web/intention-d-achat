import { notFound } from 'next/navigation';
import { PostEditor } from '@/components/admin/blog/PostEditor';
import { prisma } from '@/lib/server/prisma';
import { adminOnly } from '@/lib/server/tamani/admin/guard';
import { listCategories, listGuides } from '@/lib/server/tamani/blog';

export default async function AdminNewPostPage() {
  const viewer = await adminOnly();
  if (viewer.role !== 'SUPERADMIN') notFound();
  const [categories, guides] = await Promise.all([listCategories(prisma), listGuides(prisma)]);
  return <PostEditor post={null} categories={categories} guides={guides} />;
}

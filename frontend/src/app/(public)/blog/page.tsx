import type { Metadata } from 'next';
import { BlogIndexView } from '@/components/blog/BlogIndexView';
import { BlogShell } from '@/components/blog/BlogShell';
import { prisma } from '@/lib/server/prisma';
import { defaultGuide, listCategories, listPublishedPosts } from '@/lib/server/tamani/blog';
import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';
import { blogIndexMetadata, pageNumber } from '@/lib/tamani/blog';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';

export function generateMetadata(): Metadata {
  return blogIndexMetadata(appUrl());
}

/** The blog's index (lot 13d): readable by anyone, no account. */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = pageNumber((await searchParams)['page']);
  const [settings, list, categories, guide] = await Promise.all([
    loadPlatformSettings(prisma),
    listPublishedPosts(prisma, { page }),
    listCategories(prisma),
    defaultGuide(prisma),
  ]);
  return (
    <BlogShell links={settings.links} contactEmail={settings.contactEmail}>
      <BlogIndexView
        posts={list.posts}
        total={list.total}
        page={page}
        categories={categories.filter((c) => c.published > 0)}
        current={null}
        guide={guide}
      />
    </BlogShell>
  );
}

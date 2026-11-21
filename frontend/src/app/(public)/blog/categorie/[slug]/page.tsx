import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { BlogIndexView } from '@/components/blog/BlogIndexView';
import { BlogShell } from '@/components/blog/BlogShell';
import { prisma } from '@/lib/server/prisma';
import {
  defaultGuide,
  findCategory,
  listCategories,
  listPublishedPosts,
} from '@/lib/server/tamani/blog';
import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';
import { blogIndexMetadata, pageNumber } from '@/lib/tamani/blog';

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';
const category = cache((slug: string) => findCategory(prisma, slug));

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await category((await params).slug);
  return found ? blogIndexMetadata(appUrl(), found) : { robots: { index: false } };
}

/** One category's articles (lot 13d). */
export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const found = await category((await params).slug);
  if (!found) notFound();
  const page = pageNumber((await searchParams)['page']);
  const [settings, list, categories, guide] = await Promise.all([
    loadPlatformSettings(prisma),
    listPublishedPosts(prisma, { categoryId: found.id, page }),
    listCategories(prisma),
    defaultGuide(prisma),
  ]);
  return (
    <BlogShell links={settings.links} contactEmail={settings.contactEmail}>
      <BlogIndexView
        posts={list.posts}
        total={list.total}
        page={page}
        categories={categories.filter((c) => c.published > 0 || c.slug === found.slug)}
        current={{ slug: found.slug, name: found.name }}
        guide={guide}
      />
    </BlogShell>
  );
}

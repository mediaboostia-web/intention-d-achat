import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ArticleView } from '@/components/blog/ArticleView';
import { BlogShell } from '@/components/blog/BlogShell';
import { prisma } from '@/lib/server/prisma';
import { getPublishedPost, relatedPosts } from '@/lib/server/tamani/blog';
import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';
import { blogPostJsonLd, blogPostMetadata, blogPostUrl } from '@/lib/tamani/blog';
import { renderDoc } from '@/lib/tamani/blog-render';
import { LANDING_SIGNUP_HREF, LANDING_SIGNUP_LABEL } from '@/lib/tamani/landing';

// Built on the first visit, then kept; every admin change rebuilds /blog.
export const revalidate = 3600;

const appUrl = () => process.env.APP_URL ?? 'http://localhost:3000';
const article = cache((slug: string) => getPublishedPost(prisma, slug));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await article((await params).slug);
  return found ? blogPostMetadata(appUrl(), found.post) : { robots: { index: false } };
}

/** One article (lot 13d), « Discret » layout: the actions wait at the end. */
export default async function BlogArticlePage({ params }: Props) {
  const found = await article((await params).slug);
  if (!found) notFound();
  const { post, content, guide } = found;
  const siteHost = new URL(appUrl()).hostname;
  const { html, toc } = renderDoc(content, { siteHost });
  const [settings, related] = await Promise.all([
    loadPlatformSettings(prisma),
    relatedPosts(prisma, { id: post.id, categorySlug: post.category?.slug ?? null }),
  ]);
  return (
    <BlogShell
      links={settings.links}
      contactEmail={settings.contactEmail}
      jsonLd={blogPostJsonLd(appUrl(), post)}
    >
      <ArticleView
        post={post}
        html={html}
        toc={toc}
        url={blogPostUrl(appUrl(), post.slug)}
        guide={guide}
        related={related}
        signupHref={LANDING_SIGNUP_HREF}
        signupLabel={LANDING_SIGNUP_LABEL}
        community={settings.links.community}
      />
    </BlogShell>
  );
}

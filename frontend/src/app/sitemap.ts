import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/server/prisma';
import { blogSitemap } from '@/lib/server/tamani/blog';
import { LEGAL_PAGES, LEGAL_SLUGS } from '@/lib/tamani/legal';

// Rebuilt at most every hour, and at once when an article changes (rebuildBlog).
export const revalidate = 3600;

/**
 * The public pages worth indexing: the home page, /forfaits, the waitlist,
 * the blog with its published articles and categories (lot 13d), the legal
 * pages. When the database does not answer, the fixed pages still go out.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  const blog = await blogSitemap(prisma).catch(() => ({ posts: [], categories: [] }));
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/forfaits`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/liste-attente`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/blog`, changeFrequency: 'daily', priority: 0.8 },
    ...blog.posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...blog.categories.map((c) => ({
      url: `${base}/blog/categorie/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...LEGAL_SLUGS.map((slug) => ({
      url: `${base}${LEGAL_PAGES[slug].path}`,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ];
}

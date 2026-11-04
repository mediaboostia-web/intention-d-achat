import type { MetadataRoute } from 'next';
import { LEGAL_PAGES, LEGAL_SLUGS } from '@/lib/tamani/legal';

// The public pages worth indexing: the home page and the legal pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    ...LEGAL_SLUGS.map((slug) => ({
      url: `${base}${LEGAL_PAGES[slug].path}`,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ];
}

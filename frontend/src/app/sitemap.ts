import type { MetadataRoute } from 'next';

// The public pages worth indexing. /confidentialite and /cgu join when they ship (lot 9).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return [{ url: `${base}/`, changeFrequency: 'weekly', priority: 1 }];
}

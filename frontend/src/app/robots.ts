import type { MetadataRoute } from 'next';

// The shop space, the admin and the API stay out of search engines. The popup
// pages /c/<code> stay reachable: WhatsApp and Facebook read their previews
// there, and each one carries its own noindex.
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/admin', '/api'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

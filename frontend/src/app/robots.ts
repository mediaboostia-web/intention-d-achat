import type { MetadataRoute } from 'next';

// The shop space, both admins (/admin, /support-admin) and the API stay out
// of search engines; AI search crawlers are welcome everywhere else. The popup
// pages /c/<code> stay reachable: WhatsApp and Facebook read their previews
// there, and each one carries its own noindex.
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app', '/admin', '/support-admin', '/api'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}

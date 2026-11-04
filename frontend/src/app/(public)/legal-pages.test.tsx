// The four legal pages (2026-11-04): one page each, linked together, from the
// footer and from sign-up, and listed in the sitemap.
import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { mockNextNavigation } from '@/test-utils/next-navigation';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const pages = {
  '/cgu': (await import('./cgu/page')).default,
  '/confidentialite': (await import('./confidentialite/page')).default,
  '/securite': (await import('./securite/page')).default,
  '/mentions-legales': (await import('./mentions-legales/page')).default,
};
const { LandingFooter } = await import('@/components/landing/LandingFooter');
const { default: SignupPage } = await import('../(auth)/signup/page');
const { default: sitemap } = await import('../sitemap');

describe('legal pages', () => {
  it('each page has one title, the date, the contact and links to the three others', () => {
    for (const [path, Page] of Object.entries(pages)) {
      const out = html(<Page />);
      expect(out.match(/<h1/g), path).toHaveLength(1);
      expect(text(<Page />), path).toContain('Mis à jour le 4 novembre 2026');
      expect(out, path).toContain('href="mailto:hullysdesire@gmail.com"');
      for (const other of Object.keys(pages).filter((p) => p !== path)) {
        expect(out, `${path} → ${other}`).toContain(`href="${other}"`);
      }
      expect(out, path).toContain('href="/"');
    }
  });

  it('the footer links to the four pages', () => {
    const out = html(<LandingFooter />);
    for (const path of Object.keys(pages)) expect(out).toContain(`href="${path}"`);
  });

  it('sign-up says the account accepts the terms and the privacy policy', () => {
    mockNextNavigation({ pathname: '/signup' });
    const out = html(<SignupPage />);
    expect(out).toContain('href="/cgu"');
    expect(out).toContain('href="/confidentialite"');
  });

  it('the sitemap lists them', () => {
    const urls = sitemap().map((u) => new URL(u.url).pathname);
    for (const path of Object.keys(pages)) expect(urls).toContain(path);
  });
});

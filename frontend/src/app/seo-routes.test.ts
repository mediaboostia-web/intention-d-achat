import { afterEach, describe, it, expect, vi } from 'vitest';
import { GET as llmsTxt } from './llms.txt/route';
import robots from './robots';
import sitemap from './sitemap';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('robots.txt', () => {
  it('keeps crawlers out of the shop space, both admins and the API, and points to the sitemap', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    const r = robots();
    expect(r.rules).toEqual([
      { userAgent: '*', allow: '/', disallow: ['/app', '/admin', '/support-admin', '/api'] },
    ]);
    expect(r.sitemap).toBe('https://tamani.app/sitemap.xml');
  });

  it('blocks no AI search crawler', () => {
    const agents = JSON.stringify(robots().rules);
    for (const bot of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'Google-Extended', 'Bingbot']) {
      expect(agents).not.toContain(bot);
    }
  });

  it('lets link previews reach the popup pages (they carry noindex themselves)', () => {
    expect(JSON.stringify(robots().rules)).not.toContain('/c/');
  });
});

describe('sitemap.xml', () => {
  it('lists the home page, /forfaits, then the legal pages', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app');
    const legal = (path: string) => ({
      url: `https://tamani.app${path}`,
      changeFrequency: 'yearly',
      priority: 0.2,
    });
    expect(sitemap()).toEqual([
      { url: 'https://tamani.app/', changeFrequency: 'weekly', priority: 1 },
      { url: 'https://tamani.app/forfaits', changeFrequency: 'monthly', priority: 0.9 },
      legal('/cgu'),
      legal('/confidentialite'),
      legal('/securite'),
      legal('/mentions-legales'),
    ]);
  });
});

describe('llms.txt', () => {
  it('says what Tamani is and links the home, pricing and FAQ', async () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    const res = llmsTxt();
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    const body = await res.text();
    expect(body.startsWith('# Tamani')).toBe(true);
    for (const url of [
      'https://tamani.app/',
      'https://tamani.app/forfaits',
      'https://tamani.app/#faq',
    ]) {
      expect(body).toContain(url);
    }
    expect(body).toContain('moins de 30 secondes');
  });
});

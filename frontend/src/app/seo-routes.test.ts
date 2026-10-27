import { afterEach, describe, it, expect, vi } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('robots.txt', () => {
  it('keeps crawlers out of the shop space, the admin and the API, and points to the sitemap', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    const r = robots();
    expect(r.rules).toEqual([{ userAgent: '*', allow: '/', disallow: ['/app', '/admin', '/api'] }]);
    expect(r.sitemap).toBe('https://tamani.app/sitemap.xml');
  });

  it('lets link previews reach the popup pages (they carry noindex themselves)', () => {
    expect(JSON.stringify(robots().rules)).not.toContain('/c/');
  });
});

describe('sitemap.xml', () => {
  it('lists the home page', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app');
    expect(sitemap()).toEqual([
      { url: 'https://tamani.app/', changeFrequency: 'weekly', priority: 1 },
    ]);
  });
});

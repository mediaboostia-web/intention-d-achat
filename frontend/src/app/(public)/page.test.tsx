import { afterEach, describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import HomePage, { generateMetadata } from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/ (the home page)', () => {
  it('renders every section, the bar, the footer and the skip link', () => {
    const out = html(<HomePage />);
    for (const id of [
      'contenu',
      'film',
      'probleme',
      'solution',
      'comment-ca-marche',
      'avant-apres',
      'tarifs',
      'communaute',
      'questions',
      'lp-footer',
    ]) {
      expect(out, id).toContain(`id="${id}"`);
    }
    // React hoists the hero illustration's preload hint ahead of the page.
    expect(out).toMatch(
      /^<link rel="preload" as="image" imageSrcSet="[^"]*%2Faccueil%2Fhero\.webp/,
    );
    expect(out).toContain('<div class="lp">');
    expect(text(<HomePage />)).toContain('Aller au contenu');
    expect(out).toContain('class="lp-nav"');
    expect(out).toContain('class="lp-sticky"');
  });

  it('embeds the JSON-LD graph, readable by JSON.parse', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app');
    const m = html(<HomePage />).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(m).not.toBeNull();
    const ld = JSON.parse(m![1]!) as { '@graph': { '@type': string }[] };
    expect(ld['@graph'].map((n) => n['@type'])).toEqual([
      'Organization',
      'WebSite',
      'SoftwareApplication',
      'FAQPage',
    ]);
    expect(m![1]).not.toContain('<');
  });

  it('generateMetadata reads APP_URL', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    expect(generateMetadata().alternates?.canonical).toBe('https://tamani.app/');
  });
});

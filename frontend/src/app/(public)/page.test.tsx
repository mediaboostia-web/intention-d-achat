import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '@/lib/tamani/platform-settings';

vi.mock('@/lib/server/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/tamani/platform-settings', () => ({ loadPlatformSettings: vi.fn() }));

import { loadPlatformSettings } from '@/lib/server/tamani/platform-settings';
import HomePage, { generateMetadata } from './page';

const SAVED: PlatformSettings = {
  displayName: 'Tamani',
  contactEmail: 'bonjour@tamani.app',
  links: {
    whatsappContact: 'https://wa.me/2290100000000',
    community: null,
    facebook: 'https://www.facebook.com/tamani.app',
    instagram: null,
    tiktok: null,
  },
  video: null,
};

beforeEach(() => {
  vi.mocked(loadPlatformSettings).mockReset().mockResolvedValue(DEFAULT_PLATFORM_SETTINGS);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const page = async () => html(await HomePage());
const jsonLdOf = (out: string) =>
  out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];

describe('/ (the home page)', () => {
  it('renders every section, the bar, the footer and the skip link', async () => {
    const out = await page();
    for (const id of [
      'contenu',
      'film',
      'probleme',
      'fonctionnalites',
      'comment-ca-marche',
      'benefices',
      'communaute',
      'faq',
      'final',
      'contact',
    ]) {
      expect(out, id).toContain(`id="${id}"`);
    }
    // React hoists the hero illustration's preload hint ahead of the page.
    expect(out).toMatch(
      /^<link rel="preload" as="image" imageSrcSet="[^"]*%2Faccueil%2Fhero\.webp/,
    );
    expect(out).toContain('<div class="lp">');
    expect(text(await HomePage())).toContain('Aller au contenu');
    expect(out).toContain('class="lp-nav"');
    expect(out).toContain('class="lp-sticky"');
  });

  it('has no price grid: the prices live on /forfaits', async () => {
    const out = await page();
    expect(out).not.toContain('lp-rail');
    expect(out).not.toContain('Le meilleur prix par réponse');
    expect(out).toContain('href="/forfaits"');
  });

  it('embeds the JSON-LD graph, readable by JSON.parse', async () => {
    vi.stubEnv('APP_URL', 'https://tamani.app');
    const ld = jsonLdOf(await page());
    expect(ld).toBeDefined();
    const graph = JSON.parse(ld!) as { '@graph': { '@type': string }[] };
    expect(graph['@graph'].map((n) => n['@type'])).toEqual([
      'Organization',
      'WebSite',
      'SoftwareApplication',
      'FAQPage',
    ]);
    expect(ld).not.toContain('<');
  });

  // Porteur 2026-11-08: sign-up is open again; the waitlist is one link, in the footer.
  it('every sign-up button leads to sign-up; the waitlist is only in the footer', async () => {
    const out = html(await HomePage());
    expect(out).toContain('href="/login"');
    const ctas = out.match(/<a [^>]*href="\/signup"[^>]*>[\s\S]*?<\/a>/g) ?? [];
    expect(ctas.length).toBeGreaterThanOrEqual(6);
    for (const a of ctas)
      expect(text(<div dangerouslySetInnerHTML={{ __html: a }} />)).toMatch(
        /Commencer gratuitement|Créer mon compte gratuit/,
      );
    expect(out.match(/href="\/liste-attente"/g)).toHaveLength(1);
    const footer = out.slice(out.indexOf('<footer'));
    expect(footer).toContain('href="/liste-attente"');
    expect(text(await HomePage())).not.toContain('Essayer gratuitement');
  });

  it('generateMetadata reads APP_URL', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    expect(generateMetadata().alternates?.canonical).toBe('https://tamani.app/');
  });
});

describe('/ reads the platform settings (lot 13a)', () => {
  beforeEach(() => {
    vi.mocked(loadPlatformSettings).mockResolvedValue(SAVED);
  });

  it('puts the saved Facebook page in the footer and in sameAs', async () => {
    const out = await page();
    const foot = out.slice(out.indexOf('id="contact"'));
    expect(foot).toContain('href="https://www.facebook.com/tamani.app"');
    const graph = JSON.parse(jsonLdOf(out)!) as {
      '@graph': { sameAs?: string[]; contactPoint?: { email: string } }[];
    };
    expect(graph['@graph'][0]?.sameAs).toEqual(['https://www.facebook.com/tamani.app']);
    expect(graph['@graph'][0]?.contactPoint?.email).toBe('bonjour@tamani.app');
  });

  it('shows the sign-up button in the community section when no group is saved', async () => {
    const out = await page();
    const community = out.slice(out.indexOf('id="communaute"'), out.indexOf('id="faq"'));
    expect(community).toContain('href="/signup"');
    expect(community).not.toContain('chat.whatsapp.com');
  });

  it('writes the saved contact address in the footer', async () => {
    const out = await page();
    const foot = out.slice(out.indexOf('id="contact"'));
    expect(foot).toContain('href="mailto:bonjour@tamani.app"');
    expect(text(await HomePage())).toContain('bonjour@tamani.app');
  });
});

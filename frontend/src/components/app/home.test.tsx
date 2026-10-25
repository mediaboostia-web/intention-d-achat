import { describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { ShopSummary } from '@/lib/tamani/home-view';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider } from '@/test-utils/shop-context';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { HomeView } = await import('./HomeView');

const SUMMARY: ShopSummary = {
  week: { completed: 12, sinceYesterday: 2, interested: 7, opensRunning: 340, newClients: 4 },
  activity: [
    {
      kind: 'RESPONSE',
      id: 'resp_1',
      at: '2026-10-25T10:00:00.000Z',
      campaignId: 'c1',
      productName: 'Riz parfumé',
      unitLabel: 'sac',
      locked: false,
      interested: true,
      quantity: 3,
    },
    {
      kind: 'RESPONSE',
      id: 'resp_2',
      at: '2026-10-25T09:00:00.000Z',
      campaignId: 'c2',
      productName: 'Huile',
      unitLabel: 'bidon',
      locked: false,
      interested: false,
      quantity: null,
    },
    {
      kind: 'NEW_CLIENT',
      id: 'r1',
      at: '2026-10-25T08:00:00.000Z',
      respondentId: 'r1',
      firstName: 'Awa',
    },
  ],
  upcoming: [
    { kind: 'ARRIVES', campaignId: 'c1', title: 'Riz parfumé', at: '2026-11-04T12:00:00.000Z' },
  ],
  hasCampaign: true,
  hasProduct: true,
  shareCampaign: {
    id: 'c1',
    title: 'Riz parfumé',
    shareMessage: '*Riz parfumé* https://x/c/Ab3dE7x',
  },
};

const render = (summary: ShopSummary) => {
  mockNextNavigation({ pathname: '/app' });
  const el = (
    <ShopTestProvider>
      <HomeView summary={summary} />
    </ShopTestProvider>
  );
  return { out: html(el), t: text(el) };
};

const anchors = (out: string) => out.match(/<a [^>]*>/g) ?? [];
const hrefs = (out: string) => anchors(out).map((a) => /href="([^"]*)"/.exec(a)?.[1] ?? '');

describe('HomeView', () => {
  it('an empty shop sees the first steps, not the week card', () => {
    const { out, t } = render({
      ...SUMMARY,
      week: { completed: 0, sinceYesterday: 0, interested: 0, opensRunning: 0, newClients: 0 },
      activity: [],
      upcoming: [],
      hasCampaign: false,
      hasProduct: false,
      shareCampaign: null,
    });
    expect(t).toContain('Pour bien démarrer');
    expect(t).toContain('Ajoute un produit');
    expect(t).toContain('Crée et partage une campagne');
    expect(t).not.toContain('Cette semaine');
    expect(t).not.toContain('Activité');
    expect(hrefs(out)).toContain('/app/produits/nouveau');
  });

  it('the week card shows the big figure and since yesterday', () => {
    const { out, t } = render(SUMMARY);
    expect(t).toContain('Cette semaine');
    expect(t).toMatch(/\b12\b/);
    expect(t).toContain('+2 depuis hier');
    const links = anchors(out);
    const link = (href: string) => links.find((a) => a.includes(`href="${href}"`)) ?? '';
    expect(t).toContain('intéressés');
    expect(t).toContain('ouvertures en cours');
    expect(t).toContain('nouveaux clients');
    expect(link('/app/campagnes')).not.toBe('');
    expect(link('/app/campagnes?statut=ACTIVE')).not.toBe('');
    expect(link('/app/clients')).not.toBe('');
  });

  it('the share round opens WhatsApp with the message', () => {
    const { out } = render(SUMMARY);
    expect(hrefs(out).some((h) => h.startsWith('https://wa.me/?text='))).toBe(true);
    const none = render({ ...SUMMARY, shareCampaign: null });
    expect(hrefs(none.out).some((h) => h.startsWith('https://wa.me/'))).toBe(false);
    expect(none.t).toContain('Partager');
  });

  it('each activity row opens its page', () => {
    const { out, t } = render(SUMMARY);
    const list = out.match(/<ul[^>]*aria-label="Activité"[^>]*>.*?<\/ul>/s)?.[0] ?? '';
    expect(hrefs(list)).toEqual(['/app/campagnes/c1', '/app/campagnes/c2', '/app/clients/r1']);
    expect(list).toMatch(/text-success[^>]*>3 sacs/);
    expect(list).toMatch(/text-danger[^>]*>non/);
    expect(t).toContain('Awa');
  });

  it('upcoming shows only when there is something', () => {
    expect(render(SUMMARY).t).toContain('À venir');
    expect(render(SUMMARY).t).toContain('Arrivage de Riz parfumé');
    expect(render({ ...SUMMARY, upcoming: [] }).t).not.toContain('À venir');
  });
});

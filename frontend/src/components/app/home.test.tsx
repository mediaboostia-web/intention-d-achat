import { describe, it, expect, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { ShopSummary } from '@/lib/tamani/home-view';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider, TEST_SHOP } from '@/test-utils/shop-context';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);
// A phone that could receive notifications: the home page still asks nothing (§7).
vi.mock('./use-push', () => ({
  usePush: () => ({ state: 'ask', ready: true, busy: false, error: null, enable: async () => {} }),
}));

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
  campaigns: [],
  moneyProtectedThisMonth: 0,
  todo: [],
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
  it('« À faire maintenant » asks to tell the interested people of an arrival', () => {
    const { out, t } = render({
      ...SUMMARY,
      todo: [{ kind: 'NOTIFY_INTERESTED', campaignId: 'c2', title: 'Huile', interested: 4 }],
    });
    expect(t).toContain('À faire maintenant');
    expect(t).toContain('Préviens tes 4 intéressés');
    expect(t).toContain('Arrivage de Huile');
    expect(hrefs(out)).toContain('/app/campagnes/c2?onglet=interesses');
    // Nothing to do: the phone shows no block; the desktop column says so.
    expect(render(SUMMARY).out).not.toContain('aria-labelledby="m-todo-title"');
  });

  it('« À faire maintenant » lists the orders to confirm and to deliver', () => {
    const { out, t } = render({
      ...SUMMARY,
      todo: [
        { kind: 'CONFIRM_ORDERS', count: 3 },
        { kind: 'DELIVER', count: 1, zones: 1 },
        { kind: 'NOTIFY_INTERESTED', campaignId: 'c2', title: 'Huile', interested: 4 },
      ],
    });
    expect(t).toContain('3 commandes à confirmer');
    expect(t).toContain('1 commande à livrer dans 1 quartier');
    expect(t).toContain('Préviens tes 4 intéressés');
    const list = out.match(/<section[^>]*aria-labelledby="m-todo-title"[^>]*>.*?<\/section>/s)?.[0];
    expect(hrefs(list ?? '')).toEqual([
      '/app/commandes?statut=a-confirmer',
      '/app/commandes?vue=a-livrer',
      '/app/campagnes/c2?onglet=interesses',
    ]);
    expect(list).toContain('Voir');
    expect(list).toContain('Écrire');
  });

  it('« Tes campagnes » gives one verdict line each, the word in the verdict tone', () => {
    const { out, t } = render({
      ...SUMMARY,
      campaigns: [
        {
          id: 'c1',
          title: 'Riz parfumé',
          unitLabel: 'sac',
          completed: 34,
          verdict: 'GO',
          realistic: 120,
          reference: 130,
          offered: false,
          availability: 'INCOMING',
          interested: 20,
          stockStatus: null,
          restock: null,
        },
        {
          id: 'c5',
          title: 'Livre de commerce',
          unitLabel: 'pièce',
          completed: 8,
          verdict: 'WAIT',
          realistic: 6,
          reference: 30,
          offered: false,
          availability: 'IN_STOCK',
          interested: 6,
          stockStatus: 'ENOUGH',
          restock: null,
        },
        {
          id: 'c3',
          title: 'Sucre',
          unitLabel: 'sac',
          completed: 25,
          verdict: null,
          realistic: null,
          reference: null,
          offered: false,
          availability: 'INCOMING',
          interested: 9,
          stockStatus: null,
          restock: null,
        },
      ],
    });
    expect(t).toContain('Tes campagnes');
    expect(t).toContain('~120 sacs');
    expect(t).toContain('Verdict avec un pass');
    expect(t).toContain('6 à servir');
    expect(t).toContain('Stock suffisant');
    expect(out).toMatch(/text-success[^>]*>Commande/);
    expect(hrefs(out)).toContain('/app/campagnes/c3');
    expect(render(SUMMARY).t).not.toContain('Tes campagnes');
  });

  it('« Argent protégé ce mois-ci » shows only above 0, in highlighter', () => {
    const { out, t } = render({ ...SUMMARY, moneyProtectedThisMonth: 150_000 });
    expect(t).toContain('Argent protégé ce mois-ci');
    expect(t).toContain('150 000 FCFA');
    expect(out).toMatch(/highlight[^>]*>150 000 FCFA/);
    const gn = text(
      <ShopTestProvider shop={{ ...TEST_SHOP, currency: 'GNF' }}>
        <HomeView summary={{ ...SUMMARY, moneyProtectedThisMonth: 150_000 }} />
      </ShopTestProvider>,
    );
    expect(gn).toContain('150 000 FG');
    expect(gn).not.toContain('FCFA');
    expect(render(SUMMARY).t).not.toContain('Argent protégé');
  });

  it('home no longer asks for notifications: the phone sheet and Réglages do', () => {
    const { t } = render(SUMMARY);
    expect(t).not.toContain('Sois prévenu à chaque réponse');
    expect(t).not.toContain('Activer les notifications');
  });
});

describe('HomeView on a desktop (lot 7a)', () => {
  const tiles: ShopSummary['campaigns'] = [
    {
      id: 'c1',
      title: 'Riz parfumé',
      unitLabel: 'sac',
      completed: 34,
      verdict: 'GO',
      realistic: 120,
      reference: 130,
      offered: false,
      availability: 'INCOMING',
      interested: 20,
      stockStatus: null,
      restock: null,
    },
    {
      id: 'c2',
      title: 'Savon',
      unitLabel: 'carton',
      completed: 11,
      verdict: 'WAIT',
      realistic: 4,
      reference: 30,
      offered: false,
      availability: 'INCOMING',
      interested: 5,
      stockStatus: null,
      restock: null,
    },
  ];

  it('« Tes verdicts » gives each campaign its tile: stamp, gauge, calculation, detail', () => {
    const { out, t } = render({ ...SUMMARY, campaigns: tiles });
    const section =
      out.match(/<section[^>]*aria-labelledby="verdicts-title"[^>]*>.*?<\/section>/s)?.[0] ?? '';
    expect(section).not.toBe('');
    expect(section.match(/<article/g)).toHaveLength(2);
    expect(section.match(/class="stamp /g)).toHaveLength(2);
    expect(section.match(/role="meter"/g)).toHaveLength(2);
    expect(t).toContain('≈ 120 réalistes sur 130 prévus');
    expect(t).toContain('11 réponses sur 20');
    expect(hrefs(section)).toEqual(
      expect.arrayContaining(['/app/campagnes/c1', '/app/campagnes/c2?onglet=interesses']),
    );
  });

  it('keeps an action column on the right: to do, recent activity, coming up', () => {
    const { out } = render({
      ...SUMMARY,
      campaigns: tiles,
      todo: [{ kind: 'CONFIRM_ORDERS', count: 2 }],
    });
    const aside =
      out.match(/<aside[^>]*aria-label="À faire et activité"[^>]*>.*?<\/aside>/s)?.[0] ?? '';
    expect(aside).toContain('xl:sticky');
    // Some air under the title row's buttons.
    expect(aside.match(/^<aside[^>]*>/)?.[0]).toContain('xl:mt-6');
    const t = text(<div dangerouslySetInnerHTML={{ __html: aside }} />);
    expect(t.indexOf('À faire maintenant')).toBeGreaterThanOrEqual(0);
    expect(t.indexOf('À faire maintenant')).toBeLessThan(t.indexOf('Activité récente'));
    expect(t.indexOf('Activité récente')).toBeLessThan(t.indexOf('À venir'));
  });

  it('the column says when nothing is waiting', () => {
    const { out } = render({ ...SUMMARY, todo: [] });
    const aside = out.match(/<aside[^>]*>.*?<\/aside>/s)?.[0] ?? '';
    expect(text(<div dangerouslySetInnerHTML={{ __html: aside }} />)).toContain(
      'Rien à faire pour le moment.',
    );
  });

  it('lines the three actions up on the title row, the campaign last', () => {
    const { out } = render(SUMMARY);
    const head = out.match(/<header[^>]*>.*?<\/header>/s)?.[0] ?? '';
    const actions = hrefs(head);
    expect(actions).toEqual([
      expect.stringContaining('https://wa.me/'),
      '/app/produits/nouveau',
      '/app/campagnes/nouvelle',
    ]);
  });

  it('never repeats a heading id between the phone and the desktop copies', () => {
    const { out } = render({
      ...SUMMARY,
      campaigns: tiles,
      todo: [{ kind: 'CONFIRM_ORDERS', count: 2 }],
    });
    const ids = [...out.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('HomeView fixes after the review (lot 7a)', () => {
  const one: ShopSummary['campaigns'] = [
    {
      id: 'c1',
      title: 'Riz parfumé',
      unitLabel: 'sac',
      completed: 34,
      verdict: 'GO',
      realistic: 120,
      reference: 130,
      offered: false,
      availability: 'INCOMING',
      interested: 20,
      stockStatus: null,
      restock: null,
    },
  ];

  it('below 1280px the actions go under the title instead of squeezing it', () => {
    const { out } = render(SUMMARY);
    const head = out.match(/<header[^>]*>.*?<\/header>/s)?.[0] ?? '';
    expect(head).toMatch(/<h1 class="[^"]*break-words/);
    expect(head).toMatch(/<div class="hidden [^"]*xl:flex/);
    const below = out.slice(out.indexOf('</header>'));
    const row = below.match(/<div class="[^"]*lg:flex xl:hidden[^"]*">.*?<\/div>/s)?.[0] ?? '';
    expect(hrefs(row)).toEqual([
      expect.stringContaining('https://wa.me/'),
      '/app/produits/nouveau',
      '/app/campagnes/nouvelle',
    ]);
  });

  it('on a phone the money protected stays after the campaigns, as before', () => {
    const { out } = render({ ...SUMMARY, moneyProtectedThisMonth: 150_000, campaigns: one });
    const rows = out.indexOf('aria-labelledby="campaigns-title"');
    const phone = out.indexOf('aria-labelledby="m-money-title"');
    const desk = out.indexOf('aria-labelledby="d-money-title"');
    expect(rows).toBeGreaterThan(-1);
    expect(phone).toBeGreaterThan(rows);
    expect(desk).toBeGreaterThan(-1);
    expect(desk).toBeLessThan(rows);
    expect(out).toMatch(/<section aria-labelledby="m-money-title" class="[^"]*lg:hidden/);
    expect(out).toMatch(/<section aria-labelledby="d-money-title" class="[^"]*hidden lg:block/);
  });
});

describe('HomeView pass meter (lot 8)', () => {
  it('home shows the pass meter on phone and desktop', () => {
    mockNextNavigation({ pathname: '/app' });
    const el = (
      <ShopTestProvider
        shop={{
          ...TEST_SHOP,
          plan: { id: 'MONTH', inGrace: false, endsAt: '2026-11-12T10:00:00.000Z' },
        }}
        usage={{
          used: 420,
          included: 1000,
          endsAt: '2026-11-12T10:00:00.000Z',
          inGrace: false,
          pending: 0,
        }}
      >
        <HomeView summary={SUMMARY} />
      </ShopTestProvider>
    );
    const out = html(el);
    // One meter, at every width: no phone-only or desktop-only class on it.
    expect(out.match(/role="meter"/g)).toHaveLength(1);
    const meter = out.slice(out.lastIndexOf('<section', out.indexOf('role="meter"')));
    expect(meter.slice(0, 200)).not.toMatch(/lg:hidden|hidden lg:block/);
    expect(text(el)).toContain('420 / 1 000 réponses');
    expect(text(el)).toContain('Prendre un autre pass');
  });
});

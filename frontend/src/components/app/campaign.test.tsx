import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { CampaignCard, Tabs } from '@/components/ui';
import { html, text } from '@/components/ui/test-html';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/tamani/api-messages';
import { campaignActions, type CampaignStatus } from '@/lib/tamani/campaign-actions';
import type { ShopCampaign, ShopLink } from '@/lib/tamani/campaign-view';
import { initialWizardState, wizardReducer, type WizardState } from '@/lib/tamani/campaign-wizard';
import type { OrderRow } from '@/lib/tamani/orders-view';
import type { ShopProduct } from '@/lib/tamani/product-form';
import { campaignTabs } from '@/lib/tamani/results-view';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { ShareCard } = await import('./ShareCard');
const { SourceLinks } = await import('./SourceLinks');
const { CampaignActions } = await import('./CampaignActions');
const { CampaignWizard } = await import('./CampaignWizard');
const { CampaignEditForm } = await import('./CampaignEditForm');
const { CampaignOrdersView, CampaignOrdersTab, campaignOrdersPath } =
  await import('./CampaignOrders');

const now = new Date('2026-10-24T10:00:00Z');
const URL_C = 'http://localhost:3001/c/Ab3dE7x';

const link: ShopLink = {
  id: 'l1',
  code: 'Ab3dE7x',
  label: 'Lien principal',
  isDefault: true,
  openCount: 12,
  url: URL_C,
};

const campaign: ShopCampaign = {
  id: 'c1',
  title: 'Marmites inox 5 L',
  productId: 'p1',
  product: {
    id: 'p1',
    name: 'Marmites inox 5 L',
    unitLabel: 'pièce',
    unitPrice: 7500,
    wholesalePrice: 6000,
    wholesaleMinQty: 12,
    photos: ['https://res.cloudinary.com/demo/image/upload/v1/m.jpg'],
  },
  availability: 'INCOMING',
  availableAt: '2026-11-03T10:00:00.000Z',
  stockQuantity: null,
  plannedQuantity: 400,
  showStock: false,
  endsAt: '2026-11-03T10:00:00.000Z',
  deliveryEnabled: true,
  showLiveCounter: true,
  shareTemplate: '🔔 *{produit}* à {prix}. {disponibilite}. 👉 {lien}',
  status: 'ACTIVE',
  closedAt: null,
  arrivedAt: null,
  createdAt: '2026-10-24T10:00:00.000Z',
  defaultLink: link,
  shareMessage: '🔔 *Marmites inox 5 L* à 7 500 FCFA. Arrivage dans 10 jours. 👉 ' + URL_C,
};

const products: ShopProduct[] = [
  {
    id: 'p1',
    name: 'Marmites inox 5 L',
    description: null,
    unitLabel: 'pièce',
    unitPrice: 7500,
    wholesalePrice: 6000,
    wholesaleMinQty: 12,
    costPrice: null,
    photos: [],
    optionLabel: null,
    options: [],
    archivedAt: null,
    createdAt: '2026-10-24T10:00:00.000Z',
  },
];

const wizard = (initial: WizardState, zonesCount: number | null = 2) => (
  <CampaignWizard
    products={products}
    zonesCount={zonesCount}
    initial={initial}
    now={now}
    currency="XOF"
    onSubmit={async () => null}
  />
);

describe('CampaignCard', () => {
  it('CampaignCard shows status, availability and end date', () => {
    const t = text(<CampaignCard campaign={campaign} now={now} href="/app/campagnes/c1" />);
    expect(t).toContain('Marmites inox 5 L');
    expect(t).toContain('En cours');
    expect(t).toContain('Arrivage dans 10 jours');
    expect(t).toContain("jusqu'au 3 novembre");
    expect(html(<CampaignCard campaign={campaign} now={now} href="/app/campagnes/c1" />)).toContain(
      'href="/app/campagnes/c1"',
    );
  });
});

describe('ShareCard', () => {
  it('ShareCard offers copy, WhatsApp share and the link', () => {
    const card = <ShareCard message={campaign.shareMessage} url={URL_C} />;
    const out = html(card);
    const share = (out.match(/<a [^>]*>/g) ?? []).find((a) => a.includes('wa.me')) ?? '';
    expect(share).toMatch(/href="https:\/\/wa\.me\/\?text=/);
    expect(share).toContain('bg-whatsapp');
    const t = text(card);
    expect(t).toContain('Partager sur WhatsApp');
    expect(t).toContain('Copier le message');
    expect(t).toContain('Copier le lien');
    expect(t).toContain(URL_C);
    // *bold* shows as WhatsApp shows it.
    expect(out).toContain('<strong>Marmites inox 5 L</strong>');
  });
});

describe('CampaignWizard', () => {
  it('lists the products with their price and a way to add one', () => {
    const out = html(wizard(initialWizardState('p1')));
    expect(text(wizard(initialWizardState('p1')))).toContain(
      '7 500 FCFA (gros : 6 000 FCFA dès 12)',
    );
    const gn = text(
      <CampaignWizard
        products={products}
        zonesCount={2}
        initial={initialWizardState('p1')}
        now={now}
        currency="GNF"
        onSubmit={async () => null}
      />,
    );
    expect(gn).toContain('7 500 FG (gros : 6 000 FG dès 12)');
    expect(gn).not.toContain('FCFA');
    expect(out).toMatch(/aria-pressed="true"[^>]*>.*Marmites inox 5 L/s);
    expect(out).toContain('href="/app/produits/nouveau"');
    expect(text(wizard(initialWizardState('p1')))).toContain('Étape 1 sur 6');
    const photo = 'https://res.cloudinary.com/demo/image/upload/v1/m.jpg';
    const withPhoto = html(
      <CampaignWizard
        products={[{ ...products[0]!, photos: [photo] }]}
        zonesCount={2}
        initial={initialWizardState('p1')}
        now={now}
        currency="XOF"
        onSubmit={async () => null}
      />,
    );
    expect(withPhoto).toContain(
      'src="https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_128,h_128,f_auto,q_auto/v1/m.jpg"',
    );
  });

  it('the arrival step asks only for a date', () => {
    const s: WizardState = { ...initialWizardState('p1'), step: 1, availability: 'INCOMING' };
    const t = text(wizard(s));
    expect(t).toContain('Déjà disponible');
    expect(t).toContain('Arrive bientôt');
    expect(t).toContain("Date d'arrivée");
    expect(t).not.toContain('Dans 10 jours');
    const input = html(wizard(s)).match(/<input [^>]*type="date"[^>]*>/)?.[0] ?? '';
    expect(input).toMatch(/min="\d{4}-\d{2}-\d{2}"/);
    const end: WizardState = { ...initialWizardState('p1'), step: 3 };
    expect(text(wizard(end))).toContain('jours');
  });

  it('a past arrival date is explained under the field', () => {
    const s: WizardState = {
      ...initialWizardState('p1'),
      step: 1,
      availability: 'INCOMING',
      availableOn: '2020-01-01',
    };
    expect(text(wizard(s))).toContain("Choisis une date à partir d'aujourd'hui.");
  });

  it('warns at the delivery step when the shop has no zone', () => {
    const s: WizardState = { ...initialWizardState('p1'), step: 4, deliveryEnabled: true };
    expect(text(wizard(s, 0))).toContain('Réglages');
    expect(text(wizard(s, 3))).not.toContain('Réglages');
  });

  it('wizard keeps its state after a failed launch', () => {
    let s = initialWizardState('p1');
    s = wizardReducer(s, { type: 'set', field: 'shareTemplate', value: 'Marmites dispo ! {lien}' });
    s = wizardReducer(s, { type: 'goto', step: 5 });
    s = wizardReducer(s, { type: 'submit' });
    const limit = errorMessage(new ApiError(409, 'limit', { error: 'CAMPAIGN_LIMIT_REACHED' }));
    s = wizardReducer(s, { type: 'failed', error: limit });

    const out = html(wizard(s));
    expect(out).toMatch(/role="alert"[^>]*>.*une seule campagne/s);
    expect(out).toContain('Marmites dispo ! {lien}');
    const t = text(wizard(s));
    expect(t).toContain('Enregistrer en brouillon');
    expect(t).toContain('Lancer la campagne');
    expect(t).toContain('Marmites dispo ! tamani.app/c/');
  });
});

describe('SourceLinks', () => {
  it('SourceLinks on FREE shows the Pro lock and no form', () => {
    const out = html(<SourceLinks shopId="org_1" campaignId="c1" links={[link]} locked />);
    const t = text(<SourceLinks shopId="org_1" campaignId="c1" links={[link]} locked />);
    expect(t).toContain('Les liens par source viennent avec un pass.');
    expect(t).toContain('Pass');
    expect(out).not.toMatch(/<form|<input/);
  });

  it('lists the links and offers a new one on Pro', () => {
    const extra: ShopLink = {
      ...link,
      id: 'l2',
      code: 'Zz9yX8w',
      label: 'Groupe Médina',
      isDefault: false,
      openCount: 3,
      url: 'http://localhost:3001/c/Zz9yX8w',
    };
    const t = text(
      <SourceLinks shopId="org_1" campaignId="c1" links={[link, extra]} locked={false} />,
    );
    expect(t).toContain('Groupe Médina');
    expect(t).toContain('3 ouvertures');
    expect(
      html(<SourceLinks shopId="org_1" campaignId="c1" links={[link]} locked={false} />),
    ).toMatch(/<form/);
  });
});

describe('CampaignActions', () => {
  it('campaign page actions match campaignActions', () => {
    const statuses: CampaignStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARRIVED'];
    for (const status of statuses) {
      for (const availability of ['INCOMING', 'IN_STOCK'] as const) {
        const labels = (
          html(
            <CampaignActions
              status={status}
              availability={availability}
              busy={false}
              onMove={() => {}}
            />,
          ).match(/<button [^>]*>([^<]+)<\/button>/g) ?? []
        ).map((b) => b.replace(/<[^>]+>/g, ''));
        expect(labels, `${status} ${availability}`).toEqual(
          campaignActions(status, availability).map((a) => a.label),
        );
      }
    }
  });
});

describe('CampaignEditForm', () => {
  it('opens on the saved values', () => {
    const out = html(
      <CampaignEditForm campaign={campaign} currency="XOF" onSave={async () => {}} />,
    );
    const input = (id: string) =>
      (out.match(/<(?:input|textarea) [^>]*>/g) ?? []).find((t) => t.includes(`id="${id}"`)) ?? '';
    expect(input('edit-title')).toContain('value="Marmites inox 5 L"');
    expect(input('edit-ends')).toContain('value="2026-11-03"');
    expect(input('edit-planned')).toContain('value="400"');
    expect(out).toContain('{produit}');
  });
});

describe('campaign list page', () => {
  it('puts the default "Toutes" filter first, where a phone shows it', async () => {
    const { mockNextNavigation } = await import('@/test-utils/next-navigation');
    const { ShopTestProvider } = await import('@/test-utils/shop-context');
    const { default: CampaignsPage } = await import('@/app/(app)/app/campagnes/page');
    mockNextNavigation({ pathname: '/app/campagnes' });
    const out = html(
      <ShopTestProvider>
        <CampaignsPage />
      </ShopTestProvider>,
    );
    const nav = out.match(/<nav aria-label="Afficher"[\s\S]*?<\/nav>/)?.[0] ?? '';
    const links = [...nav.matchAll(/<a [^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]*)/g)];
    // Until the counts arrive, a chip with nothing to show stays hidden.
    expect(links.map((m) => m[1])).toEqual(['Toutes']);
    expect(links[0]?.[0]).toContain('aria-current="true"');
    expect(out).toMatch(/<form[^>]*role="search"/);
    expect(out).toContain('aria-label="Créer une campagne"');
  });

  it('keeps the open chip and the search in the chip links', async () => {
    const { mockNextNavigation } = await import('@/test-utils/next-navigation');
    const { ShopTestProvider } = await import('@/test-utils/shop-context');
    const { default: CampaignsPage } = await import('@/app/(app)/app/campagnes/page');
    mockNextNavigation({ pathname: '/app/campagnes', search: 'statut=DRAFT&q=riz' });
    const out = html(
      <ShopTestProvider>
        <CampaignsPage />
      </ShopTestProvider>,
    );
    const nav = out.match(/<nav aria-label="Afficher"[\s\S]*?<\/nav>/)?.[0] ?? '';
    expect(nav).toContain('href="/app/campagnes?q=riz"');
    expect(nav).toMatch(
      /<a [^>]*aria-current="true"[^>]*href="\/app\/campagnes\?statut=DRAFT&amp;q=riz"|href="\/app\/campagnes\?statut=DRAFT&amp;q=riz"[^>]*aria-current="true"/,
    );
  });
});

const order: OrderRow = {
  id: 'o1',
  status: 'CONFIRMED',
  paid: true,
  paidAt: '2026-10-27T15:00:00.000Z',
  createdAt: '2026-10-27T09:00:00.000Z',
  quantity: 3,
  unitPrice: 17500,
  totalAmount: 52500,
  fulfillment: 'DELIVERY',
  zoneId: 'z1',
  zoneName: 'Médina',
  productId: 'p1',
  productName: 'Riz parfumé',
  unitLabel: 'sac',
  campaignId: 'c1',
  campaignTitle: 'Riz de novembre',
  responseId: 'resp1',
  buyerType: 'RESELLER',
  notes: null,
  client: { id: 'r1', firstName: 'Awa', phone: '+221 77 123 45 12', phoneE164: '+221771234512' },
};

type OrdersProps = ComponentProps<typeof CampaignOrdersView>;
const ordersProps = (over: Partial<OrdersProps> = {}): OrdersProps => ({
  campaignId: 'c1',
  unitLabel: 'sac',
  currency: 'XOF',
  summary: { confirmed: 3, fulfilled: 1, toConfirm: 2, stockLeft: 26 },
  rows: [order],
  hasMore: false,
  loading: false,
  error: null,
  onMore: () => {},
  onRetry: () => {},
  ...over,
});

describe('CampaignOrders', () => {
  it('sits in the tab bar after Intéressés, at ?onglet=commandes', () => {
    const out = html(
      <Tabs label="Campagne" items={campaignTabs('/app/campagnes/c1', 'orders', 'ACTIVE')} />,
    );
    expect(out).toMatch(/href="\/app\/campagnes\/c1\?onglet=commandes"[^>]*>Commandes</);
    expect(out.indexOf('Intéressés')).toBeLessThan(out.indexOf('Commandes'));
    expect(out.indexOf('Commandes')).toBeLessThan(out.indexOf('Partager'));
    expect(out).toMatch(/aria-current="page"[^>]*>Commandes</);
  });

  it('shows the stock left with its calculation, then the quantities and the orders', () => {
    const el = <CampaignOrdersView {...ordersProps()} />;
    const t = text(el);
    const out = html(el);
    expect(t).toContain('Stock restant : 26 sacs');
    expect(t).toContain('30 en stock − 4 en commandes confirmées ou livrées');
    expect(t).toMatch(/Confirmées 3 sacs Livrées 1 sac À confirmer 2 sacs/);
    expect(t.indexOf('Stock restant')).toBeLessThan(t.indexOf('Confirmées'));
    expect(t.indexOf('À confirmer')).toBeLessThan(t.indexOf('Awa'));
    expect(out).toContain('href="/app/commandes/o1"');
    expect(t).toContain('3 sacs de Riz parfumé');
    expect(t).toContain('52 500 FCFA');
    const cd = text(<CampaignOrdersView {...ordersProps({ currency: 'CDF' })} />);
    expect(cd).toContain('52 500 FC');
    expect(cd).not.toContain('FCFA');
    // The stock left is the screen's one bold figure.
    expect(out).toMatch(/font-sign[^>]*>26</);
  });

  it('shows no stock left for a campaign without a stock', () => {
    const el = (
      <CampaignOrdersView
        {...ordersProps({ summary: { confirmed: 3, fulfilled: 1, toConfirm: 2, stockLeft: null } })}
      />
    );
    expect(text(el)).not.toContain('Stock restant');
    expect(text(el)).toContain('Confirmées 3 sacs');
  });

  it('never shows a stock below zero and says by how much the orders go past it', () => {
    const el = (
      <CampaignOrdersView
        {...ordersProps({ summary: { confirmed: 10, fulfilled: 4, toConfirm: 0, stockLeft: -4 } })}
      />
    );
    expect(text(el)).toContain('Stock restant : 0 sac');
    expect(text(el)).toContain('Les commandes confirmées dépassent ton stock de 4 sacs.');
  });

  it('without an order, leads to the interested people and keeps the stock', () => {
    const el = (
      <CampaignOrdersView
        {...ordersProps({
          rows: [],
          summary: { confirmed: 0, fulfilled: 0, toConfirm: 0, stockLeft: 30 },
        })}
      />
    );
    const t = text(el);
    expect(t).toContain('Stock restant : 30 sacs');
    expect(t).toContain('Pas encore de commande pour cette campagne');
    expect(html(el)).toContain('href="/app/campagnes/c1?onglet=interesses"');
    expect(t).not.toContain('À confirmer');
  });

  it('offers « Voir plus » only when more orders follow, and all of them on the orders page', () => {
    expect(text(<CampaignOrdersView {...ordersProps({ hasMore: true })} />)).toContain('Voir plus');
    const out = html(<CampaignOrdersView {...ordersProps()} />);
    expect(out).not.toContain('Voir plus');
    expect(out).toContain('href="/app/commandes?campagne=c1"');
  });

  it('says what went wrong with a retry', () => {
    const t = text(<CampaignOrdersView {...ordersProps({ error: 'Oups.' })} />);
    expect(t).toContain('Oups.');
    expect(t).toContain('Réessayer');
  });

  it('loads the campaign orders page by page', () => {
    expect(campaignOrdersPath('org_1', 'c1', null)).toBe('/api/shops/org_1/campaigns/c1/orders');
    expect(campaignOrdersPath('org_1', 'c1', 'abc')).toBe(
      '/api/shops/org_1/campaigns/c1/orders?cursor=abc',
    );
    // Until the first page arrives, a placeholder.
    const out = html(
      <CampaignOrdersTab shopId="org_1" campaignId="c1" unitLabel="sac" currency="XOF" />,
    );
    expect(out).toContain('role="status"');
    expect(out).toContain('Chargement des commandes');
  });
});

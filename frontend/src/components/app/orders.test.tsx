import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { html, text } from '@/components/ui/test-html';
import {
  NO_ORDER_FILTERS,
  type OrderRow,
  type OrderStatus,
  type ToDeliverGroup,
} from '@/lib/tamani/orders-view';
import { mockNextNavigation } from '@/test-utils/next-navigation';
import { ShopTestProvider, TEST_SHOP } from '@/test-utils/shop-context';

vi.mock('@/lib/api', () => ({ api: vi.fn(() => new Promise(() => {})) }));
vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { OrderListView, OrdersScreen } = await import('./OrderList');
const { OrderDetailView } = await import('./OrderDetail');
const { OrderForm } = await import('./OrderForm');

const now = new Date('2026-10-28T12:00:00Z');

const pro: OrderRow = {
  id: 'o1',
  status: 'TO_CONFIRM',
  paid: false,
  paidAt: null,
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
const free: OrderRow = {
  ...pro,
  id: 'o2',
  client: { id: 'r1', firstName: 'Awa', phone: '77 •• •• 12', phoneE164: null },
};
const paid: OrderRow = {
  ...pro,
  id: 'o3',
  status: 'FULFILLED',
  paid: true,
  paidAt: '2026-10-27T15:00:00.000Z',
  client: { id: 'r2', firstName: null, phone: '+221 77 999 88 77', phoneE164: '+221779998877' },
};

const counts: Record<OrderStatus, number> = {
  TO_CONFIRM: 2,
  CONFIRMED: 3,
  FULFILLED: 5,
  CANCELLED: 0,
};

type ListProps = ComponentProps<typeof OrderListView>;
const listProps = (over: Partial<ListProps> = {}): ListProps => ({
  filters: NO_ORDER_FILTERS,
  rows: [pro, paid],
  counts,
  groups: [],
  choices: {
    campaigns: [{ id: 'c1', title: 'Riz de novembre' }],
    products: [{ id: 'p1', name: 'Riz parfumé' }],
  },
  loading: false,
  error: null,
  hasMore: false,
  onMore: () => {},
  onRetry: () => {},
  onFilter: () => {},
  ...over,
});

const anchors = (out: string) => out.match(/<a [^>]*>/g) ?? [];
const buttons = (out: string) =>
  (out.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? []).map((b) =>
    b
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );

describe('OrderListView', () => {
  it('lists each order: client, product, quantity, total, status and « Payé »', () => {
    mockNextNavigation({ pathname: '/app/commandes' });
    const el = <OrderListView {...listProps()} />;
    const out = html(el);
    const t = text(el);
    expect(t).toContain('Awa');
    expect(t).toContain('+221 77 123 45 12');
    expect(t).toContain('3 sacs de Riz parfumé');
    expect(t).toContain('52 500 FCFA');
    expect(t).toContain('À confirmer');
    expect(t).toContain('Livrée');
    expect(t).toContain('Client sans prénom');
    expect(t.match(/Payé/g)?.length).toBe(1);
    expect(anchors(out).some((a) => a.includes('href="/app/commandes/o1"'))).toBe(true);
  });

  it('masks the numbers on Free', () => {
    const t = text(<OrderListView {...listProps({ rows: [free] })} />);
    expect(t).toContain('77 •• •• 12');
    expect(t).not.toContain('123 45 12');
  });

  it('counts each status and keeps the filters in the address', () => {
    const el = (
      <OrderListView {...listProps({ filters: { ...NO_ORDER_FILTERS, productId: 'p1' } })} />
    );
    const out = html(el);
    const t = text(el);
    expect(t).toContain('À confirmer 2');
    expect(t).toContain('Confirmées 3');
    expect(t).toContain('Livrées 5');
    expect(t).not.toContain('Annulées');
    const links = anchors(out);
    expect(
      links.some((a) => a.includes('href="/app/commandes?statut=a-confirmer&amp;produit=p1"')),
    ).toBe(true);
    expect(links.some((a) => a.includes('href="/app/commandes?vue=a-livrer"'))).toBe(true);
    expect(out).toContain('Toutes les campagnes');
    expect(out).toContain('<option value="c1">Riz de novembre</option>');
    expect(out).toContain('Tous les produits');
    expect(out).toMatch(/<option value="p1" selected="">Riz parfumé<\/option>/);
  });

  it('offers a new order in the header and as the phone « + »', () => {
    const out = html(<OrderListView {...listProps()} />);
    const toNew = anchors(out).filter((a) => a.includes('href="/app/commandes/nouvelle"'));
    expect(toNew.length).toBe(2);
    expect(toNew.some((a) => a.includes('aria-label="Nouvelle commande"'))).toBe(true);
  });

  it('explains where orders come from when there is none', () => {
    const t = text(<OrderListView {...listProps({ rows: [], counts: null })} />);
    expect(t).toContain(
      "Transforme un intéressé en commande depuis l'onglet Intéressés d'une campagne, ou crée-la ici.",
    );
    const filtered = text(
      <OrderListView
        {...listProps({ rows: [], filters: { ...NO_ORDER_FILTERS, status: 'CANCELLED' } })}
      />,
    );
    expect(filtered).toContain('Aucune commande avec ces filtres.');
    expect(filtered).not.toContain("l'onglet Intéressés");
  });

  it('pages with « Voir plus »', () => {
    expect(text(<OrderListView {...listProps({ hasMore: true })} />)).toContain('Voir plus');
    expect(text(<OrderListView {...listProps()} />)).not.toContain('Voir plus');
  });
});

describe('À livrer par quartier', () => {
  const confirmed: OrderRow = { ...pro, status: 'CONFIRMED', quantity: 24, totalAmount: 420000 };
  const groups: ToDeliverGroup[] = [
    {
      zoneId: 'z1',
      zoneName: 'Médina',
      orders: [confirmed],
      totals: [{ productId: 'p1', productName: 'Riz parfumé', unitLabel: 'sac', quantity: 24 }],
    },
    {
      zoneId: null,
      zoneName: null,
      orders: [{ ...confirmed, id: 'o9', zoneId: null, zoneName: null, quantity: 1 }],
      totals: [{ productId: 'p2', productName: 'Marmite', unitLabel: 'pièce', quantity: 1 }],
    },
  ];
  const toDeliver = { ...NO_ORDER_FILTERS, view: 'to-deliver' as const };

  it('shows one card per zone with the pieces per product, then the orders', () => {
    const el = <OrderListView {...listProps({ filters: toDeliver, rows: [], groups })} />;
    const out = html(el);
    const t = text(el);
    expect(t).toContain('Médina');
    expect(t).toContain('24 sacs de Riz parfumé');
    expect(t).toContain('Sans quartier');
    expect(t).toContain('1 pièce de Marmite');
    expect(t.indexOf('Médina')).toBeLessThan(t.indexOf('Sans quartier'));
    expect(anchors(out).some((a) => a.includes('href="/app/commandes/o9"'))).toBe(true);
    expect(out).toMatch(
      /aria-current="page"[^>]*href="\/app\/commandes\?vue=a-livrer"|href="\/app\/commandes\?vue=a-livrer"[^>]*aria-current="page"/,
    );
    expect(t).not.toContain('Tous les produits');
  });

  it('shows each order’s note on its line: the option and the place to prepare the round', () => {
    const noted = { ...confirmed, id: 'o7', notes: 'Couleur : Rouge\nLieu : Keur Massar' };
    const t = text(
      <OrderListView
        {...listProps({
          filters: toDeliver,
          rows: [],
          groups: [{ ...groups[1]!, orders: [noted] }],
        })}
      />,
    );
    expect(t).toContain('Couleur : Rouge');
    expect(t).toContain('Lieu : Keur Massar');
  });

  it('says when nothing is to deliver', () => {
    const t = text(<OrderListView {...listProps({ filters: toDeliver, rows: [], groups: [] })} />);
    expect(t).toContain('Rien à livrer pour le moment');
    expect(t).toContain('Les commandes confirmées à livrer apparaissent ici');
  });
});

type DetailProps = ComponentProps<typeof OrderDetailView>;
const detailProps = (order: OrderRow, over: Partial<DetailProps> = {}): DetailProps => ({
  order,
  shopName: 'Diallo Import',
  now,
  busy: false,
  error: null,
  askingCancel: false,
  onMove: () => {},
  onAskCancel: () => {},
  onKeep: () => {},
  onPaid: () => {},
  onSave: async () => {},
  ...over,
});

describe('OrderDetailView', () => {
  it('a new order is confirmed or cancelled, its price and quantity still editable', () => {
    const out = html(<OrderDetailView {...detailProps(pro)} />);
    expect(buttons(out)).toEqual(expect.arrayContaining(['Confirmer', 'Annuler']));
    expect(out).toContain('id="order-unit-price"');
    expect(out).toContain('id="order-quantity"');
    expect(text(<OrderDetailView {...detailProps(pro)} />)).toContain('52 500 FCFA');
  });

  it('a confirmed order is delivered, or picked up, and its price is frozen', () => {
    const confirmed = { ...pro, status: 'CONFIRMED' as const };
    const out = html(<OrderDetailView {...detailProps(confirmed)} />);
    expect(buttons(out)).toEqual(expect.arrayContaining(['Marquer livrée', 'Annuler']));
    expect(buttons(out)).not.toContain('Confirmer');
    expect(out).not.toContain('id="order-unit-price"');
    expect(out).not.toContain('id="order-quantity"');
    const pickup = html(
      <OrderDetailView {...detailProps({ ...confirmed, fulfillment: 'PICKUP', zoneName: null })} />,
    );
    expect(buttons(pickup)).toContain('Marquer récupérée');
  });

  it('a delivered or cancelled order has no move left', () => {
    for (const status of ['FULFILLED', 'CANCELLED'] as const) {
      const out = html(<OrderDetailView {...detailProps({ ...pro, status })} />);
      for (const label of ['Confirmer', 'Marquer livrée', 'Annuler']) {
        expect(buttons(out)).not.toContain(label);
      }
      expect(out).not.toContain('id="order-unit-price"');
    }
  });

  it('asks before cancelling', () => {
    const t = text(<OrderDetailView {...detailProps(pro, { askingCancel: true })} />);
    expect(t).toContain('Annuler cette commande ?');
    expect(t).toContain('Oui, annuler la commande');
    expect(t).toContain('Garder la commande');
  });

  it('prepares the WhatsApp message of a confirmed order', () => {
    const out = html(<OrderDetailView {...detailProps({ ...pro, status: 'CONFIRMED' })} />);
    const wa = anchors(out).find((a) => a.includes('wa.me')) ?? '';
    expect(wa).toContain('href="https://wa.me/221771234512?text=');
    expect(decodeURIComponent(wa).replace(/&#x27;/g, "'")).toContain(
      'Bonjour Awa, ta commande de 3 sacs de Riz parfumé est confirmée. Total : 52 500 FCFA. Livraison à Médina. À bientôt, Diallo Import.',
    );
    expect(wa).toContain('target="_blank"');
  });

  it('leads to Pro on Free instead of WhatsApp', () => {
    const el = <OrderDetailView {...detailProps({ ...free, status: 'CONFIRMED' })} />;
    const out = html(el);
    expect(out).not.toContain('wa.me');
    expect(anchors(out).some((a) => a.includes('href="/app/plus#forfait"'))).toBe(true);
    expect(text(el)).toContain('Pro');
    expect(text(el)).toContain('77 •• •• 12');
  });

  it('shows « Payé » with its date', () => {
    const el = <OrderDetailView {...detailProps(paid)} />;
    expect(html(el)).toMatch(/id="order-paid"[^>]*checked=""|checked=""[^>]*id="order-paid"/);
    expect(text(el)).toContain('Payé le 27 octobre');
    expect(text(el)).toContain('Livrée');
  });

  it('edits the note', () => {
    const out = html(
      <OrderDetailView {...detailProps({ ...pro, notes: 'Lieu : Marché Sandaga' })} />,
    );
    expect(out).toContain('id="order-notes"');
    expect(out).toContain('Lieu : Marché Sandaga');
  });
});

describe('OrderForm', () => {
  const products = [
    {
      id: 'p1',
      name: 'Riz parfumé',
      unitLabel: 'pièce',
      unitPrice: 7500,
      wholesalePrice: 6000,
      wholesaleMinQty: 12,
    },
    {
      id: 'p2',
      name: 'Marmite',
      unitLabel: 'pièce',
      unitPrice: 9000,
      wholesalePrice: null,
      wholesaleMinQty: null,
    },
  ];
  const campaigns = [
    { id: 'c1', title: 'Riz de novembre', productId: 'p1' },
    { id: 'c2', title: 'Marmites', productId: 'p2' },
  ];
  const zones = [{ id: 'z1', name: 'Médina' }];
  const form = (initial: Partial<ComponentProps<typeof OrderForm>['initial']> = {}) => (
    <OrderForm
      products={products}
      campaigns={campaigns}
      zones={zones}
      country="SN"
      initial={{ productId: 'p1', buyerType: 'RESELLER', quantity: '12', ...initial }}
      error={null}
      onSubmit={async () => true}
    />
  );

  it('shows the wholesale price for a reseller of 12 pieces', () => {
    const t = text(form());
    expect(t).toContain('Prix de gros : 6 000 FCFA × 12 = 72 000 FCFA');
    expect(text(form({ quantity: '11' }))).toContain(
      "Prix à l'unité : 7 500 FCFA × 11 = 82 500 FCFA",
    );
    expect(text(form({ quantity: '11' }))).toContain('Prix de gros à partir de 12 pièces.');
  });

  it('asks the number with the shop country and the campaigns of the product only', () => {
    const out = html(form());
    expect(text(form())).toContain('+221');
    expect(out).toContain('type="tel"');
    expect(out).toContain('Riz de novembre');
    expect(out).not.toContain('>Marmites<');
  });

  it('asks the zone only for a delivery', () => {
    expect(html(form())).not.toContain('id="order-zone"');
    const out = html(form({ fulfillment: 'DELIVERY' }));
    expect(out).toContain('id="order-zone"');
    expect(out).toContain('Médina');
  });
});

describe('OrdersScreen', () => {
  it('composes the page while the orders load', () => {
    mockNextNavigation({ pathname: '/app/commandes', search: 'statut=livre' });
    const el = (
      <ShopTestProvider shop={TEST_SHOP}>
        <OrdersScreen />
      </ShopTestProvider>
    );
    const t = text(el);
    expect(t).toContain('Commandes');
    expect(t).toContain('À livrer par quartier');
    expect(html(el)).toContain('animate-pulse');
  });
});

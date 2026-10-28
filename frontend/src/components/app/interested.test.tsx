import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { html, text } from '@/components/ui/test-html';
import { interestedDetail, interestedMessage, type InterestedRow } from '@/lib/tamani/results-view';

const api = vi.fn();
vi.mock('@/lib/api', () => ({ api: (path: string) => api(path) }));
vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const { InterestedView, copyInterestedNumbers } = await import('./InterestedList');

const now = new Date('2026-10-27T12:00:00Z');

const awa: InterestedRow = {
  id: 'r1',
  respondentId: 'cl1',
  firstName: 'Awa',
  phone: '+221 77 123 45 12',
  phoneE164: '+221771234512',
  interested: true,
  reason: null,
  buyerType: 'RESELLER',
  quantity: 3,
  option: null,
  timing: 'ON_ARRIVAL',
  wantsDelivery: true,
  zoneName: 'Médina',
  deliveryPlace: null,
  country: 'SN',
  sourceLabel: 'Lien principal',
  completedAt: '2026-10-26T10:00:00.000Z',
};

const freeAwa: InterestedRow = { ...awa, phone: '+221 77 ••• •• 12', phoneE164: null };

type Props = ComponentProps<typeof InterestedView>;

const props = (over: Partial<Props> = {}): Props => ({
  campaign: {
    id: 'c1',
    productName: 'Marmites inox 5 L',
    unitLabel: 'pièce',
    status: 'ACTIVE',
    availability: 'INCOMING',
  },
  shopName: 'Diallo Import',
  filter: 'yes',
  rows: [awa],
  counts: { yes: 1, no: 2 },
  hasMore: false,
  loading: false,
  contacts: true,
  exportable: true,
  busy: false,
  copyState: 'idle',
  error: null,
  now,
  onMore: () => {},
  onCopy: () => {},
  onDownload: () => {},
  onArrived: () => {},
  ...over,
});

afterEach(() => {
  api.mockReset();
  vi.unstubAllGlobals();
});

describe('interestedMessage', () => {
  const base = {
    firstName: 'Awa',
    productName: 'Marmites inox 5 L',
    quantity: 3,
    unitLabel: 'pièce',
    shopName: 'Diallo Import',
  };

  it('writes the three moments', () => {
    expect(interestedMessage({ ...base, moment: 'ARRIVED' })).toBe(
      "Bonjour Awa, c'est Diallo Import. *Marmites inox 5 L* : c'est arrivé ! Tu voulais 3 pièces, je te les garde ?",
    );
    expect(interestedMessage({ ...base, moment: 'IN_STOCK' })).toBe(
      "Bonjour Awa, c'est Diallo Import. Merci pour ta réponse sur *Marmites inox 5 L* (3 pièces). C'est disponible : tu passes quand ?",
    );
    expect(interestedMessage({ ...base, moment: 'INCOMING' })).toBe(
      "Bonjour Awa, c'est Diallo Import. Merci pour ta réponse sur *Marmites inox 5 L* (3 pièces). Je te préviens dès que c'est là.",
    );
  });

  it('says Bonjour alone without a first name, and keeps one piece aside', () => {
    expect(interestedMessage({ ...base, firstName: null, quantity: 1, moment: 'ARRIVED' })).toBe(
      "Bonjour, c'est Diallo Import. *Marmites inox 5 L* : c'est arrivé ! Tu voulais 1 pièce, je te garde ça ?",
    );
  });
});

describe('interestedDetail', () => {
  it('reads the quantity, the buyer, where and when', () => {
    expect(interestedDetail(awa, 'pièce')).toBe("3 pièces · Revendeur · Médina · Dès l'arrivée");
    expect(interestedDetail({ ...awa, zoneName: null, wantsDelivery: false }, 'pièce')).toBe(
      "3 pièces · Revendeur · Retrait · Dès l'arrivée",
    );
    expect(interestedDetail({ ...awa, zoneName: null, deliveryPlace: 'Lomé' }, 'pièce')).toBe(
      "3 pièces · Revendeur · Livraison · Lomé · Dès l'arrivée",
    );
    expect(
      interestedDetail(
        { ...awa, interested: false, reason: 'TOO_EXPENSIVE', quantity: null },
        'pièce',
      ),
    ).toBe('Trop cher');
  });
});

describe('InterestedView', () => {
  it('a Pro shop gets a WhatsApp button per person and both actions', () => {
    const el = <InterestedView {...props()} />;
    const out = html(el);
    const t = text(el);
    expect(t).toContain('Awa');
    expect(t).toContain('+221 77 123 45 12');
    expect(t).toContain("3 pièces · Revendeur · Médina · Dès l'arrivée");
    expect(out).toContain('https://wa.me/221771234512?text=');
    expect(t).toContain('Copier les numéros');
    expect(t).toContain('Télécharger pour Excel');
    expect(out).not.toContain('Passe au Pro');
  });

  it('a free shop keeps the number masked and the actions lead to Pro', () => {
    const el = (
      <InterestedView {...props({ rows: [freeAwa], contacts: false, exportable: false })} />
    );
    const out = html(el);
    expect(text(el)).toContain('+221 77 ••• •• 12');
    expect(out).toContain('Passe au Pro pour contacter Awa');
    expect(out).not.toContain('wa.me');
    expect(out.match(/href="\/app\/plus/g)?.length).toBeGreaterThanOrEqual(3);
    expect(text(el)).toContain('Pro');
  });

  it('filters yes and no with their counts', () => {
    const out = html(<InterestedView {...props()} />);
    expect(out).toContain('href="/app/campagnes/c1?onglet=interesses"');
    expect(out).toContain('href="/app/campagnes/c1?onglet=interesses&amp;filtre=non"');
  });

  it('offers « Voir plus » only when there is a next page', () => {
    expect(text(<InterestedView {...props({ hasMore: true })} />)).toContain('Voir plus');
    expect(text(<InterestedView {...props()} />)).not.toContain('Voir plus');
  });

  it('asks whether the product has arrived until it has', () => {
    expect(text(<InterestedView {...props()} />)).toContain('Le produit est arrivé ?');
    const arrived = props({ campaign: { ...props().campaign, status: 'ARRIVED' } });
    expect(text(<InterestedView {...arrived} />)).not.toContain('Le produit est arrivé ?');
    // Once arrived, the WhatsApp message says so.
    expect(html(<InterestedView {...arrived} />)).toContain(encodeURIComponent('arrivé !'));
  });

  it('never asks a product already in stock whether it has arrived', () => {
    const inStock = props({ campaign: { ...props().campaign, availability: 'IN_STOCK' } });
    expect(text(<InterestedView {...inStock} />)).not.toContain('Le produit est arrivé ?');
  });

  it('an empty list says so', () => {
    expect(text(<InterestedView {...props({ rows: [], counts: { yes: 0, no: 0 } })} />)).toContain(
      "Pas encore d'intéressé",
    );
  });
});

describe('copyInterestedNumbers', () => {
  it('copies the numbers from the numbers route, one per line', async () => {
    api.mockResolvedValue({ numbers: ['+221 77 123 45 12', '+221 70 000 00 01'] });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyInterestedNumbers('org_1', 'c1')).toBe(2);
    expect(api).toHaveBeenCalledWith('/api/shops/org_1/campaigns/c1/responses/numbers');
    expect(writeText).toHaveBeenCalledWith('+221 77 123 45 12\n+221 70 000 00 01');
  });

  it('copies nothing when nobody is interested', async () => {
    api.mockResolvedValue({ numbers: [] });
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyInterestedNumbers('org_1', 'c1')).toBe(0);
    expect(writeText).not.toHaveBeenCalled();
  });
});

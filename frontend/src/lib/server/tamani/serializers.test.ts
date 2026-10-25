import { afterEach, describe, it, expect, vi } from 'vitest';
import { shareUrl, toCampaign, toPublicProduct, toShop, toShopProduct } from './serializers';

const product = {
  id: 'prod_1',
  organizationId: 'org_1',
  name: 'Marmites inox 5 L',
  description: null,
  unitLabel: 'pièce',
  unitPrice: 7500,
  wholesalePrice: 6000,
  wholesaleMinQty: 12,
  costPrice: 5000,
  photos: ['https://res.cloudinary.com/demo/image/upload/m.jpg', 42],
  optionLabel: 'Couleur',
  options: ['Rouge', 'Bleu'],
  archivedAt: null,
  createdAt: new Date('2026-10-24T10:00:00Z'),
  updatedAt: new Date('2026-10-24T10:00:00Z'),
};

describe('toShop', () => {
  it('toShop sends the description', () => {
    const org = {
      id: 'org_1',
      slug: 'diallo-import',
      name: 'Diallo Import',
      ownerId: 'user_1',
      whatsappPhone: '+221771234567',
      country: 'SN',
      currency: 'XOF',
      logoUrl: null,
      description: 'Riz et huile en gros.',
      coefConsumer: 0.5,
      coefReseller: 0.7,
      createdAt: new Date('2026-10-24T10:00:00Z'),
      updatedAt: new Date('2026-10-24T10:00:00Z'),
    };
    expect(toShop(org, null, new Date('2026-10-25T10:00:00Z')).description).toBe(
      'Riz et huile en gros.',
    );
  });
});

describe('product serializers', () => {
  it('toPublicProduct never exposes costPrice', () => {
    expect(Object.keys(toPublicProduct(product)).sort()).toEqual(
      [
        'id',
        'name',
        'description',
        'unitLabel',
        'unitPrice',
        'wholesalePrice',
        'wholesaleMinQty',
        'photos',
        'optionLabel',
        'options',
      ].sort(),
    );
  });

  it('toShopProduct keeps costPrice for the shop and only string photos', () => {
    expect(toShopProduct(product)).toMatchObject({
      costPrice: 5000,
      photos: ['https://res.cloudinary.com/demo/image/upload/m.jpg'],
      archivedAt: null,
      createdAt: '2026-10-24T10:00:00.000Z',
    });
  });
});

describe('campaign serializers', () => {
  afterEach(() => vi.unstubAllEnvs());

  const now = new Date('2026-10-24T10:00:00Z');
  const campaign = {
    id: 'camp_1',
    organizationId: 'org_1',
    productId: 'prod_1',
    product,
    title: 'Marmites inox 5 L',
    availability: 'INCOMING',
    availableAt: new Date('2026-11-03T10:00:00Z'),
    stockQuantity: null,
    plannedQuantity: 200,
    showStock: false,
    endsAt: null,
    deliveryEnabled: false,
    showLiveCounter: true,
    shareTemplate: '🔔 Nouveau : *{produit}* à {prix}. {disponibilite}. 👉 {lien}',
    status: 'ACTIVE',
    closedAt: null,
    arrivedAt: null,
    createdAt: now,
    updatedAt: now,
    links: [
      {
        id: 'link_1',
        campaignId: 'camp_1',
        code: 'k3P9xQa',
        label: 'Lien principal',
        isDefault: true,
        openCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };

  it('shareUrl strips the trailing slash of APP_URL', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app/');
    expect(shareUrl('k3P9xQa')).toBe('https://tamani.app/c/k3P9xQa');
  });

  it('toCampaign renders the share message with the default link', () => {
    vi.stubEnv('APP_URL', 'https://tamani.app');
    const c = toCampaign(campaign, now);
    expect(c.defaultLink).toMatchObject({ code: 'k3P9xQa', url: 'https://tamani.app/c/k3P9xQa' });
    expect(c.shareMessage).toBe(
      '🔔 Nouveau : *Marmites inox 5 L* à 7 500 FCFA (gros : 6 000 FCFA dès 12). Arrivage dans 10 jours. 👉 https://tamani.app/c/k3P9xQa',
    );
    expect(c.product).not.toHaveProperty('costPrice');
  });

  it('toCampaign reports the effective status', () => {
    const expired = { ...campaign, endsAt: new Date('2026-10-23T10:00:00Z') };
    expect(toCampaign(expired, now).status).toBe('CLOSED');
  });
});

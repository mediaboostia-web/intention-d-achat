import { describe, it, expect } from 'vitest';
import { toPublicProduct, toShopProduct } from './serializers';

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

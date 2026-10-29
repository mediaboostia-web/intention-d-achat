import { describe, it, expect } from 'vitest';
import {
  emptyProductForm,
  productFormToBody,
  productToForm,
  type ShopProduct,
} from './product-form';

const filled = {
  ...emptyProductForm,
  name: ' Marmites inox 5 L ',
  unitPrice: '7 500',
  wholesalePrice: '6000',
  wholesaleMinQty: '12',
};

describe('productFormToBody', () => {
  it('turns the typed values into the API body', () => {
    expect(productFormToBody({ ...filled, costPrice: '5 000 F' }, 'XOF')).toEqual({
      ok: true,
      body: {
        name: 'Marmites inox 5 L',
        description: null,
        unitLabel: 'pièce',
        unitPrice: 7500,
        wholesalePrice: 6000,
        wholesaleMinQty: 12,
        costPrice: 5000,
        photos: [],
        optionLabel: null,
        options: [],
      },
    });
  });

  it('puts each problem under its field', () => {
    const cases: Array<[Partial<typeof filled>, string]> = [
      [{ wholesaleMinQty: '' }, 'wholesaleMinQty'],
      [{ unitPrice: '7,5' }, 'unitPrice'],
      [{ name: '  ' }, 'name'],
      [{ wholesalePrice: '8000' }, 'wholesalePrice'],
      [{ options: ['Rouge'] }, 'optionLabel'],
    ];
    for (const [patch, field] of cases) {
      expect(productFormToBody({ ...filled, ...patch }, 'XOF'), field).toMatchObject({
        ok: false,
        errors: { [field]: expect.any(String) },
      });
    }
  });
});

describe('productToForm', () => {
  it('turns a saved product back into what the form shows', () => {
    const saved: ShopProduct = {
      id: 'p1',
      name: 'Marmites inox 5 L',
      description: null,
      unitLabel: 'pièce',
      unitPrice: 7500,
      wholesalePrice: 6000,
      wholesaleMinQty: 12,
      costPrice: null,
      photos: ['https://res.cloudinary.com/demo/image/upload/v1/m.jpg'],
      optionLabel: 'Couleur',
      options: ['Rouge', 'Noir'],
      archivedAt: null,
      createdAt: '2026-10-24T10:00:00.000Z',
    };
    const form = productToForm(saved);
    expect(form).toEqual({
      name: 'Marmites inox 5 L',
      description: '',
      unitLabel: 'pièce',
      unitPrice: '7 500',
      wholesalePrice: '6 000',
      wholesaleMinQty: '12',
      costPrice: '',
      photos: saved.photos,
      optionLabel: 'Couleur',
      options: ['Rouge', 'Noir'],
    });
    expect(productFormToBody(form, 'XOF')).toMatchObject({ ok: true, body: { unitPrice: 7500 } });
  });
});

describe('productFormToBody in the shop currency (lot 7b)', () => {
  it('asks for the price in the shop currency', () => {
    expect(productFormToBody({ ...filled, unitPrice: 'beaucoup' }, 'GNF')).toEqual({
      ok: false,
      errors: { unitPrice: 'Écris le prix en FG, sans virgule, par exemple 7 500.' },
    });
  });
});

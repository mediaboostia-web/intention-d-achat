import { describe, it, expect } from 'vitest';
import {
  emptyProductForm,
  productFormToBody,
  productToForm,
  type ProductFormValues,
  type ShopProduct,
} from './product-form';

const filled: ProductFormValues = {
  ...emptyProductForm,
  name: ' Marmites inox 5 L ',
  unitPrice: '7 500',
  offers: [{ kind: 'FROM', qty: '12', price: '6000', name: '' }],
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
        offers: [{ kind: 'FROM', qty: 12, price: 6000, name: null }],
        costPrice: 5000,
        photos: [],
        optionLabel: null,
        options: [],
      },
    });
  });

  it('puts each problem under its field', () => {
    const cases: Array<[Partial<typeof filled>, string]> = [
      [{ offers: [{ kind: 'FROM', qty: '', price: '6000', name: '' }] }, 'offers'],
      [{ unitPrice: '7,5' }, 'unitPrice'],
      [{ name: '  ' }, 'name'],
      [{ offers: [{ kind: 'FROM', qty: '12', price: '8000', name: '' }] }, 'offers'],
      [{ offers: [{ kind: 'PACK', qty: '1', price: '26000', name: '' }] }, 'offers'],
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
      offers: [{ kind: 'PACK', qty: 12, price: 26000, name: 'Demi-lot' }],
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
      offers: [{ kind: 'PACK', qty: '12', price: '26 000', name: 'Demi-lot' }],
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

describe('productFormToBody offers', () => {
  it('drops the empty rows and names the offer that breaks a rule', () => {
    expect(
      productFormToBody(
        {
          ...filled,
          offers: [
            { kind: 'PACK', qty: '', price: '', name: '' },
            { kind: 'PACK', qty: '12', price: '26 000', name: ' Demi-lot ' },
          ],
        },
        'XOF',
      ),
    ).toMatchObject({
      ok: true,
      body: { offers: [{ kind: 'PACK', qty: 12, price: 26000, name: 'Demi-lot' }] },
    });
    expect(
      productFormToBody(
        { ...filled, offers: [{ kind: 'FROM', qty: '12', price: '8 000', name: '' }] },
        'XOF',
      ),
    ).toEqual({
      ok: false,
      errors: { offers: "Offre 1 : le prix de gros doit être plus bas que le prix à l'unité." },
    });
  });
});

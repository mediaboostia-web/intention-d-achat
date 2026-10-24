import { describe, it, expect } from 'vitest';
import { emptyProductForm, productFormToBody } from './product-form';

const filled = {
  ...emptyProductForm,
  name: ' Marmites inox 5 L ',
  unitPrice: '7 500',
  wholesalePrice: '6000',
  wholesaleMinQty: '12',
};

describe('productFormToBody', () => {
  it('turns the typed values into the API body', () => {
    expect(productFormToBody({ ...filled, costPrice: '5 000 F' })).toEqual({
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
      expect(productFormToBody({ ...filled, ...patch }), field).toMatchObject({
        ok: false,
        errors: { [field]: expect.any(String) },
      });
    }
  });
});

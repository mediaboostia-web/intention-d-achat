import { describe, it, expect } from 'vitest';
import {
  optionStockFromForm,
  optionStockLeft,
  optionStockToForm,
  readOptionStock,
  stockLeft,
} from './stock';

describe('optionStockLeft', () => {
  it('takes the paid pieces off each option, never below zero', () => {
    expect(
      optionStockLeft(
        [
          { option: 'Noir', count: 30 },
          { option: 'Rouge', count: 4 },
        ],
        [
          [{ option: 'Rouge', quantity: 3 }],
          [
            { option: 'Rouge', quantity: 2 },
            { option: 'Noir', quantity: 1 },
          ],
        ],
      ),
    ).toEqual({ Noir: 29, Rouge: 0 });
  });

  it('ignores paid pieces of an option no longer counted', () => {
    expect(
      optionStockLeft([{ option: 'Noir', count: 5 }], [[{ option: 'Blond', quantity: 2 }]]),
    ).toEqual({ Noir: 5 });
  });
});

describe('stockLeft', () => {
  it('takes the paid quantities off the stock, never below zero', () => {
    expect(stockLeft(10, [3, 4])).toBe(3);
    expect(stockLeft(5, [3, 4])).toBe(0);
    expect(stockLeft(null, [3])).toBeNull();
  });
});

describe('readOptionStock', () => {
  it('reads the stored counts, null when none or malformed', () => {
    expect(readOptionStock([{ option: 'Noir', count: 0 }])).toEqual([{ option: 'Noir', count: 0 }]);
    expect(readOptionStock(null)).toBeNull();
    expect(readOptionStock([{ option: 'Noir', count: -1 }])).toBeNull();
    expect(readOptionStock([{ option: 'Noir' }])).toBeNull();
  });
});

describe('option stock in the forms', () => {
  const options = ['Noir', 'Rouge', 'Blond'];

  it('shows the saved counts, blank where none', () => {
    expect(optionStockToForm(options, [{ option: 'Rouge', count: 4 }])).toEqual({
      Noir: '',
      Rouge: '4',
      Blond: '',
    });
    expect(optionStockToForm(options, null)).toEqual({ Noir: '', Rouge: '', Blond: '' });
  });

  it('keeps the typed counts in the product order, null when none', () => {
    expect(optionStockFromForm(options, { Rouge: '4', Noir: '30', Blond: '0' })).toEqual({
      ok: true,
      stock: [
        { option: 'Noir', count: 30 },
        { option: 'Rouge', count: 4 },
        { option: 'Blond', count: 0 },
      ],
    });
    expect(optionStockFromForm(options, { Noir: ' ' })).toEqual({ ok: true, stock: null });
    expect(optionStockFromForm(options, { Noir: 'trente' })).toEqual({ ok: false, option: 'Noir' });
  });
});

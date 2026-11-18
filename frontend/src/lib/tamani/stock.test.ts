import { describe, it, expect } from 'vitest';
import { optionStockLeft, readOptionStock, stockLeft } from './stock';

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

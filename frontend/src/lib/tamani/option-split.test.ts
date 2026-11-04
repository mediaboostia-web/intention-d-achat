import { describe, expect, it } from 'vitest';
import { optionEntries, optionSplit, optionText, splitTotal } from './option-split';

// Porteur, 2026-11-04: « l'utilisateur peut choisir des nombres différents par
// couleur ou taille ».
describe('optionSplit', () => {
  it('reads the stored split', () => {
    expect(
      optionSplit({
        option: null,
        quantity: 5,
        optionQuantities: [
          { option: 'Rouge', quantity: 3 },
          { option: 'Bleu', quantity: 2 },
        ],
      }),
    ).toEqual([
      { option: 'Rouge', quantity: 3 },
      { option: 'Bleu', quantity: 2 },
    ]);
  });

  it('an answer from before the split is one line: its option and its quantity', () => {
    expect(optionSplit({ option: 'Rouge', quantity: 4, optionQuantities: null })).toEqual([
      { option: 'Rouge', quantity: 4 },
    ]);
    expect(optionSplit({ option: null, quantity: 4, optionQuantities: null })).toEqual([]);
  });

  it('ignores a stored value that is not a split', () => {
    for (const bad of [
      'Rouge',
      { Rouge: 3 },
      [{ option: 'Rouge', quantity: 0 }],
      [{ option: 3 }],
    ]) {
      expect(optionSplit({ option: null, quantity: 3, optionQuantities: bad })).toEqual([]);
    }
  });
});

describe('optionText', () => {
  it('several options read with their quantity, one alone keeps its name', () => {
    expect(
      optionText([
        { option: 'Rouge', quantity: 3 },
        { option: 'Bleu', quantity: 2 },
      ]),
    ).toBe('Rouge × 3, Bleu × 2');
    expect(optionText([{ option: 'Rouge', quantity: 3 }])).toBe('Rouge');
    expect(optionText([])).toBeNull();
  });
});

describe('optionEntries', () => {
  it('keeps the product’s order and drops the zeros', () => {
    expect(optionEntries(['S', 'M', 'L'], { L: 2, S: 1, M: 0 })).toEqual([
      { option: 'S', quantity: 1 },
      { option: 'L', quantity: 2 },
    ]);
  });

  it('the total is the sum', () => {
    expect(
      splitTotal([
        { option: 'S', quantity: 1 },
        { option: 'L', quantity: 2 },
      ]),
    ).toBe(3);
  });
});

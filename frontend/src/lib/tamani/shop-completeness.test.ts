import { describe, it, expect } from 'vitest';
import { shopCompleteness } from './shop-completeness';

describe('shopCompleteness', () => {
  it('lists what is missing in order', () => {
    expect(shopCompleteness({ description: null, logoUrl: null }, 0)).toEqual({
      complete: false,
      missing: ['description', 'logo', 'zones'],
    });
    expect(shopCompleteness({ description: '  ', logoUrl: 'https://x/l.png' }, 2).missing).toEqual([
      'description',
    ]);
  });

  it('a complete shop', () => {
    expect(
      shopCompleteness({ description: 'Riz en gros.', logoUrl: 'https://x/l.png' }, 1),
    ).toEqual({
      complete: true,
      missing: [],
    });
  });
});

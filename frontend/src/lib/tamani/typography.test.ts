import { describe, it, expect } from 'vitest';
import { frenchSpacing } from './typography';

const NBSP = String.fromCharCode(0xa0);

describe('frenchSpacing', () => {
  it('ties ? ! : ; to the word before, as French typesetting does', () => {
    expect(frenchSpacing('Le produit est-il déjà là ?')).toBe(`Le produit est-il déjà là${NBSP}?`);
    expect(frenchSpacing('Bienvenue ! Créons ta boutique.')).toBe(
      `Bienvenue${NBSP}! Créons ta boutique.`,
    );
    expect(frenchSpacing('Prix : 7 500')).toBe(`Prix${NBSP}: 7 500`);
  });

  it('leaves text without such marks alone', () => {
    expect(frenchSpacing('Mes campagnes')).toBe('Mes campagnes');
  });
});

import { describe, expect, it } from 'vitest';
import {
  BUSINESS_TYPE_OPTIONS,
  BUSINESS_TYPES,
  SALES_CHANNEL_OPTIONS,
  SALES_CHANNELS,
  businessTypeLabel,
  isBusinessType,
  isSalesChannel,
  salesChannelLabel,
} from './shop-profile';

// Porteur, 2026-11-04: « Créer un Onboarding : Grossiste, Importateur, Autres
// ou les Deux / Vente en ligne, Boutique physique, Les deux ».
describe('shop profile', () => {
  it('asks what the shop is, in the porteur’s words and order', () => {
    expect(BUSINESS_TYPE_OPTIONS.map((o) => o.label)).toEqual([
      'Grossiste',
      'Importateur',
      'Les deux',
      'Autre',
    ]);
    expect(BUSINESS_TYPE_OPTIONS.map((o) => o.value)).toEqual([...BUSINESS_TYPES]);
  });

  it('asks where it sells', () => {
    expect(SALES_CHANNEL_OPTIONS.map((o) => o.label)).toEqual([
      'Vente en ligne',
      'Boutique physique',
      'Les deux',
    ]);
    expect(SALES_CHANNEL_OPTIONS.map((o) => o.value)).toEqual([...SALES_CHANNELS]);
  });

  it('« Les deux » reads in full where it stands alone', () => {
    expect(businessTypeLabel('BOTH')).toBe('Grossiste et importateur');
    expect(salesChannelLabel('BOTH')).toBe('En ligne et en boutique');
    expect(businessTypeLabel(null)).toBe('Non renseigné');
  });

  it('knows its own values only', () => {
    expect(isBusinessType('IMPORTER')).toBe(true);
    expect(isBusinessType('RETAILER')).toBe(false);
    expect(isSalesChannel('STORE')).toBe(true);
    expect(isSalesChannel('both')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { clientWhatsappMessage, lastInterestText, lockedContactText } from './client-view';

const last = {
  campaignId: 'c1',
  productName: 'Riz parfumé',
  unitLabel: 'sac',
  interested: true,
  quantity: 3,
  at: '2026-10-25T10:00:00.000Z',
};

describe('clientWhatsappMessage', () => {
  it('greets the client and names the product', () => {
    expect(
      clientWhatsappMessage({
        firstName: 'Awa',
        shopName: 'Diallo Import',
        productName: 'Riz parfumé',
      }),
    ).toBe("Bonjour Awa, c'est Diallo Import. Tu m'as répondu pour Riz parfumé.");
  });

  it('works without a first name or a product', () => {
    expect(
      clientWhatsappMessage({
        firstName: null,
        shopName: 'Diallo Import',
        productName: 'Riz parfumé',
      }),
    ).toBe("Bonjour, c'est Diallo Import. Tu m'as répondu pour Riz parfumé.");
    expect(
      clientWhatsappMessage({ firstName: 'Awa', shopName: 'Diallo Import', productName: null }),
    ).toBe("Bonjour Awa, c'est Diallo Import.");
  });
});

describe('lockedContactText', () => {
  it('names the client the Pro plan would let you reach', () => {
    expect(lockedContactText('Awa')).toBe('Passe au Pro pour contacter Awa.');
    expect(lockedContactText(null)).toBe('Passe au Pro pour contacter ce client.');
  });
});

describe('lastInterestText', () => {
  it('reads the product and the quantity, or non', () => {
    expect(lastInterestText(last)).toBe('Riz parfumé, 3 sacs');
    expect(lastInterestText({ ...last, quantity: 1 })).toBe('Riz parfumé, 1 sac');
    expect(lastInterestText({ ...last, interested: false, quantity: null })).toBe(
      'Riz parfumé, non',
    );
    expect(lastInterestText({ ...last, quantity: null })).toBe('Riz parfumé, oui');
  });
});

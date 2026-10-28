import { describe, it, expect } from 'vitest';
import {
  CLIENT_NOTE_MAX,
  clientWhatsappMessage,
  lastInterestText,
  lockedContactText,
  lockedReliabilityText,
  normalizeClientNote,
  reliabilityText,
} from './client-view';

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

describe('reliabilityText', () => {
  const NBSP = ' ';
  const PENDING =
    "Le taux s'affiche dès 2 « oui » sur des campagnes terminées dont les commandes sont livrées ou annulées.";

  it('reads the spec sentence with the rate', () => {
    expect(reliabilityText({ yesCount: 5, fulfilledCount: 4, rate: 0.8 }, 'Awa')).toEqual({
      line: `Awa a dit oui 5 fois, a acheté 4 fois · 80${NBSP}%`,
      pending: null,
    });
  });

  it('rounds the rate to a whole percent and names a client without a first name', () => {
    expect(reliabilityText({ yesCount: 3, fulfilledCount: 2, rate: 2 / 3 }, null).line).toBe(
      `Ce client a dit oui 3 fois, a acheté 2 fois · 67${NBSP}%`,
    );
    expect(reliabilityText({ yesCount: 4, fulfilledCount: 0, rate: 0 }, 'Awa').line).toBe(
      `Awa a dit oui 4 fois, a acheté 0 fois · 0${NBSP}%`,
    );
  });

  it('gives the counts without a rate under 2 finished yes answers, and says why', () => {
    expect(reliabilityText({ yesCount: 1, fulfilledCount: 1, rate: null }, 'Awa')).toEqual({
      line: 'Awa a dit oui 1 fois, a acheté 1 fois.',
      pending: PENDING,
    });
    expect(reliabilityText({ yesCount: 0, fulfilledCount: 0, rate: null }, null)).toEqual({
      line: "Ce client n'a pas encore dit oui sur une campagne terminée et suivie en commandes.",
      pending: PENDING,
    });
  });
});

describe('lockedReliabilityText', () => {
  it('names what Pro tells about the client', () => {
    expect(lockedReliabilityText('Awa')).toBe(
      'Avec Pro, tu vois si Awa achète vraiment après avoir dit oui.',
    );
    expect(lockedReliabilityText(null)).toBe(
      'Avec Pro, tu vois si ce client achète vraiment après avoir dit oui.',
    );
  });
});

describe('normalizeClientNote', () => {
  it('keeps the note as the server does: trimmed, blank is none', () => {
    expect(normalizeClientNote('  Paie en fin de mois \n')).toBe('Paie en fin de mois');
    expect(normalizeClientNote('   ')).toBeNull();
    expect(normalizeClientNote('')).toBeNull();
    expect(CLIENT_NOTE_MAX).toBe(1000);
  });
});

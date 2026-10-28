import { describe, expect, it } from 'vitest';
import { poweredByHref, stockLine, thanksCopy } from './popup-copy';

describe('stockLine', () => {
  it('says how many are in stock, never « plus que »', () => {
    expect(stockLine(200, 'bouteille')).toBe('200 bouteilles en stock');
    expect(stockLine(1, 'bouteille')).toBe('1 bouteille en stock');
    expect(stockLine(12, 'sac de 25 kg')).toBe('12 sacs de 25 kg en stock');
  });
});

describe('thanksCopy', () => {
  const yes = {
    interested: true,
    firstName: 'Boostia',
    shopName: 'Sow Import',
    productName: 'Huile 5 L',
    unitLabel: 'bouteille',
    quantity: 21,
  };

  it('after a yes: the order is recorded and the shop will confirm on WhatsApp', () => {
    expect(thanksCopy(yes)).toEqual({
      title: "C'est noté, Boostia !",
      lines: [
        "Ta commande de 21 bouteilles d'Huile 5 L est bien enregistrée.",
        'Sow Import va te contacter sur WhatsApp pour la confirmer.',
      ],
    });
  });

  it('writes « de » before a consonant and has no name to say when there is none', () => {
    const copy = thanksCopy({
      ...yes,
      firstName: null,
      productName: 'Riz parfumé',
      quantity: 1,
      unitLabel: 'sac',
    });
    expect(copy.title).toBe("C'est noté !");
    expect(copy.lines[0]).toBe('Ta commande de 1 sac de Riz parfumé est bien enregistrée.');
  });

  it('after a no: thanks for the opinion, which the shop keeps for its next arrivals', () => {
    expect(thanksCopy({ ...yes, interested: false, quantity: null })).toEqual({
      title: 'Merci pour ton avis !',
      lines: ['Sow Import en tient compte pour ses prochains arrivages.'],
    });
  });
});

describe('poweredByHref', () => {
  it('points to the app at its production address, with the shop as referrer', () => {
    expect(poweredByHref('https://tamani.app', 'diallo-import')).toBe(
      'https://tamani.app/?ref=diallo-import',
    );
    expect(poweredByHref('https://tamani.app/', 'sow & fils')).toBe(
      'https://tamani.app/?ref=sow%20%26%20fils',
    );
  });
});

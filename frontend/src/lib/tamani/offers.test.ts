import { describe, it, expect } from 'vitest';
import { formatMoney } from './currency';
import {
  OFFERS_MAX,
  freezePicks,
  legacyOffers,
  lowestPiecePrice,
  offerLabel,
  offerViolation,
  pickAmount,
  pickPieces,
  picksText,
  picksTotal,
  offersOf,
  priceLine,
  readOffers,
  readPicks,
  type Offer,
} from './offers';

const m = (n: number) => formatMoney(n, 'XOF');
const PACK_12: Offer = { kind: 'PACK', qty: 12, price: 26_000, name: null };
const FROM_12: Offer = { kind: 'FROM', qty: 12, price: 10_000, name: null };
const HALF: Offer = { kind: 'PACK', qty: 45, price: 175_000, name: 'Demi-lot' };

describe('legacyOffers', () => {
  it('turns the old wholesale price into one FROM offer', () => {
    expect(legacyOffers(6000, 12)).toEqual([{ kind: 'FROM', qty: 12, price: 6000, name: null }]);
    expect(legacyOffers(null, 12)).toEqual([]);
    expect(legacyOffers(6000, null)).toEqual([]);
  });
});

describe('readOffers', () => {
  it('keeps the well-formed offers and drops the rest', () => {
    expect(
      readOffers([PACK_12, { kind: 'X', qty: 2, price: 1 }, { kind: 'FROM', qty: 1, price: 5 }]),
    ).toEqual([PACK_12]);
    expect(readOffers({ kind: 'PACK' })).toEqual([]);
    expect(readOffers([{ kind: 'PACK', qty: 45, price: 175_000, name: 'Demi-lot' }])).toEqual([
      HALF,
    ]);
  });
});

describe('offerViolation', () => {
  it('refuses a FROM price not below the unit price', () => {
    expect(offerViolation([{ ...FROM_12, price: 12_000 }], 10_000)).toEqual({
      index: 0,
      message: "Le prix de gros doit être plus bas que le prix à l'unité.",
    });
  });

  it('refuses two offers of the same kind and quantity', () => {
    expect(offerViolation([PACK_12, { ...PACK_12, price: 25_000 }], 12_000)).toEqual({
      index: 1,
      message: 'Tu as déjà une offre pour 12.',
    });
  });

  it('caps the offers at 10', () => {
    const many = Array.from({ length: OFFERS_MAX + 1 }, (_, i) => ({ ...PACK_12, qty: 12 + i }));
    expect(offerViolation(many, 12_000)).toEqual({
      index: OFFERS_MAX,
      message: '10 offres au plus.',
    });
  });

  it('accepts the porteur’s wig offers', () => {
    expect(
      offerViolation(
        [{ kind: 'PACK', qty: 85, price: 350_000, name: null }, HALF, { ...FROM_12, qty: 15 }],
        10_000,
      ),
    ).toEqual({
      index: 2,
      message: "Le prix de gros doit être plus bas que le prix à l'unité.",
    });
    expect(
      offerViolation([{ kind: 'PACK', qty: 85, price: 350_000, name: null }, HALF], 10_000),
    ).toBeNull();
  });
});

describe('freezePicks', () => {
  const offers = [PACK_12, FROM_12];

  it('prices 2 packs, 15 from 12 and 3 at the unit price', () => {
    const r = freezePicks(offers, 12_000, [
      { offer: 0, count: 2 },
      { offer: 1, count: 15 },
      { offer: 'UNIT', count: 3 },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(picksTotal(r.picks)).toEqual({ pieces: 42, amount: 238_000 });
    expect(r.picks[0]).toEqual({
      offer: 0,
      kind: 'PACK',
      qty: 12,
      price: 26_000,
      name: null,
      count: 2,
    });
    expect(r.picks[2]).toEqual({
      offer: 'UNIT',
      kind: 'UNIT',
      qty: 1,
      price: 12_000,
      name: null,
      count: 3,
    });
    expect(pickPieces(r.picks[0]!)).toBe(24);
    expect(pickAmount(r.picks[0]!)).toBe(52_000);
    expect(pickPieces(r.picks[1]!)).toBe(15);
    expect(pickAmount(r.picks[1]!)).toBe(150_000);
  });

  it('refuses a FROM count under its minimum', () => {
    expect(freezePicks(offers, 12_000, [{ offer: 1, count: 11 }])).toEqual({
      ok: false,
      message: 'À partir de 12 pour cette offre.',
    });
  });

  it('refuses a missing offer, the same offer twice, a zero count and no pick', () => {
    expect(freezePicks(offers, 12_000, [{ offer: 5, count: 1 }]).ok).toBe(false);
    expect(
      freezePicks(offers, 12_000, [
        { offer: 0, count: 1 },
        { offer: 0, count: 2 },
      ]).ok,
    ).toBe(false);
    expect(freezePicks(offers, 12_000, [{ offer: 'UNIT', count: 0 }]).ok).toBe(false);
    expect(freezePicks(offers, 12_000, []).ok).toBe(false);
  });
});

describe('readPicks', () => {
  it('reads stored picks, null when none', () => {
    const stored = [{ offer: 0, kind: 'PACK', qty: 12, price: 26_000, name: null, count: 2 }];
    expect(readPicks(stored)).toEqual(stored);
    expect(readPicks(null)).toBeNull();
    expect(readPicks([{ offer: 0 }])).toBeNull();
  });
});

describe('labels', () => {
  it('names each kind of offer', () => {
    expect(offerLabel(PACK_12, 'XOF')).toBe(`Lot de 12 · ${m(26_000)}`);
    expect(offerLabel(HALF, 'XOF')).toBe(`Demi-lot (45) · ${m(175_000)}`);
    expect(offerLabel(FROM_12, 'XOF')).toBe(`${m(10_000)} l'unité dès 12`);
  });

  it('writes the WhatsApp price line with two offers at most', () => {
    expect(priceLine(12_000, [], 'XOF')).toBe(m(12_000));
    expect(priceLine(7500, [{ ...FROM_12, price: 6000 }], 'XOF')).toBe(
      `${m(7500)} (gros : ${m(6000)} dès 12)`,
    );
    expect(priceLine(12_000, [PACK_12, FROM_12, HALF], 'XOF')).toBe(
      `${m(12_000)} (gros : 12 pour ${m(26_000)}, ${m(10_000)} dès 12, + 1 offre)`,
    );
    expect(priceLine(12_000, [HALF], 'XOF')).toBe(
      `${m(12_000)} (gros : Demi-lot 45 pour ${m(175_000)})`,
    );
    expect(priceLine(12_000, [PACK_12, FROM_12, HALF, { ...HALF, qty: 85 }], 'XOF')).toContain(
      '+ 2 offres',
    );
  });

  it('writes what a client picked', () => {
    const r = freezePicks([PACK_12, FROM_12], 12_000, [
      { offer: 0, count: 2 },
      { offer: 1, count: 15 },
      { offer: 'UNIT', count: 3 },
    ]);
    if (!r.ok) throw new Error('picks');
    expect(picksText(r.picks, 'XOF')).toBe(`2 × Lot de 12, 15 à ${m(10_000)}, 3 à l'unité`);
  });
});

describe('lowestPiecePrice', () => {
  it('takes the cheapest piece across the offers', () => {
    expect(lowestPiecePrice(12_000, [PACK_12, FROM_12])).toBe(2167);
    expect(lowestPiecePrice(12_000, [])).toBe(12_000);
  });
});

describe('offersOf', () => {
  it('reads the stored offers, else the old single wholesale price', () => {
    expect(offersOf({ offers: [PACK_12], wholesalePrice: 6000, wholesaleMinQty: 12 })).toEqual([
      PACK_12,
    ]);
    expect(offersOf({ offers: [], wholesalePrice: 6000, wholesaleMinQty: 12 })).toEqual([
      { kind: 'FROM', qty: 12, price: 6000, name: null },
    ]);
    expect(offersOf({ offers: [] })).toEqual([]);
  });
});

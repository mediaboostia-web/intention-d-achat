import { describe, it, expect } from 'vitest';
import {
  approxQuantity,
  pluralizeUnit,
  verdictBasis,
  verdictDisplay,
  VERDICT_TONE,
} from './verdict-display';

describe('approxQuantity', () => {
  it.each([
    [211, 210],
    [176, 180],
    [29, 29],
    [9, 9],
    [1234, 1230],
  ])('%i shows as %i', (n, shown) => {
    expect(approxQuantity(n)).toBe(shown);
  });
});

describe('pluralizeUnit pluralizes the first word only', () => {
  it.each([
    ['pièce', 210, 'pièces'],
    ['carton', 1, 'carton'],
    ['sac de 25 kg', 12, 'sacs de 25 kg'],
    ['colis', 3, 'colis'],
  ])('%s × %i → %s', (label, n, out) => {
    expect(pluralizeUnit(label, n)).toBe(out);
  });
});

describe('verdictDisplay', () => {
  it('maps each code to its tone', () => {
    expect(VERDICT_TONE).toEqual({
      GO: 'success',
      CAUTION: 'warning',
      STOP: 'danger',
      WAIT: 'neutral',
      NEUTRAL: 'primary',
    });
  });

  it('CAUTION: order less than planned', () => {
    expect(
      verdictDisplay({ code: 'CAUTION', realistic: 211, completedResponses: 94, reference: 400 }),
    ).toEqual({
      tone: 'warning',
      stampWord: 'Prudence',
      figure: '~210',
      unit: 'pièces',
      sentence: 'Commande environ 210 pièces, pas les 400 prévues.',
      note: 'et pas 400 !',
    });
  });

  it('GO: the community covers the plan', () => {
    expect(
      verdictDisplay({ code: 'GO', realistic: 380, completedResponses: 120, reference: 400 }),
    ).toEqual({
      tone: 'success',
      stampWord: 'Commande',
      figure: '~380',
      unit: 'pièces',
      sentence: 'Commande environ 380 pièces.',
      note: null,
    });
  });

  it("STOP: don't buy, or very little", () => {
    expect(
      verdictDisplay({ code: 'STOP', realistic: 90, completedResponses: 60, reference: 400 }),
    ).toEqual({
      tone: 'danger',
      stampWord: "N'achète pas",
      figure: '~90',
      unit: 'pièces au plus',
      sentence:
        "N'achète pas, ou très peu : la demande réaliste est de 90 pièces pour 400 prévues.",
      note: 'et pas 400 !',
    });
  });

  it('WAIT: shows progress towards 20 responses', () => {
    expect(
      verdictDisplay({ code: 'WAIT', realistic: 30, completedResponses: 9, reference: 400 }),
    ).toEqual({
      tone: 'neutral',
      stampWord: 'On attend',
      figure: '9/20',
      unit: 'réponses',
      sentence: 'Encore 11 réponses avant de te conseiller.',
      note: null,
    });
  });

  it('WAIT uses singular for one missing response', () => {
    expect(
      verdictDisplay({ code: 'WAIT', realistic: 30, completedResponses: 19, reference: null })
        .sentence,
    ).toBe('Encore 1 réponse avant de te conseiller.');
  });

  it('NEUTRAL: no reference quantity', () => {
    expect(
      verdictDisplay({ code: 'NEUTRAL', realistic: 211, completedResponses: 94, reference: null }),
    ).toEqual({
      tone: 'primary',
      stampWord: 'Demande',
      figure: '~210',
      unit: 'pièces',
      sentence: 'Ta communauté demande environ 210 pièces.',
      note: null,
    });
  });

  it('follows the product unit', () => {
    const d = verdictDisplay({
      code: 'CAUTION',
      realistic: 1250,
      completedResponses: 300,
      reference: 2000,
      unitLabel: 'sac de 25 kg',
    });
    expect(d.unit).toBe('sacs de 25 kg');
    expect(d.sentence).toBe('Commande environ 1250 sacs de 25 kg, pas les 2000 prévues.');
  });
});

describe('verdictBasis', () => {
  it('states the range and what it rests on', () => {
    expect(verdictBasis({ low: 176, high: 246, completedResponses: 94, interestedCount: 64 })).toBe(
      "Entre 176 et 246 pièces, d'après 94 réponses dont 64 intéressés.",
    );
  });

  it('uses singular for one response', () => {
    expect(verdictBasis({ low: 1, high: 2, completedResponses: 1, interestedCount: 1 })).toBe(
      "Entre 1 et 2 pièces, d'après 1 réponse dont 1 intéressé.",
    );
  });
});

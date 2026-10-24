import { describe, it, expect } from 'vitest';
import { TIMING_LABELS, TIMING_OPTIONS } from './timing';
import {
  BUYER_TYPE_LABELS,
  BUYER_TYPE_POPUP_LABELS,
  BUYER_TYPES,
  NOT_INTERESTED_REASON_LABELS,
  NOT_INTERESTED_REASONS,
  QUANTITY_PRESETS,
} from './labels';

describe('timing', () => {
  it('offers the near choices in stock and the arrival choices for incoming stock', () => {
    expect(TIMING_OPTIONS.IN_STOCK).toEqual(['TODAY_TOMORROW', 'THIS_WEEK', 'THIS_MONTH']);
    expect(TIMING_OPTIONS.INCOMING).toEqual(['ON_ARRIVAL', 'WEEK_AFTER', 'LATER']);
  });

  it('labels every timing in French', () => {
    expect(TIMING_LABELS).toEqual({
      TODAY_TOMORROW: "Aujourd'hui / demain",
      THIS_WEEK: 'Cette semaine',
      THIS_MONTH: 'Ce mois-ci',
      ON_ARRIVAL: "Dès l'arrivée",
      WEEK_AFTER: 'La semaine suivante',
      LATER: 'Plus tard',
    });
  });
});

describe('labels', () => {
  it('names buyer types for the popup and for the shop', () => {
    expect(BUYER_TYPES).toEqual(['CONSUMER', 'RESELLER']);
    expect(BUYER_TYPE_POPUP_LABELS).toEqual({ CONSUMER: 'Moi', RESELLER: 'Revendre' });
    expect(BUYER_TYPE_LABELS).toEqual({ CONSUMER: 'Usager', RESELLER: 'Revendeur' });
  });

  it('names the four reasons for a no', () => {
    expect(NOT_INTERESTED_REASONS).toEqual(['TOO_EXPENSIVE', 'NO_NEED', 'ALREADY_BOUGHT', 'OTHER']);
    expect(NOT_INTERESTED_REASON_LABELS).toEqual({
      TOO_EXPENSIVE: 'Trop cher',
      NO_NEED: 'Pas besoin',
      ALREADY_BOUGHT: 'Déjà acheté',
      OTHER: 'Autre',
    });
  });

  it('proposes quantities by buyer type', () => {
    expect(QUANTITY_PRESETS).toEqual({ CONSUMER: [1, 2, 3, 5], RESELLER: [6, 12, 24, 50] });
  });
});

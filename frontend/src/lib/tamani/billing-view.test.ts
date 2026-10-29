import { describe, expect, it } from 'vitest';
import {
  FOR_WHO,
  graceDaysLeft,
  meterLine,
  meterTone,
  offerCards,
  pendingLine,
  purchaseStatusLabel,
  returnState,
} from './billing-view';

const now = new Date('2026-10-29T10:00:00Z');
const usage = (over: object = {}) => ({
  plan: 'MONTH_PLUS' as const,
  used: 1240,
  included: 3000,
  endsAt: '2026-11-12T10:00:00.000Z',
  inGrace: false,
  pending: 0,
  ...over,
});

describe('meterTone', () => {
  it('meterTone at 79, 80 and 100 %', () => {
    expect(meterTone(79, 100)).toBe('ok');
    expect(meterTone(80, 100)).toBe('warning');
    expect(meterTone(99, 100)).toBe('warning');
    expect(meterTone(100, 100)).toBe('full');
    expect(meterTone(130, 100)).toBe('full');
    // Nothing included (no pass): every new answer waits.
    expect(meterTone(0, 0)).toBe('full');
  });
});

describe('meterLine', () => {
  it('reads the answers of the pass and its end', () => {
    expect(meterLine(usage(), now)).toBe("1 240 / 3 000 réponses · pass jusqu'au 12 novembre");
    expect(meterLine(usage({ plan: 'TRIAL', used: 12, included: 50 }), now)).toBe(
      "12 / 50 réponses · essai jusqu'au 12 novembre",
    );
    expect(meterLine(usage({ inGrace: true, endsAt: '2026-11-15T10:00:00.000Z' }), now)).toBe(
      '1 240 / 3 000 réponses · pass terminé, à racheter avant le 15 novembre',
    );
  });

  it('meterLine without pass shows the pending count', () => {
    const none = usage({ plan: 'FREE', used: 0, included: 0, endsAt: null });
    expect(meterLine({ ...none, pending: 87 }, now)).toBe('Sans pass · 87 réponses en attente');
    expect(meterLine({ ...none, pending: 1 }, now)).toBe('Sans pass · 1 réponse en attente');
    expect(meterLine(none, now)).toBe('Sans pass');
  });
});

describe('pendingLine and graceDaysLeft', () => {
  it('tells the pending answers and the days of grace left', () => {
    expect(pendingLine(0)).toBeNull();
    expect(pendingLine(1)).toBe("1 réponse t'attend. Prends un pass pour la voir.");
    expect(pendingLine(87)).toBe("87 réponses t'attendent. Prends un pass pour les voir.");
    expect(graceDaysLeft('2026-11-01T09:00:00.000Z', now)).toBe(3);
    expect(graceDaysLeft('2026-10-29T12:00:00.000Z', now)).toBe(1);
    expect(graceDaysLeft(null, now)).toBe(0);
  });
});

describe('offerCards', () => {
  it('lists the five passes in the grid order, the best value on Mois Max', () => {
    const cards = offerCards('XAF');
    expect(cards.map((c) => c.id)).toEqual([
      'WEEK',
      'TWO_WEEKS',
      'MONTH',
      'MONTH_PLUS',
      'MONTH_MAX',
    ]);
    expect(cards[0]).toEqual({
      id: 'WEEK',
      name: 'Pass Semaine',
      price: '3 900 FCFA',
      durationLabel: '7 jours',
      responsesLabel: '150 réponses',
      forWho: FOR_WHO.WEEK,
      bestValue: false,
    });
    expect(cards.filter((c) => c.bestValue).map((c) => c.id)).toEqual(['MONTH_MAX']);
    expect(cards[4]?.responsesLabel).toBe('15 000 réponses');
  });
});

describe('returnState', () => {
  it('reads checking, active and failed', () => {
    expect(returnState(null)).toBe('checking');
    expect(returnState({ status: 'PENDING', activated: false })).toBe('checking');
    // Paid after the order expired: SasPay is still being asked.
    expect(returnState({ status: 'EXPIRED', activated: false })).toBe('checking');
    expect(returnState({ status: 'PAID', activated: true })).toBe('active');
    expect(returnState({ status: 'FAILED', activated: false })).toBe('failed');
  });
});

describe('purchaseStatusLabel', () => {
  it('names a purchase as the shop reads it', () => {
    expect(purchaseStatusLabel({ status: 'PAID', activated: true })).toBe('Actif');
    expect(purchaseStatusLabel({ status: 'PENDING', activated: false })).toBe('En attente');
    expect(purchaseStatusLabel({ status: 'EXPIRED', activated: false })).toBe('Non payé');
    expect(purchaseStatusLabel({ status: 'FAILED', activated: false })).toBe('Échoué');
  });
});

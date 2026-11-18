import { describe, it, expect } from 'vitest';
import { DEFAULT_SHARE_TEMPLATE } from './share-message';
import {
  WIZARD_STEPS,
  canAdvance,
  initialWizardState,
  toCampaignBody,
  todayIso,
  wizardAvailableAt,
  wizardReducer,
} from './campaign-wizard';

const now = new Date('2026-10-24T10:00:00Z');

describe('campaign wizard', () => {
  it('walks six steps, bounded at both ends', () => {
    expect(WIZARD_STEPS).toEqual([
      'product',
      'availability',
      'quantities',
      'end',
      'delivery',
      'message',
    ]);
    let s = initialWizardState();
    expect(s.step).toBe(0);
    s = wizardReducer(s, { type: 'back' });
    expect(s.step).toBe(0);
    s = wizardReducer(s, { type: 'goto', step: 5 });
    s = wizardReducer(s, { type: 'next' });
    expect(s.step).toBe(5);
  });

  it('needs a product before leaving the first step', () => {
    const s = initialWizardState();
    expect(canAdvance(s, now)).toBe(false);
    expect(
      canAdvance(wizardReducer(s, { type: 'set', field: 'productId', value: 'prod_1' }), now),
    ).toBe(true);
  });

  it('an incoming campaign needs a date', () => {
    const s = { ...initialWizardState('p1'), step: 1, availability: 'INCOMING' as const };
    expect(canAdvance(s, now)).toBe(false);
    expect(canAdvance({ ...s, availableOn: '2026-11-03' }, now)).toBe(true);
    expect(canAdvance({ ...s, availability: 'IN_STOCK' }, now)).toBe(true);
    expect('availableInDays' in s).toBe(false);
  });

  it('refuses a past arrival date', () => {
    const s = { ...initialWizardState('p1'), step: 1, availability: 'INCOMING' as const };
    expect(canAdvance({ ...s, availableOn: '2026-10-23' }, now)).toBe(false);
    expect(canAdvance({ ...s, availableOn: '2026-10-24' }, now)).toBe(true);
    expect(todayIso(now)).toBe('2026-10-24');
  });

  it('keeps every value after a failed launch', () => {
    let s = initialWizardState();
    s = wizardReducer(s, { type: 'set', field: 'productId', value: 'prod_1' });
    s = wizardReducer(s, { type: 'set', field: 'shareTemplate', value: 'Mon message {lien}' });
    s = wizardReducer(s, { type: 'goto', step: 5 });
    s = wizardReducer(s, { type: 'submit' });
    const failed = wizardReducer(s, { type: 'failed', error: 'Tu as déjà 3 campagnes actives.' });
    expect(failed).toEqual({ ...s, error: 'Tu as déjà 3 campagnes actives.', submitting: false });
  });

  it('builds the API body', () => {
    let s = initialWizardState();
    s = wizardReducer(s, { type: 'set', field: 'productId', value: 'prod_1' });
    s = wizardReducer(s, { type: 'set', field: 'availability', value: 'INCOMING' });
    s = wizardReducer(s, { type: 'set', field: 'availableOn', value: '2026-11-03' });
    s = wizardReducer(s, { type: 'set', field: 'plannedQuantity', value: '200' });
    s = wizardReducer(s, { type: 'set', field: 'endsInDays', value: 14 });
    expect(toCampaignBody(s, 'ACTIVE', now)).toEqual({
      productId: 'prod_1',
      availability: 'INCOMING',
      availableAt: '2026-11-03T12:00:00.000Z',
      stockQuantity: null,
      plannedQuantity: 200,
      showStock: false,
      endsAt: '2026-11-07T10:00:00.000Z',
      deliveryEnabled: false,
      shippingEnabled: false,
      optionStock: null,
      showLiveCounter: true,
      shareTemplate: DEFAULT_SHARE_TEMPLATE,
      status: 'ACTIVE',
    });
  });

  it('sends no arrival date for stock on hand and no end without a date', () => {
    let s = initialWizardState();
    s = wizardReducer(s, { type: 'set', field: 'productId', value: 'prod_1' });
    s = wizardReducer(s, { type: 'set', field: 'endsInDays', value: null });
    expect(toCampaignBody(s, 'DRAFT', now)).toMatchObject({
      availability: 'IN_STOCK',
      availableAt: null,
      endsAt: null,
      status: 'DRAFT',
    });
  });
});

describe('wizardAvailableAt', () => {
  it('availableAt is noon UTC of the chosen day', () => {
    const incoming = { ...initialWizardState('p1'), availability: 'INCOMING' as const };
    expect(wizardAvailableAt(incoming)).toBeNull();
    expect(wizardAvailableAt({ ...incoming, availableOn: '2026-12-01' })?.toISOString()).toBe(
      '2026-12-01T12:00:00.000Z',
    );
    expect(wizardAvailableAt(initialWizardState('p1'))).toBeNull();
  });
});

describe('campaign wizard with options (2026-11-18)', () => {
  const now = new Date('2026-10-24T10:00:00Z');

  it('sends a count per option and their sum as the stock', () => {
    let s = initialWizardState('prod_1');
    s = wizardReducer(s, { type: 'set', field: 'optionStock', value: { Noir: '30', Rouge: '4' } });
    s = wizardReducer(s, { type: 'set', field: 'shippingEnabled', value: true });
    expect(toCampaignBody(s, 'ACTIVE', now, ['Noir', 'Rouge', 'Blond'])).toMatchObject({
      optionStock: [
        { option: 'Noir', count: 30 },
        { option: 'Rouge', count: 4 },
      ],
      stockQuantity: 34,
      shippingEnabled: true,
    });
  });

  it('waits for a count it can read before the next step', () => {
    let s = initialWizardState('prod_1');
    s = wizardReducer(s, { type: 'goto', step: 2 });
    s = wizardReducer(s, { type: 'set', field: 'optionStock', value: { Noir: 'trente' } });
    expect(canAdvance(s, now)).toBe(false);
  });
});

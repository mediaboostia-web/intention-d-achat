import { describe, it, expect } from 'vitest';
import { DEFAULT_SHARE_TEMPLATE } from './share-message';
import {
  WIZARD_STEPS,
  canAdvance,
  initialWizardState,
  toCampaignBody,
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
    expect(canAdvance(s)).toBe(false);
    expect(canAdvance(wizardReducer(s, { type: 'set', field: 'productId', value: 'prod_1' }))).toBe(
      true,
    );
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
    s = wizardReducer(s, { type: 'set', field: 'availableInDays', value: 10 });
    s = wizardReducer(s, { type: 'set', field: 'plannedQuantity', value: '200' });
    s = wizardReducer(s, { type: 'set', field: 'endsInDays', value: 14 });
    expect(toCampaignBody(s, 'ACTIVE', now)).toEqual({
      productId: 'prod_1',
      availability: 'INCOMING',
      availableAt: '2026-11-03T10:00:00.000Z',
      stockQuantity: null,
      plannedQuantity: 200,
      showStock: false,
      endsAt: '2026-11-07T10:00:00.000Z',
      deliveryEnabled: false,
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
  it('gives the arrival date the campaign will be sent with', () => {
    const incoming = { ...initialWizardState('p1'), availability: 'INCOMING' as const };
    expect(wizardAvailableAt(incoming, now)?.toISOString()).toBe('2026-11-03T10:00:00.000Z');
    expect(wizardAvailableAt({ ...incoming, availableOn: '2026-12-01' }, now)?.toISOString()).toBe(
      '2026-12-01T12:00:00.000Z',
    );
    expect(wizardAvailableAt(initialWizardState('p1'), now)).toBeNull();
  });
});

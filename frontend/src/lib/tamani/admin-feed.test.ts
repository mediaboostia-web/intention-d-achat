import { describe, expect, it } from 'vitest';
import {
  FEED_FILTERS,
  feedHref,
  feedTitle,
  feedTypes,
  parseFeedQuery,
  paymentMethodLabel,
  unreadLabel,
} from './admin-feed';

describe('admin feed words', () => {
  it('titles each kind of event', () => {
    expect(feedTitle('SIGNUP')).toBe('Nouvelle inscription');
    expect(feedTitle('SHOP')).toBe('Nouvelle boutique');
    expect(feedTitle('PAYMENT')).toBe('Paiement reçu');
    expect(feedTitle('PAYMENT_FAILED')).toBe('Paiement non abouti');
  });

  it('offers three filters: everything, sign-ups, payments', () => {
    expect(FEED_FILTERS.map((f) => [f.key, f.label])).toEqual([
      ['tout', 'Tout'],
      ['inscriptions', 'Inscriptions'],
      ['paiements', 'Paiements'],
    ]);
    expect(feedTypes('tout')).toEqual(['SIGNUP', 'SHOP', 'PAYMENT', 'PAYMENT_FAILED']);
    expect(feedTypes('inscriptions')).toEqual(['SIGNUP', 'SHOP']);
    expect(feedTypes('paiements')).toEqual(['PAYMENT', 'PAYMENT_FAILED']);
  });

  it('reads the filter and the page from the address, ignoring junk', () => {
    expect(parseFeedQuery({})).toEqual({ type: 'tout', before: null });
    expect(parseFeedQuery({ type: 'paiements', before: '2026-11-04T10:00:00.000Z' })).toEqual({
      type: 'paiements',
      before: new Date('2026-11-04T10:00:00.000Z'),
    });
    expect(parseFeedQuery({ type: 'nimporte', before: 'hier' })).toEqual({
      type: 'tout',
      before: null,
    });
    expect(parseFeedQuery({ type: ['inscriptions', 'tout'] }).type).toBe('inscriptions');
  });

  it('writes the address back, the default filter left out', () => {
    expect(feedHref({ type: 'tout', before: null })).toBe('/support-admin/notifications');
    expect(feedHref({ type: 'paiements', before: null })).toBe(
      '/support-admin/notifications?type=paiements',
    );
    expect(feedHref({ type: 'tout', before: new Date('2026-11-04T10:00:00.000Z') })).toBe(
      '/support-admin/notifications?before=2026-11-04T10%3A00%3A00.000Z',
    );
  });

  it('names the payment methods', () => {
    expect(paymentMethodLabel('WAVE')).toBe('Wave');
    expect(paymentMethodLabel('ORANGE_MONEY')).toBe('Orange Money');
    expect(paymentMethodLabel('FREE_MONEY')).toBe('Free Money');
    expect(paymentMethodLabel(null)).toBeNull();
  });

  it('says how many are new, for the badge', () => {
    expect(unreadLabel(1)).toBe('1 nouvelle notification');
    expect(unreadLabel(3)).toBe('3 nouvelles notifications');
    expect(unreadLabel(99)).toBe('99 nouvelles notifications ou plus');
  });
});

import { describe, it, expect } from 'vitest';
import { TAMANI_ERRORS, isUniqueViolation, tamaniError } from './errors';

describe('TAMANI_ERRORS', () => {
  it('lists the contract codes', () => {
    expect([...TAMANI_ERRORS].sort()).toEqual(
      [
        'SHOP_ALREADY_EXISTS',
        'SHOP_NOT_FOUND',
        'ZONE_NOT_FOUND',
        'ZONE_ALREADY_EXISTS',
        'PRODUCT_NOT_FOUND',
        'PRODUCT_IN_USE',
        'CAMPAIGN_NOT_FOUND',
        'CAMPAIGN_CLOSED',
        'CAMPAIGN_LIMIT_REACHED',
        'INVALID_CAMPAIGN_TRANSITION',
        'PLAN_FEATURE_LOCKED',
        'INVALID_PHONE',
        'INVALID_RESPONSE_TOKEN',
        'RATE_LIMITED',
        'ORDER_NOT_FOUND',
        'ORDER_ALREADY_EXISTS',
        'INVALID_ORDER_TRANSITION',
        'CLIENT_NOT_FOUND',
        'RESPONSE_NOT_FOUND',
        'RESPONSE_NOT_INTERESTED',
        'BILLING_NOT_CONFIGURED',
        'PAYMENT_VERIFY_FAILED',
        'PUSH_NOT_CONFIGURED',
      ].sort(),
    );
  });
});

describe('tamaniError', () => {
  it('returns { error, message } with the status', async () => {
    const res = tamaniError('SHOP_NOT_FOUND', 404);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('SHOP_NOT_FOUND');
    expect(body.message.length).toBeGreaterThan(0);
  });

  it('uses the message it is given', async () => {
    const res = tamaniError('INVALID_PHONE', 400, 'Numéro illisible.');
    expect(await res.json()).toEqual({ error: 'INVALID_PHONE', message: 'Numéro illisible.' });
  });
});

describe('isUniqueViolation', () => {
  it('matches a P2002 on the given field', () => {
    const e = { code: 'P2002', meta: { target: ['slug'] } };
    expect(isUniqueViolation(e, 'slug')).toBe(true);
    expect(isUniqueViolation(e, 'code')).toBe(false);
    expect(isUniqueViolation(e)).toBe(true);
  });

  it('reads a constraint name target', () => {
    expect(
      isUniqueViolation({ code: 'P2002', meta: { target: 'CampaignLink_code_key' } }, 'code'),
    ).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isUniqueViolation({ code: 'P2025' })).toBe(false);
    expect(isUniqueViolation(new Error('boom'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

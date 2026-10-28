import { describe, it, expect } from 'vitest';
import { DEFAULT_COEFFICIENTS, coefficientsFor } from './coefficients';

describe('coefficientsFor', () => {
  it('reads the defaults as DEFAULT', () => {
    expect(DEFAULT_COEFFICIENTS).toEqual({ consumer: 0.5, reseller: 0.7 });
    expect(coefficientsFor({ coefConsumer: 0.5, coefReseller: 0.7 })).toEqual({
      consumer: 0.5,
      reseller: 0.7,
      source: { consumer: 'DEFAULT', reseller: 'DEFAULT' },
    });
  });

  it('reads a value the shop changed as SHOP', () => {
    expect(coefficientsFor({ coefConsumer: 0.6, coefReseller: 0.7 }).source).toEqual({
      consumer: 'SHOP',
      reseller: 'DEFAULT',
    });
  });

  it('takes a learned coefficient as LEARNED, the other one from the settings', () => {
    const learned = {
      consumer: 0.6,
      reseller: 0.82,
      learned: { consumer: false, reseller: true },
    };
    expect(coefficientsFor({ coefConsumer: 0.6, coefReseller: 0.7 }, learned)).toEqual({
      consumer: 0.6,
      reseller: 0.82,
      source: { consumer: 'SHOP', reseller: 'LEARNED' },
    });
    expect(
      coefficientsFor(
        { coefConsumer: 0.5, coefReseller: 0.7 },
        { ...learned, consumer: 0.3, learned: { consumer: true, reseller: false } },
      ),
    ).toEqual({
      consumer: 0.3,
      reseller: 0.7,
      source: { consumer: 'LEARNED', reseller: 'DEFAULT' },
    });
  });

  it('without learned coefficients, reads the settings', () => {
    expect(coefficientsFor({ coefConsumer: 0.5, coefReseller: 0.7 }, null).source).toEqual({
      consumer: 'DEFAULT',
      reseller: 'DEFAULT',
    });
  });
});

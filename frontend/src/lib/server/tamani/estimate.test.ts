import { describe, it, expect } from 'vitest';
import { estimateDemand } from './estimate';

describe('estimateDemand', () => {
  it('applies the conversion coefficient per buyer type, with a ±0.1 range', () => {
    const e = estimateDemand(
      [
        { buyerType: 'CONSUMER', quantity: 4 },
        { buyerType: 'CONSUMER', quantity: 6 },
        { buyerType: 'RESELLER', quantity: 50 },
        { buyerType: 'RESELLER', quantity: 50 },
      ],
      { consumer: 0.5, reseller: 0.7 },
    );
    expect(e).toMatchObject({ announced: 110, realistic: 75, low: 64, high: 86 });
    expect(e.byBuyerType).toEqual({
      CONSUMER: { respondents: 2, announced: 10, realistic: 5 },
      RESELLER: { respondents: 2, announced: 100, realistic: 70 },
    });
  });

  it('bounds the range to [0, 1]', () => {
    const e = estimateDemand(
      [
        { buyerType: 'CONSUMER', quantity: 100 },
        { buyerType: 'RESELLER', quantity: 100 },
      ],
      { consumer: 0.95, reseller: 0.05 },
    );
    expect(e).toMatchObject({ announced: 200, realistic: 100, low: 85, high: 115 });
  });

  it('is all zeros without responses', () => {
    expect(estimateDemand([], { consumer: 0.5, reseller: 0.7 })).toEqual({
      announced: 0,
      realistic: 0,
      low: 0,
      high: 0,
      byBuyerType: {
        CONSUMER: { respondents: 0, announced: 0, realistic: 0 },
        RESELLER: { respondents: 0, announced: 0, realistic: 0 },
      },
    });
  });
});

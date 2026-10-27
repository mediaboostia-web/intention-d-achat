// The share of announced demand that turns into a purchase, per buyer type
// (spec §5.4.1). Lot 6 reads the shop's settings; lot 7 adds the
// coefficients learned from real orders.
import 'server-only';

export const DEFAULT_COEFFICIENTS = { consumer: 0.5, reseller: 0.7 } as const;

export type CoefficientSource = 'DEFAULT' | 'SHOP' | 'LEARNED';

export interface Coefficients {
  consumer: number;
  reseller: number;
  source: { consumer: CoefficientSource; reseller: CoefficientSource };
}

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function coefficientsFor(org: { coefConsumer: number; coefReseller: number }): Coefficients {
  return {
    consumer: org.coefConsumer,
    reseller: org.coefReseller,
    source: {
      consumer: same(org.coefConsumer, DEFAULT_COEFFICIENTS.consumer) ? 'DEFAULT' : 'SHOP',
      reseller: same(org.coefReseller, DEFAULT_COEFFICIENTS.reseller) ? 'DEFAULT' : 'SHOP',
    },
  };
}

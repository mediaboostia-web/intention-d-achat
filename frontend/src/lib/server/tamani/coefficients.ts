// The share of announced demand that turns into a purchase, per buyer type
// (spec §5.4.1). Lot 6 reads the shop's settings; lot 7 adds the
// coefficients learned from real orders (reliability.ts), passed only when
// the plan has `reliability`.
import 'server-only';
import type { Coefficients } from '@/lib/tamani/results-view';
import type { LearnedCoefficients } from './reliability';

export type { Coefficients };

export const DEFAULT_COEFFICIENTS = { consumer: 0.5, reseller: 0.7 } as const;

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function coefficientsFor(
  org: { coefConsumer: number; coefReseller: number },
  learned: LearnedCoefficients | null = null,
): Coefficients {
  const settings = (value: number, byDefault: number) =>
    same(value, byDefault) ? ('DEFAULT' as const) : ('SHOP' as const);
  const learnedConsumer = learned?.learned.consumer === true;
  const learnedReseller = learned?.learned.reseller === true;
  return {
    consumer: learned && learnedConsumer ? learned.consumer : org.coefConsumer,
    reseller: learned && learnedReseller ? learned.reseller : org.coefReseller,
    source: {
      consumer: learnedConsumer
        ? 'LEARNED'
        : settings(org.coefConsumer, DEFAULT_COEFFICIENTS.consumer),
      reseller: learnedReseller
        ? 'LEARNED'
        : settings(org.coefReseller, DEFAULT_COEFFICIENTS.reseller),
    },
  };
}

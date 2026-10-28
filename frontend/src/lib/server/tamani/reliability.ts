// What a shop learns from its real orders (spec §5.5.3, lot 7): how often a
// client who says yes buys, and the share of announced demand each buyer
// type really buys, which replaces the settings' coefficients once there is
// enough of it. Only fulfilled orders (delivered or picked up) count as a
// purchase, and only yes answers of finished campaigns (CLOSED or ARRIVED)
// are weighed: a running campaign may still turn into orders.
import 'server-only';
import { BUYER_TYPES, type BuyerType } from '@/lib/tamani/labels';
import { COUNTED } from './campaign-responses';
import { finishedCampaignWhere } from './campaign-status';
import type { Db } from './locks';

/** A client's rate shows from 2 finished yes answers. */
export const MIN_ANSWERS_FOR_RELIABILITY = 2;
/** A buyer type's coefficient is learned from 20 yes answers over 2 finished campaigns. */
export const MIN_ANSWERS_FOR_LEARNING = 20;
export const MIN_CAMPAIGNS_FOR_LEARNING = 2;
const LEARNED_MIN = 0.1;
const LEARNED_MAX = 1;
/** Newest answers first: enough to learn from, small enough for every home page. */
const MAX_LEARNING_ROWS = 20_000;

export interface ClientReliability {
  /** Yes answers on finished campaigns. */
  yesCount: number;
  /** Those followed by a fulfilled order. */
  fulfilledCount: number;
  /** fulfilledCount / yesCount; null under 2 finished yes answers. */
  rate: number | null;
}

/** « a dit oui 5 fois, a acheté 4 fois · 80 % »: both counts on finished campaigns only. */
export function clientReliability(
  rows: ReadonlyArray<{ interested: boolean; campaignFinished: boolean; fulfilled: boolean }>,
): ClientReliability {
  const weighed = rows.filter((r) => r.interested && r.campaignFinished);
  const yesCount = weighed.length;
  const fulfilledCount = weighed.filter((r) => r.fulfilled).length;
  return {
    yesCount,
    fulfilledCount,
    rate: yesCount < MIN_ANSWERS_FOR_RELIABILITY ? null : fulfilledCount / yesCount,
  };
}

/** Each buyer type's coefficient, and whether it was learned or is the fallback. */
export interface LearnedCoefficients {
  consumer: number;
  reseller: number;
  learned: { consumer: boolean; reseller: boolean };
}

const bounded = (n: number) => Math.min(LEARNED_MAX, Math.max(LEARNED_MIN, n));

/**
 * One row per counted yes answer of a finished campaign: the quantity it
 * announced and the quantity its fulfilled order bought (0 without one).
 * Per buyer type, Σ bought / Σ announced, to the hundredth, bounded to
 * [0.1, 1]; under the threshold the fallback (the shop's settings) stays.
 */
export function learnedCoefficients(
  rows: ReadonlyArray<{
    buyerType: BuyerType;
    campaignId: string;
    announced: number;
    fulfilledQty: number;
  }>,
  fallback: { consumer: number; reseller: number },
): LearnedCoefficients {
  const learn = (type: BuyerType, fallbackValue: number) => {
    // A yes without a quantity announced nothing: it cannot weigh a share.
    const own = rows.filter((r) => r.buyerType === type && r.announced > 0);
    const campaigns = new Set(own.map((r) => r.campaignId));
    if (own.length < MIN_ANSWERS_FOR_LEARNING || campaigns.size < MIN_CAMPAIGNS_FOR_LEARNING) {
      return { value: fallbackValue, learned: false };
    }
    const announced = own.reduce((n, r) => n + r.announced, 0);
    const bought = own.reduce((n, r) => n + Math.max(0, r.fulfilledQty), 0);
    return { value: bounded(Math.round((bought / announced) * 100) / 100), learned: true };
  };
  const consumer = learn('CONSUMER', fallback.consumer);
  const reseller = learn('RESELLER', fallback.reseller);
  return {
    consumer: consumer.value,
    reseller: reseller.value,
    learned: { consumer: consumer.learned, reseller: reseller.learned },
  };
}

const isBuyerType = (v: string | null): v is BuyerType =>
  v !== null && (BUYER_TYPES as readonly string[]).includes(v);

/**
 * The shop's counted yes answers on finished campaigns, with what their
 * orders bought. Callers pass it only when the plan has `reliability`.
 */
export async function loadLearnedCoefficients(
  db: Db,
  organizationId: string,
  fallback: { consumer: number; reseller: number },
  now: Date,
): Promise<LearnedCoefficients> {
  const answers = await db.response.findMany({
    where: {
      organizationId,
      ...COUNTED,
      interested: true,
      buyerType: { in: [...BUYER_TYPES] },
      quantity: { gt: 0 },
      campaign: finishedCampaignWhere(now),
    },
    orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
    take: MAX_LEARNING_ROWS,
    select: {
      buyerType: true,
      campaignId: true,
      quantity: true,
      order: { select: { status: true, quantity: true } },
    },
  });
  const rows = answers.flatMap((a) =>
    isBuyerType(a.buyerType) && a.quantity !== null
      ? [
          {
            buyerType: a.buyerType,
            campaignId: a.campaignId,
            announced: a.quantity,
            fulfilledQty: a.order?.status === 'FULFILLED' ? a.order.quantity : 0,
          },
        ]
      : [],
  );
  return learnedCoefficients(rows, fallback);
}

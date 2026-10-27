// What the dashboard reads (lot 6): the shapes the stats, responses and
// summary routes send, and the sentences the result screens write. Pure and
// shared with the browser; the numbers are computed in lib/server/tamani/.
import type { BuyerType } from './labels';

/** Realistic demand (spec §5.4.1), computed by lib/server/tamani/estimate.ts. */
export interface DemandEstimate {
  announced: number;
  realistic: number;
  low: number;
  high: number;
  byBuyerType: Record<BuyerType, { respondents: number; announced: number; realistic: number }>;
}

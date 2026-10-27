// What the dashboard reads (lot 6): the shapes the stats, responses and
// summary routes send, and the sentences the result screens write. Pure and
// shared with the browser; the numbers are computed in lib/server/tamani/.
import type { BuyerType, NotInterestedReason } from './labels';
import type { Timing } from './timing';
import type { VerdictCode } from './verdict-display';

/** Realistic demand (spec §5.4.1), computed by lib/server/tamani/estimate.ts. */
export interface DemandEstimate {
  announced: number;
  realistic: number;
  low: number;
  high: number;
  byBuyerType: Record<BuyerType, { respondents: number; announced: number; realistic: number }>;
}

/** DEFAULT 0.5 / 0.7, SHOP when changed in the settings, LEARNED from real orders (lot 7). */
export type CoefficientSource = 'DEFAULT' | 'SHOP' | 'LEARNED';

export interface Coefficients {
  consumer: number;
  reseller: number;
  source: { consumer: CoefficientSource; reseller: CoefficientSource };
}

/** What only the plan's estimate feature shows: the verdict and what it rests on. */
export interface CampaignResult {
  estimate: DemandEstimate;
  coefs: Coefficients;
  verdict: { code: VerdictCode; ratio: number | null; missingResponses: number };
  /** Null while the verdict waits for its 20 answers. */
  money: { avoidedDeadStock: number | null; expectedProfit: number | null } | null;
  /** Realistic demand against the stock; null without a stock. */
  stockStatus: 'SHORTAGE' | 'ENOUGH' | null;
}

/**
 * A campaign's figures. "Counted" answers are complete, within the monthly
 * quota and not suspicious; the breakdowns read the counted yes answers.
 */
export interface CampaignStats {
  opens: number;
  completed: number;
  incomplete: number;
  lockedCount: number;
  suspiciousCount: number;
  interested: number;
  notInterested: number;
  interestRate: number | null;
  announced: number;
  reference: number | null;
  stock: number | null;
  byBuyerType: Record<BuyerType, { respondents: number; announced: number }>;
  byZone: Array<{ zoneId: string; name: string; respondents: number; quantity: number }>;
  pickup: { respondents: number; quantity: number };
  byTiming: Array<{ timing: Timing; respondents: number }>;
  byOption: Array<{ option: string; respondents: number; quantity: number }>;
  bySource: Array<{
    linkId: string;
    label: string;
    opens: number;
    completed: number;
    interested: number;
  }>;
  noReasons: Array<{ reason: NotInterestedReason; count: number }>;
  result: CampaignResult;
}

/** PLAN: the plan has the estimate; OFFERED: the free plan's first verdict; LOCKED: hidden. */
export type VerdictAccess = 'PLAN' | 'OFFERED' | 'LOCKED';

/**
 * One counted answer in the interested list (GET …/responses). Without the
 * plan's contacts, `phone` is masked and `phoneE164` is null; an
 * anonymized client has neither name nor number.
 */
export interface InterestedRow {
  id: string;
  respondentId: string | null;
  firstName: string | null;
  phone: string | null;
  phoneE164: string | null;
  interested: boolean;
  reason: NotInterestedReason | null;
  buyerType: BuyerType | null;
  quantity: number | null;
  option: string | null;
  timing: Timing | null;
  wantsDelivery: boolean | null;
  zoneName: string | null;
  sourceLabel: string | null;
  completedAt: string;
}

export interface InterestedPage {
  items: InterestedRow[];
  nextCursor: string | null;
  /** First page only: the campaign's yes and no answers. */
  counts: { yes: number; no: number } | null;
}

/** What GET …/campaigns/[campaignId]/stats sends. */
export interface CampaignStatsBody {
  stats: Omit<CampaignStats, 'result'> & { result: CampaignResult | null };
  access: VerdictAccess;
}

// A campaign's figures for its results tab (spec §5.4.0): counts, the
// estimate and its verdict, the money, and where, when and why. Pure: the
// stats route reads the rows and decides what the plan may see.
import 'server-only';
import { BUYER_TYPES, NOT_INTERESTED_REASONS, type BuyerType } from '@/lib/tamani/labels';
import type { CampaignStats } from '@/lib/tamani/results-view';
import { TIMING_LABELS, type Timing } from '@/lib/tamani/timing';
import type { Coefficients } from './coefficients';
import { estimateDemand } from './estimate';
import { computeMoney } from './money';
import { computeVerdict, verdictReference } from './verdict';

/** The columns of Response the figures read. */
export interface StatsRow {
  completedAt: Date | null;
  locked: boolean;
  suspicious: boolean;
  interested: boolean | null;
  notInterestedReason: string | null;
  buyerType: string | null;
  quantity: number | null;
  option: string | null;
  timing: string | null;
  wantsDelivery: boolean | null;
  zoneId: string | null;
  linkId: string | null;
}

export interface StatsCampaign {
  plannedQuantity: number | null;
  stockQuantity: number | null;
  product: { costPrice: number | null; unitPrice: number; wholesalePrice: number | null };
  links: ReadonlyArray<{ id: string; label: string; openCount: number; isDefault: boolean }>;
}

const TIMINGS = Object.keys(TIMING_LABELS) as Timing[];

const isBuyerType = (v: string | null): v is BuyerType =>
  v !== null && (BUYER_TYPES as readonly string[]).includes(v);
const isTiming = (v: string | null): v is Timing => v !== null && TIMINGS.includes(v as Timing);

/** A yes the estimate can use: a buyer type and a positive quantity. */
interface Yes extends StatsRow {
  buyerType: BuyerType;
  quantity: number;
}

function tally<K>(
  items: readonly Yes[],
  key: (y: Yes) => K | null,
): Map<K, { respondents: number; quantity: number }> {
  const out = new Map<K, { respondents: number; quantity: number }>();
  for (const y of items) {
    const k = key(y);
    if (k === null) continue;
    const cur = out.get(k) ?? { respondents: 0, quantity: 0 };
    cur.respondents += 1;
    cur.quantity += y.quantity;
    out.set(k, cur);
  }
  return out;
}

const byQuantity = (a: { quantity: number }, b: { quantity: number }) => b.quantity - a.quantity;

export function computeCampaignStats(
  rows: readonly StatsRow[],
  campaign: StatsCampaign,
  zones: ReadonlyArray<{ id: string; name: string }>,
  coefs: Coefficients,
): CampaignStats {
  const counted = rows.filter((r) => r.completedAt !== null && !r.locked && !r.suspicious);
  const yesRows = counted.filter((r) => r.interested === true);
  const noRows = counted.filter((r) => r.interested === false);
  const yes = yesRows.filter(
    (r): r is Yes => isBuyerType(r.buyerType) && r.quantity !== null && r.quantity > 0,
  );

  const estimate = estimateDemand(yes, coefs);
  const reference = verdictReference(campaign);
  const verdict = computeVerdict({
    realistic: estimate.realistic,
    completedResponses: counted.length,
    reference,
  });
  const money =
    verdict.code === 'WAIT' ? null : computeMoney({ reference, estimate, ...campaign.product });
  const stock = campaign.stockQuantity;

  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const byZone = [
    ...tally(yes, (y) => (y.wantsDelivery && y.zoneId && zoneName.has(y.zoneId) ? y.zoneId : null)),
  ]
    .map(([zoneId, t]) => ({ zoneId, name: zoneName.get(zoneId) ?? '', ...t }))
    .sort((a, b) => byQuantity(a, b) || a.name.localeCompare(b.name, 'fr'));
  const pickup = tally(yes, (y) => (y.wantsDelivery === false ? 'PICKUP' : null)).get('PICKUP');

  const timings = tally(yes, (y) => (isTiming(y.timing) ? y.timing : null));
  const byTiming = TIMINGS.flatMap((timing) => {
    const t = timings.get(timing);
    return t ? [{ timing, respondents: t.respondents }] : [];
  });

  const byOption = [...tally(yes, (y) => (y.option ? y.option : null))]
    .map(([option, t]) => ({ option, ...t }))
    .sort((a, b) => byQuantity(a, b) || a.option.localeCompare(b.option, 'fr'));

  const links = [...campaign.links].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const bySource = links.map((l) => ({
    linkId: l.id,
    label: l.label,
    opens: l.openCount,
    completed: counted.filter((r) => r.linkId === l.id).length,
    interested: yesRows.filter((r) => r.linkId === l.id).length,
  }));

  const noReasons = NOT_INTERESTED_REASONS.map((reason) => ({
    reason,
    count: noRows.filter((r) => r.notInterestedReason === reason).length,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const completedAll = rows.filter((r) => r.completedAt !== null);
  return {
    opens: campaign.links.reduce((acc, l) => acc + l.openCount, 0),
    completed: counted.length,
    incomplete: rows.length - completedAll.length,
    lockedCount: completedAll.filter((r) => r.locked).length,
    suspiciousCount: completedAll.filter((r) => r.suspicious && !r.locked).length,
    interested: yesRows.length,
    notInterested: noRows.length,
    interestRate: counted.length === 0 ? null : yesRows.length / counted.length,
    announced: estimate.announced,
    reference,
    stock,
    byBuyerType: {
      CONSUMER: {
        respondents: estimate.byBuyerType.CONSUMER.respondents,
        announced: estimate.byBuyerType.CONSUMER.announced,
      },
      RESELLER: {
        respondents: estimate.byBuyerType.RESELLER.respondents,
        announced: estimate.byBuyerType.RESELLER.announced,
      },
    },
    byZone,
    pickup: pickup ?? { respondents: 0, quantity: 0 },
    byTiming,
    byOption,
    bySource,
    noReasons,
    result: {
      estimate,
      coefs,
      verdict,
      money,
      stockStatus: stock === null ? null : estimate.realistic > stock ? 'SHORTAGE' : 'ENOUGH',
    },
  };
}

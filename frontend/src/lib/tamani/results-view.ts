// What the dashboard reads (lot 6): the shapes the stats, responses and
// summary routes send, and the sentences the result screens write. Pure and
// shared with the browser; the numbers are computed in lib/server/tamani/.
import {
  BUYER_TYPE_LABELS,
  NOT_INTERESTED_REASON_LABELS,
  type BuyerType,
  type NotInterestedReason,
} from './labels';
import { TIMING_LABELS, type Availability, type Timing } from './timing';
import {
  DEFAULT_MIN_RESPONSES,
  approxQuantity,
  pluralizeUnit,
  type VerdictCode,
} from './verdict-display';

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
  /** An in-stock campaign with a stock: enough, or the restock to plan. */
  stockAdvice: StockAdvice | null;
}

/** An in-stock campaign's realistic demand against its stockQuantity (lot 6b). */
export interface StockAdvice {
  status: 'ENOUGH' | 'SHORTAGE';
  leftover: number;
  restock: number;
  /** Under the verdict's 20 counted answers. */
  provisional: boolean;
}

/**
 * A campaign's figures. "Counted" answers are complete, within the monthly
 * quota and not suspicious; the breakdowns read the counted yes answers.
 */
export interface CampaignStats {
  availability: Availability;
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
  /** Yes answers delivered outside the zones (« Autre endroit »). */
  elsewhere: { respondents: number; quantity: number };
  byTiming: Array<{ timing: Timing; respondents: number; quantity: number }>;
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
  /** « Autre endroit »: where to deliver outside the zones. */
  deliveryPlace: string | null;
  /** Two letters, read from the number. */
  country: string | null;
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
  /** Free plan, no verdict offered yet: this campaign may receive it at 20 answers. */
  offerOpen: boolean;
}

/** "75 %": each row's share of the rows' total. */
export function percentRows(
  rows: ReadonlyArray<{ id: string; label: string; count: number }>,
): Array<{ id: string; label: string; value: string }> {
  const total = rows.reduce((n, r) => n + r.count, 0);
  if (total === 0) return [];
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    value: `${Math.round((r.count / total) * 100)} %`,
  }));
}

/** The most frequent "no" reason, circled on screen: "7 « non » sur 30 :" + "trop cher". */
export function priceSignal(
  reasons: ReadonlyArray<{ reason: NotInterestedReason; count: number }>,
  notInterested: number,
): { lead: string; word: string } | null {
  const top = [...reasons].sort((a, b) => b.count - a.count)[0];
  if (!top || top.count === 0 || notInterested === 0) return null;
  return {
    lead: `${top.count} « non » sur ${notInterested} :`,
    word: NOT_INTERESTED_REASON_LABELS[top.reason].toLowerCase(),
  };
}

export function stockLine(i: {
  status: CampaignResult['stockStatus'];
  realistic: number;
  stock: number | null;
  unitLabel: string;
}): string | null {
  if (i.status !== 'SHORTAGE' || i.stock === null) return null;
  const q = approxQuantity(i.realistic);
  return `La demande réaliste (~${q} ${pluralizeUnit(i.unitLabel, q)}) dépasse ton stock de ${i.stock}. Prévois de recommander.`;
}

/** An in-stock campaign's stamp: the stock when it is enough, else the restock to plan. */
export function stockAdviceDisplay(
  advice: StockAdvice,
  stock: number,
  unitLabel: string,
): { word: string; figure: string; unit: string; sentence: string; tone: 'success' | 'warning' } {
  if (advice.status === 'ENOUGH') {
    const left = approxQuantity(advice.leftover);
    return {
      word: 'Stock suffisant',
      figure: String(stock),
      unit: `${pluralizeUnit(unitLabel, stock)} en stock`,
      sentence:
        left === 0
          ? 'Tout ton stock devrait partir.'
          : `Il t'en restera environ ${left} ${pluralizeUnit(unitLabel, left)}.`,
      tone: 'success',
    };
  }
  const q = approxQuantity(advice.restock);
  const units = pluralizeUnit(unitLabel, q);
  return {
    word: 'Réassort',
    figure: `~${q}`,
    unit: units,
    sentence: `Rupture probable : prévois un réassort d'environ ${q} ${units}.`,
    tone: 'warning',
  };
}

/** "Estimation provisoire : 12 réponses sur 20." */
export function provisionalNote(completed: number): string {
  const answers = completed > 1 ? 'réponses' : 'réponse';
  return `Estimation provisoire : ${completed} ${answers} sur ${DEFAULT_MIN_RESPONSES}.`;
}

/** "6 intéressés · 12 bouteilles": who is waiting to be served. */
export function toServeLine(interested: number, announced: number, unitLabel: string): string {
  const people = interested > 1 ? 'intéressés' : 'intéressé';
  return `${interested} ${people} · ${announced} ${pluralizeUnit(unitLabel, announced)}`;
}

/** 0.45 → "4,5": how many buy out of 10 who say yes. */
const outOfTen = (coef: number) => String(Math.round(coef * 100) / 10).replace('.', ',');

/** Where a coefficient that was not learned comes from, after « celui des usagers ». */
const SETTING_ORIGIN: Readonly<Record<'DEFAULT' | 'SHOP', string>> = {
  DEFAULT: 'est la valeur de départ',
  SHOP: 'vient de tes réglages',
};

export function coefNote(coefs: Coefficients): string {
  const base = `Sur 10 revendeurs qui disent oui, ${outOfTen(coefs.reseller)} achètent vraiment ; sur 10 usagers, ${outOfTen(coefs.consumer)}.`;
  const { consumer, reseller } = coefs.source;
  if (consumer === 'LEARNED' && reseller === 'LEARNED') {
    return `${base} Ces chiffres sont appris de tes commandes.`;
  }
  if (reseller === 'LEARNED' && consumer !== 'LEARNED') {
    return `${base} Le chiffre des revendeurs est appris de tes commandes ; celui des usagers ${SETTING_ORIGIN[consumer]}.`;
  }
  if (consumer === 'LEARNED' && reseller !== 'LEARNED') {
    return `${base} Le chiffre des usagers est appris de tes commandes ; celui des revendeurs ${SETTING_ORIGIN[reseller]}.`;
  }
  return consumer === 'DEFAULT' && reseller === 'DEFAULT'
    ? `${base} Ce sont les valeurs de départ, tu peux les régler dans Réglages.`
    : `${base} Ce sont tes réglages.`;
}

export type CampaignTab = 'results' | 'interested' | 'share' | 'edit';

const TAB_PARAM: Readonly<Record<CampaignTab, string>> = {
  results: 'resultats',
  interested: 'interesses',
  share: 'partager',
  edit: 'modifier',
};

const TAB_LABEL: Readonly<Record<CampaignTab, string>> = {
  results: 'Résultats',
  interested: 'Intéressés',
  share: 'Partager',
  edit: 'Modifier',
};

/** ?onglet= picks the tab; a draft, or a campaign just sent (?partager=1), opens on Share. */
export function campaignTab(
  onglet: string | null,
  partager: string | null,
  status: string,
): CampaignTab {
  const named = (Object.keys(TAB_PARAM) as CampaignTab[]).find((t) => TAB_PARAM[t] === onglet);
  if (named) return named;
  return partager === '1' || status === 'DRAFT' ? 'share' : 'results';
}

export function campaignTabs(
  base: string,
  active: CampaignTab,
  status: string,
): Array<{ id: CampaignTab; label: string; href: string; active: boolean }> {
  return (Object.keys(TAB_PARAM) as CampaignTab[]).map((id) => ({
    id,
    label: TAB_LABEL[id],
    // Results is the default tab, except for a draft, which opens on Share.
    href: id === 'results' && status !== 'DRAFT' ? base : `${base}?onglet=${TAB_PARAM[id]}`,
    active: id === active,
  }));
}

/** ARRIVED once the product is in; otherwise the campaign's availability. */
export type ResponseMoment = 'ARRIVED' | 'IN_STOCK' | 'INCOMING';

/** The WhatsApp message to one interested person; the wholesaler reads it and sends it. */
export function interestedMessage(p: {
  firstName: string | null;
  productName: string;
  quantity: number | null;
  unitLabel: string;
  shopName: string;
  moment: ResponseMoment;
}): string {
  const hello = `${p.firstName ? `Bonjour ${p.firstName}` : 'Bonjour'}, c'est ${p.shopName}.`;
  const amount =
    p.quantity === null ? null : `${p.quantity} ${pluralizeUnit(p.unitLabel, p.quantity)}`;
  if (p.moment === 'ARRIVED') {
    // "les" for several; one piece reads "ça", since the unit's gender is unknown.
    const keep =
      amount === null
        ? "Je t'en garde ?"
        : `Tu voulais ${amount}, ${p.quantity === 1 ? 'je te garde ça' : 'je te les garde'} ?`;
    return `${hello} *${p.productName}* : c'est arrivé ! ${keep}`;
  }
  const thanks = `Merci pour ta réponse sur *${p.productName}*${amount === null ? '' : ` (${amount})`}.`;
  return p.moment === 'IN_STOCK'
    ? `${hello} ${thanks} C'est disponible : tu passes quand ?`
    : `${hello} ${thanks} Je te préviens dès que c'est là.`;
}

/** "3 pièces · Revendeur · Médina · Dès l'arrivée" for a yes, the reason for a no. */
export function interestedDetail(row: InterestedRow, unitLabel: string): string {
  if (!row.interested) {
    return row.reason ? NOT_INTERESTED_REASON_LABELS[row.reason] : 'Pas intéressé';
  }
  const where =
    row.zoneName ??
    (row.wantsDelivery === false
      ? 'Retrait'
      : row.deliveryPlace
        ? `Livraison · ${row.deliveryPlace}`
        : null);
  return [
    row.quantity === null ? null : `${row.quantity} ${pluralizeUnit(unitLabel, row.quantity)}`,
    row.option,
    row.buyerType ? BUYER_TYPE_LABELS[row.buyerType] : null,
    where,
    row.timing ? TIMING_LABELS[row.timing] : null,
  ]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');
}

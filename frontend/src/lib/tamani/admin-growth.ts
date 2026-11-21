// The support-admin's growth panel (porteur, 2026-11-21: « les chiffres, les
// articles, les users, le MRR, les abonnements… facilement identifiables »):
// what moved in the last 30 days against the 30 before. Shared with the browser.

/** A count over the last 30 days, the 30 before, and in all. */
export interface GrowthPair {
  last30: number;
  prev30: number;
  total: number;
}

export interface AdminGrowth {
  users: GrowthPair;
  shops: GrowthPair;
  answers: GrowthPair;
  waitlist: GrowthPair;
  blogLeads: GrowthPair;
  /** Published articles now. */
  articles: number;
}

const MINUS = '−';

export function deltaText(
  last: number,
  prev: number,
): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  if (last === 0 && prev === 0) return null;
  if (prev === 0) return { text: 'Premiers sur la période', tone: 'up' };
  const d = last - prev;
  if (d === 0) return { text: 'Autant que les 30 jours d’avant', tone: 'flat' };
  return {
    text: `${d > 0 ? '+' : MINUS}${Math.abs(d)} vs les 30 jours d’avant`,
    tone: d > 0 ? 'up' : 'down',
  };
}

const NOT_PAYING = new Set(['FREE', 'TRIAL']);

/** Shops on a paid pass now (the dashboard's plan breakdown, trial and free left out). */
export function payingShops(byPlan: Readonly<Record<string, number>>): number {
  return Object.entries(byPlan).reduce(
    (n, [plan, count]) => (NOT_PAYING.has(plan) ? n : n + count),
    0,
  );
}

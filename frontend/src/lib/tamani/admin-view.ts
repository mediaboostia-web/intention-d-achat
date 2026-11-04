// Support-admin words (lot 11): months, rates, plan and profile names, and
// each figure's calculation written out under it (brand rule: the
// calculation is always visible).
import type { AdminDashboard } from './admin-dashboard';
import { SHOP_COUNTRIES } from './countries';
import { formatMoney } from './currency';
import { PASS_IDS, PLANS, isPlanId } from './plans';
import {
  BUSINESS_TYPES,
  SALES_CHANNELS,
  businessTypeLabel,
  isBusinessType,
  isSalesChannel,
  salesChannelLabel,
} from './shop-profile';

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** « 2026-11 » → « novembre 2026 ». */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  return `${MONTHS[m - 1] ?? ''} ${year}`;
}

const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** « de novembre 2026 », « d’octobre 2026 »: French elides « de » before a vowel. */
export function ofMonth(month: string): string {
  const label = monthLabel(month);
  return /^[aeiouâéèêîôû]/i.test(label) ? `d’${label}` : `de ${label}`;
}

const SHORT_MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

/** « 2026-07 » → « juil. », under the chart. */
export function shortMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  return SHORT_MONTH.format(new Date(Date.UTC(year, m - 1, 1)));
}

/** « 3 nov. 2026 », in UTC like the months. */
export function dateLabel(iso: string): string {
  return DATE.format(new Date(iso));
}

/** French puts a no-break space before « % ». */
const NBSP = String.fromCharCode(0xa0);

/** 0.125 → « 12,5 % », one decimal at most. */
export function percentText(rate: number): string {
  const value = Math.round(rate * 1000) / 10;
  return `${String(value).replace('.', ',')}${NBSP}%`;
}

/** Tamani's own money is counted in FCFA. */
export const adminMoney = (amount: number) => formatMoney(amount, 'XOF');

export function planLabel(plan: string): string {
  return isPlanId(plan) ? PLANS[plan].label : plan;
}

export const PLAN_ORDER: readonly string[] = ['TRIAL', ...PASS_IDS, 'UNLIMITED', 'FREE'];
export const TYPE_ORDER: readonly string[] = [...BUSINESS_TYPES, 'NONE'];
export const CHANNEL_ORDER: readonly string[] = [...SALES_CHANNELS, 'NONE'];

export function providerLabel(provider: string): string {
  if (provider === 'saspay') return 'SasPay';
  if (provider === 'manual') return 'Manuel';
  return provider;
}

export function typeLabel(key: string): string {
  return businessTypeLabel(isBusinessType(key) ? key : null);
}

export function channelLabel(key: string): string {
  return salesChannelLabel(isSalesChannel(key) ? key : null);
}

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
}

/** A tally as rows, in the given order, empty rows dropped, unknown keys last. */
export function breakdown(
  tally: Record<string, number>,
  order: readonly string[],
  label: (key: string) => string,
): BreakdownRow[] {
  const keys = [...order, ...Object.keys(tally).filter((k) => !order.includes(k))];
  return keys.flatMap((key) => {
    const count = tally[key] ?? 0;
    return count > 0 ? [{ key, label: label(key), count }] : [];
  });
}

const shops = (n: number) => `${n} boutique${n > 1 ? 's' : ''}`;

export interface FigureText {
  value: string;
  calc: string;
}

export function churnText(churn: AdminDashboard['churn'], month: string): FigureText {
  const first = `le 1er ${monthLabel(month)}`;
  if (churn.rate === null) {
    return { value: '—', calc: `Aucune boutique n'avait de pass ${first}` };
  }
  const left = `${shops(churn.churned)} partie${churn.churned > 1 ? 's' : ''}`;
  return {
    value: percentText(churn.rate),
    calc: `${left} sur ${churn.atStart} qui avaient un pass ${first}`,
  };
}

export function cacText(cac: AdminDashboard['cac']): FigureText {
  if (cac.spend === null) return { value: '—', calc: 'Dépense marketing du mois non saisie' };
  const spent = `${adminMoney(cac.spend)} de marketing`;
  if (cac.value === null || cac.payers === 0) {
    return { value: '—', calc: `${spent}, aucune nouvelle boutique payante` };
  }
  const payers = `${cac.payers} nouvelle${cac.payers > 1 ? 's' : ''} ${
    cac.payers > 1 ? 'boutiques payantes' : 'boutique payante'
  }`;
  return { value: adminMoney(cac.value), calc: `${spent} ÷ ${payers}` };
}

export function countryLabel(code: string): string {
  return SHOP_COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

const MEMBER_ROLES: Record<string, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Admin',
  MEMBER: 'Membre',
};

export function memberRoleLabel(role: string): string {
  return MEMBER_ROLES[role] ?? role;
}

const ORDER_STATUSES: Record<string, string> = {
  PAID: 'Payé',
  PENDING: 'En attente',
  FAILED: 'Échoué',
  EXPIRED: 'Expiré',
  REFUNDED: 'Remboursé',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUSES[status] ?? status;
}

/** « Pass Semaine », with « (grâce) » while the shop is in its grace days. */
export function passLine(plan: string, inGrace: boolean): string {
  return inGrace ? `${planLabel(plan)} (grâce)` : planLabel(plan);
}

const MINUS = String.fromCharCode(0x2212);

/** The month against the one before it: « +50 % vs octobre », or null when that one had nothing. */
export function growthText(
  series: readonly { month: string; total: number }[],
): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  const now = series[series.length - 1];
  const before = series[series.length - 2];
  if (!now || !before || before.total <= 0) return null;
  const rate = (now.total - before.total) / before.total;
  const tone = rate > 0 ? 'up' : rate < 0 ? 'down' : 'flat';
  const sign = rate > 0 ? '+' : rate < 0 ? MINUS : '';
  const name = monthLabel(before.month).split(' ')[0] ?? '';
  return { text: `${sign}${percentText(Math.abs(rate))} vs ${name}`, tone };
}

export interface ShareRow extends BreakdownRow {
  /** Its part of the whole list, « 66,7 % ». */
  share: string;
  /** Its bar, to scale on the largest row (0 to 1). */
  ratio: number;
}

export function withShares(rows: readonly BreakdownRow[]): ShareRow[] {
  const total = rows.reduce((n, r) => n + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return rows.map((r) => ({
    ...r,
    share: percentText(total > 0 ? r.count / total : 0),
    ratio: r.count / max,
  }));
}

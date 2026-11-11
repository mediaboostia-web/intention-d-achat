import { describe, expect, it } from 'vitest';
import {
  breakdown,
  cacText,
  dateLabel,
  channelLabel,
  churnText,
  countryLabel,
  growthText,
  memberRoleLabel,
  orderStatusLabel,
  passLine,
  monthLabel,
  ofMonth,
  percentText,
  planLabel,
  PLAN_ORDER,
  providerLabel,
  typeLabel,
  withShares,
} from './admin-view';

describe('support-admin words', () => {
  it('writes a month in French', () => {
    expect(monthLabel('2026-11')).toBe('novembre 2026');
    expect(monthLabel('2027-02')).toBe('février 2027');
  });

  it('writes a date short, in UTC', () => {
    expect(dateLabel('2026-11-03T23:30:00.000Z')).toBe('3 nov. 2026');
  });

  it('writes a rate as a French percentage, one decimal at most', () => {
    const nbsp = String.fromCharCode(0xa0);
    expect(percentText(0.125)).toBe(`12,5${nbsp}%`);
    expect(percentText(0.5)).toBe(`50${nbsp}%`);
    expect(percentText(0)).toBe(`0${nbsp}%`);
    expect(percentText(1 / 3)).toBe(`33,3${nbsp}%`);
  });

  it('names plans, payment means, kinds of business and sales channels', () => {
    expect(planLabel('FREE')).toBe('Sans pass');
    expect(planLabel('WEEK')).toBe('Pass Semaine');
    expect(planLabel('MYSTERY')).toBe('MYSTERY');
    expect(providerLabel('saspay')).toBe('SasPay');
    expect(providerLabel('manual')).toBe('Manuel');
    expect(typeLabel('WHOLESALER')).toBe('Grossiste');
    expect(typeLabel('NONE')).toBe('Non renseigné');
    expect(channelLabel('STORE')).toBe('Boutique physique');
    expect(channelLabel('NONE')).toBe('Non renseigné');
  });
});

describe('breakdown', () => {
  it('follows the given order, drops the empty rows, keeps an unknown key last', () => {
    expect(breakdown({ FREE: 3, WEEK: 0, TRIAL: 2, ODD: 1 }, PLAN_ORDER, planLabel)).toEqual([
      { key: 'TRIAL', label: 'Essai gratuit', count: 2 },
      { key: 'FREE', label: 'Sans pass', count: 3 },
      { key: 'ODD', label: 'ODD', count: 1 },
    ]);
  });
});

describe('churnText', () => {
  it('shows the rate with its calculation', () => {
    expect(churnText({ atStart: 8, churned: 1, rate: 0.125 }, '2026-11')).toEqual({
      value: `12,5${String.fromCharCode(0xa0)}%`,
      calc: '1 boutique partie sur 8 qui avaient un pass le 1er novembre 2026',
    });
  });

  it('says why there is no rate', () => {
    expect(churnText({ atStart: 0, churned: 0, rate: null }, '2026-11')).toEqual({
      value: '—',
      calc: "Aucune boutique n'avait de pass le 1er novembre 2026",
    });
  });
});

describe('cacText', () => {
  it('divides the spend by the new paying shops in plain words', () => {
    expect(cacText({ spend: 50_000, payers: 4, value: 12_500 })).toEqual({
      value: '12 500 FCFA',
      calc: '50 000 FCFA de marketing ÷ 4 nouvelles boutiques payantes',
    });
  });

  it('asks for the spend when it was not typed', () => {
    expect(cacText({ spend: null, payers: 2, value: null })).toEqual({
      value: '—',
      calc: 'Dépense marketing du mois non saisie',
    });
  });

  it('says when no new shop paid', () => {
    expect(cacText({ spend: 50_000, payers: 0, value: null })).toEqual({
      value: '—',
      calc: '50 000 FCFA de marketing, aucune nouvelle boutique payante',
    });
  });
});

describe('shop card words', () => {
  it('names a country, a member role, a payment status and the pass in force', () => {
    expect(countryLabel('BJ')).toBe('Bénin');
    expect(countryLabel('XX')).toBe('XX');
    expect(memberRoleLabel('OWNER')).toBe('Propriétaire');
    expect(orderStatusLabel('PAID')).toBe('Payé');
    expect(orderStatusLabel('PENDING')).toBe('En attente');
    expect(passLine('WEEK', true)).toBe('Pass Semaine (grâce)');
    expect(passLine('FREE', false)).toBe('Sans pass');
  });
});

const SPACES = new RegExp(`[${String.fromCharCode(0xa0, 0x202f)}]`, 'g');
const plain = (v: string) => v.replace(SPACES, ' ');

describe('growthText', () => {
  const months = (before: number, now: number) => [
    { month: '2026-10', total: before },
    { month: '2026-11', total: now },
  ];

  it('compares the month with the one before, up or down', () => {
    expect(growthText(months(9200, 13_800))).toMatchObject({ tone: 'up' });
    expect(plain(growthText(months(9200, 13_800))!.text)).toBe('+50 % vs octobre');
    expect(plain(growthText(months(10_000, 7500))!.text)).toBe('−25 % vs octobre');
    expect(growthText(months(10_000, 7500))!.tone).toBe('down');
    expect(growthText(months(5000, 5000))!.tone).toBe('flat');
  });

  it('says nothing when the month before had no money (no division by zero)', () => {
    expect(growthText(months(0, 13_800))).toBeNull();
    expect(growthText([{ month: '2026-11', total: 100 }])).toBeNull();
  });
});

describe('withShares', () => {
  it('gives each row its share of the total, as a French percentage', () => {
    const rows = withShares([
      { key: 'BJ', label: 'Bénin', count: 4 },
      { key: 'SN', label: 'Sénégal', count: 2 },
    ]);
    expect(rows.map((r) => plain(r.share))).toEqual(['66,7 %', '33,3 %']);
    expect(rows.map((r) => r.ratio)).toEqual([1, 0.5]); // the bar, to scale on the largest
  });

  it('keeps an empty list empty', () => {
    expect(withShares([])).toEqual([]);
  });
});

describe('ofMonth', () => {
  it('elides « de » before a vowel: d’avril, d’août, d’octobre', () => {
    expect(ofMonth('2026-10')).toBe('d’octobre 2026');
    expect(ofMonth('2026-08')).toBe('d’août 2026');
    expect(ofMonth('2027-04')).toBe('d’avril 2027');
    expect(ofMonth('2026-11')).toBe('de novembre 2026');
  });
});

// Lot 7b: a shop's amounts are in its own currency (FCFA, FG, FC). No screen
// or message writes « FCFA » itself: it goes through formatMoney /
// currencyLabel (lib/tamani/currency.ts). Tamani's own prices (home page,
// plans, payments) stay in FCFA until lot 8.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../..');
const ALLOWED = [
  'lib/utils.ts',
  'lib/tamani/currency.ts',
  'lib/tamani/landing.ts',
  'lib/tamani/plans.ts',
  'components/landing/',
  'lib/server/payments/',
  'app/(public)/styleguide/',
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === 'test-utils' ? [] : files(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

// The word itself, in a string, a template or JSX text; comments may name it.
// A label given to formatPrice skips the shop's currency just the same.
const WORD = /\bFCFA\b/;
const LABELLED_PRICE = /\bformatPrice\((?:[^(),]|\([^()]*\))*,/;
const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);
/** True when a source line writes FCFA itself, or gives formatPrice its own label. */
const offends = (line: string) =>
  !isComment(line) && (WORD.test(line) || LABELLED_PRICE.test(line));

describe('no hardcoded FCFA', () => {
  it('every amount of a shop goes through its currency', () => {
    const offenders = files(SRC)
      .map((f) => path.relative(SRC, f).replace(/\\/g, '/'))
      .filter((rel) => !ALLOWED.some((a) => rel.startsWith(a)))
      .filter((rel) => readFileSync(path.join(SRC, rel), 'utf8').split('\n').some(offends));
    expect(offenders).toEqual([]);
  });

  it('catches the shapes a screen writes the word in, and a label given to formatPrice', () => {
    for (const line of [
      '<p className="a">{formatPrice(total)} FCFA</p>',
      '  {formatPrice(total)} FCFA',
      '  FCFA',
      '  `${n} FCFA`',
      "{formatPrice(x, 'F')}",
      'formatPrice(unitPrice * qty, label)',
    ]) {
      expect(offends(line), line).toBe(true);
    }
    for (const line of [
      '// FCFA of West Africa.',
      ' * in whole FCFA.',
      'const MAX_FCFA = 100_000_000;',
      "import { parseAmount } from '@/lib/tamani/fcfa-input';",
      '{formatPrice(avoidedDeadStock)}',
      'formatPrice(Math.round(total))',
    ]) {
      expect(offends(line), line).toBe(false);
    }
  });
});

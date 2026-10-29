// Lot 7b: a shop's amounts are in its own currency (FCFA, FG, FC). No screen
// or message writes « FCFA » itself: it goes through formatMoney /
// currencyLabel (lib/tamani/currency.ts). Tamani's own prices (home page,
// plans, payments) stay in FCFA until lot 8.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../..');
const ALLOWED = [
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

// A quoted string or a JSX text that writes the word; comments may name it.
const LITERAL = /['"`][^'"`\n]*FCFA[^'"`\n]*['"`]|>\s*FCFA\s*</;
const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

describe('no hardcoded FCFA', () => {
  it('every amount of a shop goes through its currency', () => {
    const offenders = files(SRC)
      .map((f) => path.relative(SRC, f).replace(/\\/g, '/'))
      .filter((rel) => !ALLOWED.some((a) => rel.startsWith(a)))
      .filter((rel) =>
        readFileSync(path.join(SRC, rel), 'utf8')
          .split('\n')
          .some((line) => !isComment(line) && LITERAL.test(line)),
      );
    expect(offenders).toEqual([]);
  });
});

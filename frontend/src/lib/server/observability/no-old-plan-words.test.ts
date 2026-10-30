// Lot 8: the shop space speaks of passes. « Pro », « Gratuit » and the old
// /app/plus#forfait anchor must not come back (the landing has its own copy).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../..');
const DIRS = ['components/app', 'components/ui', 'lib/tamani', 'app/(app)'];

describe('the shop space speaks of passes', () => {
  it('no « Pro » or « Gratuit » left in the shop space', () => {
    const offenders: string[] = [];
    for (const dir of DIRS) {
      for (const rel of readdirSync(path.join(SRC, dir), { recursive: true })) {
        const file = String(rel).split(path.sep).join('/');
        if (!/\.(ts|tsx)$/.test(file) || /\.test\.tsx?$/.test(file) || file.startsWith('landing')) {
          continue;
        }
        const lines = readFileSync(path.join(SRC, dir, file), 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (/\bPro\b|Gratuit|\/app\/plus#forfait/.test(line))
            offenders.push(`${dir}/${file}:${i + 1}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});

// api() (lib/api.ts) encodes the body itself. A screen that hands it a string
// sends it twice encoded, and the route answers 400 VALIDATION_FAILED: the
// pass checkout broke this way on the first deployment (2026-11-04).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../..');

describe('api() bodies', () => {
  it('no file that calls api() hands it a JSON string', () => {
    const offenders: string[] = [];
    for (const rel of readdirSync(SRC, { recursive: true })) {
      const file = String(rel).split(path.sep).join('/');
      if (!/\.(ts|tsx)$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      const source = readFileSync(path.join(SRC, file), 'utf8');
      if (!source.includes("from '@/lib/api'")) continue;
      source.split('\n').forEach((line, i) => {
        if (/body:\s*JSON\.stringify/.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

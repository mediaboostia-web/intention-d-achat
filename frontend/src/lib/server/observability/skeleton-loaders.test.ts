// Porteur, 2026-11-04: « Ajouter des Skeleton Loader complete ». A screen of
// the shop space that waits for its data shows the kit's skeletons
// (components/ui/Skeleton.tsx): no « Chargement… » sentence on screen, and no
// grey blocks of its own that would drift from the kit.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../..');
const DIRS = ['components/app', 'app/(app)'];

function offenders(test: (line: string) => boolean): string[] {
  const found: string[] = [];
  for (const dir of DIRS) {
    for (const rel of readdirSync(path.join(SRC, dir), { recursive: true })) {
      const file = String(rel).split(path.sep).join('/');
      if (!/\.tsx$/.test(file) || /\.test\.tsx$/.test(file)) continue;
      readFileSync(path.join(SRC, dir, file), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (test(line)) found.push(`${dir}/${file}:${i + 1}`);
        });
    }
  }
  return found;
}

describe('loading screens use the kit skeletons', () => {
  it('no loading sentence is written on screen', () => {
    // A JSX text line, or a string child, that says something is loading.
    const sentence = /(?:^\s*|>\s*|'|")(?:Chargement|Aperçu en cours|Vérification des)[^'"]*…/;
    expect(offenders((line) => sentence.test(line) && !/label=/.test(line))).toEqual([]);
  });

  it('no screen draws its own pulsing blocks', () => {
    expect(offenders((line) => line.includes('animate-pulse'))).toEqual([]);
  });
});

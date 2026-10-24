import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { colors } from './tokens';

const css = readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8');
// The first `@theme {` block (not `@theme inline`) closes on a `}` at column 0.
const theme = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const declared = Object.fromEntries(
  [...theme.matchAll(/--color-([a-z-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => [
    m[1],
    m[2]!.toUpperCase(),
  ]),
);
const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('globals.css @theme mirrors tokens.ts', () => {
  it('declares every token with the same value', () => {
    for (const [key, hex] of Object.entries(colors)) {
      expect(declared[kebab(key)], key).toBe(hex.toUpperCase());
    }
  });

  it('declares no color that tokens.ts does not know', () => {
    expect(Object.keys(declared).sort()).toEqual(Object.keys(colors).map(kebab).sort());
  });
});

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { colors } from './tokens';

const FRONTEND = path.resolve(__dirname, '../../..');
const at = (rel: string) => path.join(FRONTEND, rel);

const SVGS = {
  'tamani-mark.svg': 'public/brand/tamani-mark.svg',
  'tamani-logo.svg': 'public/brand/tamani-logo.svg',
  'icon.svg': 'src/app/icon.svg',
} as const;

// Width and height live in the IHDR chunk, right after the 8-byte signature
// and the chunk's length + type (bytes 16-23, big-endian).
function pngSize(rel: string) {
  const buf = readFileSync(at(rel));
  expect(buf.toString('ascii', 12, 16)).toBe('IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('brand assets (Tamani lot 2)', () => {
  it('ships every brand file', () => {
    const files = [
      ...Object.values(SVGS),
      'public/brand/og-default.png',
      'src/app/apple-icon.png',
      'src/lib/design/logo-paths.ts',
    ];
    for (const rel of files) expect(existsSync(at(rel)), rel).toBe(true);
  });

  it.each(Object.entries(SVGS))('%s is self-contained', (_name, rel) => {
    const svg = readFileSync(at(rel), 'utf8');
    expect(svg).toMatch(/viewBox="/);
    expect(svg).not.toMatch(/<text/);
    expect(svg).not.toMatch(/href="http/);
    expect(svg).not.toMatch(/filter/);
  });

  it('PNG sizes are exact', () => {
    expect(pngSize('src/app/apple-icon.png')).toEqual({ width: 180, height: 180 });
    expect(pngSize('public/brand/og-default.png')).toEqual({ width: 1200, height: 630 });
  });

  it('SVGs only use palette colors', () => {
    const palette = new Set(Object.values(colors).map((c) => c.toUpperCase()));
    for (const rel of Object.values(SVGS)) {
      const used = readFileSync(at(rel), 'utf8').match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
      expect(used.length, `${rel} declares colors`).toBeGreaterThan(0);
      for (const hex of used)
        expect(palette.has(hex.toUpperCase()), `${rel} uses ${hex}`).toBe(true);
    }
  });
});

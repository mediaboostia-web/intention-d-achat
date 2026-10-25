import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// Lot 4 turned Tailwind's default palette off (`--color-*: initial;` in
// globals.css): every colour comes from the lot 2 tokens. A default class
// would now render nothing, silently; this catches it at review time.
const SRC = path.resolve(__dirname, '../../..');
const DEFAULT_PALETTE = new RegExp(
  [
    String.raw`\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|placeholder|decoration|shadow|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b`,
    String.raw`\b(?:bg|text|border)-(?:white|black)\b`,
  ].join('|'),
);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === 'test-utils' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

const files = sourceFiles(SRC);

describe('no class from the default Tailwind palette (Tamani lot 4)', () => {
  it('detects the classes it forbids', () => {
    expect(DEFAULT_PALETTE.test('text-gray-600')).toBe(true);
    expect(DEFAULT_PALETTE.test('hover:bg-red-50')).toBe(true);
    expect(DEFAULT_PALETTE.test('bg-white')).toBe(true);
    expect(DEFAULT_PALETTE.test('bg-black/40')).toBe(true);
    expect(DEFAULT_PALETTE.test('border-neutral-verdict')).toBe(false);
    expect(DEFAULT_PALETTE.test('text-ink-soft bg-surface')).toBe(false);
    expect(DEFAULT_PALETTE.test('bg-whatsapp text-whatsapp-ink')).toBe(false);
  });

  it('walks the app, the components and the contexts', () => {
    const rel = files.map((f) => path.relative(SRC, f).replaceAll(path.sep, '/'));
    expect(rel).toContain('contexts/ToastContext.tsx');
    expect(rel).toContain('components/ui/Button.tsx');
    expect(rel).toContain('app/error.tsx');
  });

  it.each(files.map((f) => [path.relative(SRC, f), f]))('%s', (_rel, file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(DEFAULT_PALETTE);
  });
});

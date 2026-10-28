import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// The popup (/c/[code]) must stay under 60 KB of client JS and load fast on
// slow networks (spec §6.6): its sheet and choice buttons animate with CSS
// only, never with an animation library.
const SRC = path.resolve(__dirname, '../../..');
const MOTION_IMPORT =
  /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](?:motion|framer-motion|gsap)(?:\/[^'"]*)?['"]/;

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const popupFiles = [
  path.join(SRC, 'components/ui/BottomSheet.tsx'),
  path.join(SRC, 'components/ui/ChoiceButton.tsx'),
  ...filesUnder(path.join(SRC, 'app/(public)/c')).filter((f) => /\.(tsx?|jsx?)$/.test(f)),
];

describe('popup ships no animation library (Tamani lot 2)', () => {
  it('detects the imports it forbids', () => {
    expect(MOTION_IMPORT.test("import { motion } from 'framer-motion';")).toBe(true);
    expect(MOTION_IMPORT.test("import { animate } from 'motion/react';")).toBe(true);
    expect(MOTION_IMPORT.test("const gsap = await import('gsap');")).toBe(true);
    expect(MOTION_IMPORT.test("import { cn } from '@/lib/utils';")).toBe(false);
  });

  it('the popup building blocks exist', () => {
    for (const f of popupFiles.slice(0, 2)) expect(existsSync(f), f).toBe(true);
  });

  it.each(popupFiles.map((f) => [path.relative(SRC, f), f]))('%s', (_rel, file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(MOTION_IMPORT);
  });
});

// The popup ships no phone metadata (lot 6b): its country list is written out.
const PHONE_LIB_IMPORT =
  /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]libphonenumber-js(?:\/[^'"]*)?['"]/;
const phoneFiles = [
  ...popupFiles,
  path.join(SRC, 'components/ui/PhoneInput.tsx'),
  path.join(SRC, 'lib/tamani/phone-countries.ts'),
];

describe('popup ships no phone library (Tamani lot 6b)', () => {
  it('detects the import it forbids', () => {
    expect(PHONE_LIB_IMPORT.test("import { getCountries } from 'libphonenumber-js/min';")).toBe(
      true,
    );
    expect(PHONE_LIB_IMPORT.test("import { SHOP_COUNTRIES } from './countries';")).toBe(false);
  });

  it.each(phoneFiles.map((f) => [path.relative(SRC, f), f]))('%s', (_rel, file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(PHONE_LIB_IMPORT);
  });
});

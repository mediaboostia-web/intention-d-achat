import { describe, it, expect } from 'vitest';
import { colors, contrastPairs, contrastRatio, nightColors, verdictToneColor } from './tokens';

describe('contrastRatio (WCAG 2.1)', () => {
  it('black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('a color on itself is 1:1', () => {
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#1A4FBF', '#FDFDF8')).toBe(contrastRatio('#FDFDF8', '#1A4FBF'));
  });

  it('rejects a malformed hex color', () => {
    expect(() => contrastRatio('blue', '#FFFFFF')).toThrow();
  });
});

describe('Tamani text/background pairs', () => {
  it.each(contrastPairs)('$fg on $bg ($use) reaches 4.5:1', ({ fg, bg }) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('covers the five verdict tones on paper and on cards', () => {
    for (const tone of Object.values(verdictToneColor)) {
      for (const bg of ['bg', 'surface'] as const) {
        expect(
          contrastPairs.some((p) => p.fg === tone && p.bg === bg),
          `${tone} on ${bg}`,
        ).toBe(true);
      }
    }
  });
});

describe('Tamani night palette (carnet de nuit)', () => {
  it('has exactly the keys of the day palette', () => {
    expect(Object.keys(nightColors).sort()).toEqual(Object.keys(colors).sort());
  });

  it.each(contrastPairs)('$fg on $bg ($use) reaches 4.5:1 at night', ({ fg, bg }) => {
    expect(contrastRatio(nightColors[fg], nightColors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the notebook cover dark and its ink and yellow readable', () => {
    for (const palette of [colors, nightColors]) {
      expect(contrastRatio(palette.deepInk, palette.deep)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.accent, palette.deep)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

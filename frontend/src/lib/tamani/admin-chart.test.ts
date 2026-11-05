import { describe, expect, it } from 'vitest';
import { axisTicks, chartGeometry, compactAmount } from './admin-chart';

// French spaces: compare with plain ones.
const SPACES = new RegExp(`[${String.fromCharCode(0xa0, 0x202f)}]`, 'g');
const plain = (s: string) => s.replace(SPACES, ' ');

describe('axisTicks', () => {
  it('rounds the top up to a clean step', () => {
    expect(axisTicks(13_800)).toEqual([0, 5000, 10_000, 15_000]);
    expect(axisTicks(3900)).toEqual([0, 1000, 2000, 3000, 4000]);
    expect(axisTicks(250_000)).toEqual([0, 100_000, 200_000, 300_000]);
  });

  it('keeps an axis for a flat zero series', () => {
    expect(axisTicks(0)).toEqual([0, 1000]);
  });
});

describe('compactAmount', () => {
  it('writes the axis in full under 10 000, compact above', () => {
    expect(plain(compactAmount(0))).toBe('0');
    expect(plain(compactAmount(5000))).toBe('5 000');
    expect(plain(compactAmount(15_000))).toBe('15 k');
    expect(plain(compactAmount(1_500_000))).toBe('1,5 M');
  });
});

describe('chartGeometry', () => {
  const series = [
    { month: '2026-09', total: 0 },
    { month: '2026-10', total: 10_000 },
    { month: '2026-11', total: 20_000 },
  ];
  const g = chartGeometry(series, {
    width: 600,
    height: 200,
    left: 50,
    right: 10,
    top: 10,
    bottom: 30,
  });

  it('spaces the months evenly between the margins', () => {
    expect(g.points.map((p) => p.x)).toEqual([50, 320, 590]);
  });

  it('puts 0 on the baseline and the top tick at the top', () => {
    expect(g.baseline).toBe(170);
    expect(g.points[0]!.y).toBe(170);
    expect(g.points[2]!.y).toBe(10); // 20 000 is the top tick
    expect(g.ticks.map((t) => t.value)).toEqual([0, 5000, 10_000, 15_000, 20_000]);
  });

  it('draws the line through every point and closes the area on the baseline', () => {
    expect(g.line.startsWith('M50 170')).toBe(true);
    expect(g.line).toContain('590 10');
    expect(g.area.startsWith(g.line)).toBe(true);
    expect(g.area.endsWith('L590 170 L50 170 Z')).toBe(true);
  });

  it('never bends the curve below the baseline or above the top (monotone)', () => {
    const numbers = (g.line.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const ys = numbers.filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(170);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(10);
  });
});

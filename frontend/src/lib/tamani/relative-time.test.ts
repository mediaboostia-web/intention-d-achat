import { describe, expect, it } from 'vitest';
import { formatDateFr } from './dates';
import { relativeTime } from './relative-time';

const now = new Date('2026-10-25T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;

describe('relativeTime', () => {
  it('reads like a person would say it', () => {
    expect(relativeTime(ago(20_000), now)).toBe("à l'instant");
    expect(relativeTime(ago(5 * MIN), now)).toBe('il y a 5 min');
    expect(relativeTime(ago(2 * 60 * MIN), now)).toBe('il y a 2 h');
    expect(relativeTime(ago(30 * 60 * MIN), now)).toBe('hier');
    const old = ago(5 * 24 * 60 * MIN);
    expect(relativeTime(old, now)).toBe(formatDateFr(old, now));
  });

  it('treats a clock slightly ahead as now', () => {
    expect(relativeTime(new Date(now.getTime() + 5000), now)).toBe("à l'instant");
  });
});

import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import {
  monthWindowUtc,
  responsesThisMonth,
  shouldLockNewCompletion,
  unlockCurrentMonth,
} from './quota';

const now = new Date('2026-10-24T15:00:00Z');
const window = {
  gte: new Date('2026-10-01T00:00:00.000Z'),
  lt: new Date('2026-11-01T00:00:00.000Z'),
};
const activePro = {
  plan: 'MONTH',
  currentPeriodEnd: new Date('2026-11-24T00:00:00Z'),
  graceUntil: new Date('2026-11-29T00:00:00Z'),
};

describe('monthWindowUtc', () => {
  it('spans the calendar month in UTC', () => {
    expect(monthWindowUtc(now)).toEqual({ start: window.gte, end: window.lt });
    expect(monthWindowUtc(new Date('2026-12-31T23:59:59Z')).end).toEqual(
      new Date('2027-01-01T00:00:00.000Z'),
    );
  });
});

describe('shouldLockNewCompletion', () => {
  it('without a pass, every new completion waits', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.response.count.mockResolvedValueOnce(0);
    expect(await shouldLockNewCompletion(prismaMock, 'org_1', now)).toBe(true);
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', locked: false, completedAt: window },
    });
  });

  it('uses the limit of the plan in force', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(activePro as never);
    prismaMock.response.count.mockResolvedValue(150);
    expect(await shouldLockNewCompletion(prismaMock, 'org_1', now)).toBe(false);
  });
});

describe('unlockCurrentMonth', () => {
  it('unlockCurrentMonth unlocks oldest first up to new limit', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(activePro as never);
    prismaMock.response.count.mockResolvedValue(150);
    const locked = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}` }));
    prismaMock.response.findMany.mockResolvedValue(locked as never);
    prismaMock.response.updateMany.mockResolvedValue({ count: 10 });

    expect(await unlockCurrentMonth(prismaMock, 'org_1', now)).toBe(10);
    expect(prismaMock.response.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', locked: true, completedAt: window },
      orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
      take: 850,
      select: { id: true },
    });
    expect(prismaMock.response.updateMany).toHaveBeenCalledWith({
      where: { id: { in: locked.map((r) => r.id) } },
      data: { locked: false },
    });
  });

  it('unlocks nothing while the plan has no room', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.response.count.mockResolvedValue(150);
    expect(await unlockCurrentMonth(prismaMock, 'org_1', now)).toBe(0);
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
    expect(prismaMock.response.updateMany).not.toHaveBeenCalled();
  });
});

describe('responsesThisMonth', () => {
  it("responsesThisMonth counts this month's unlocked completions against the plan", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.response.count.mockResolvedValue(42);
    expect(await responsesThisMonth(prismaMock, 'org_1', now)).toEqual({ used: 42, limit: 0 });
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', locked: false, completedAt: window },
    });
  });
});

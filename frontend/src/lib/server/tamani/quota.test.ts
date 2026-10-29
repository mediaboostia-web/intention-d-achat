import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, it, expect } from 'vitest';
import {
  RECORDED_CEILING,
  answersClosed,
  monthWindowUtc,
  passUsage,
  shouldLockNewCompletion,
  unlockPending,
} from './quota';

const now = new Date('2026-10-24T15:00:00Z');
const month = {
  gte: new Date('2026-10-01T00:00:00.000Z'),
  lt: new Date('2026-11-01T00:00:00.000Z'),
};
const week = {
  plan: 'WEEK',
  periodStart: new Date('2026-10-22T00:00:00Z'),
  currentPeriodEnd: new Date('2026-10-29T00:00:00Z'),
  graceUntil: new Date('2026-11-01T00:00:00Z'),
  responsesIncluded: 150,
};
const passWindow = { gte: week.periodStart, lt: week.graceUntil };

describe('monthWindowUtc', () => {
  it('spans the calendar month in UTC', () => {
    expect(monthWindowUtc(now)).toEqual({ start: month.gte, end: month.lt });
    expect(monthWindowUtc(new Date('2026-12-31T23:59:59Z')).end).toEqual(
      new Date('2027-01-01T00:00:00.000Z'),
    );
  });
});

describe('shouldLockNewCompletion', () => {
  it('no pass locks every new completion', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    expect(await shouldLockNewCompletion(prismaMock, 'org_1', now)).toBe(true);
    const ended = {
      ...week,
      currentPeriodEnd: new Date('2026-10-18T00:00:00Z'),
      graceUntil: new Date('2026-10-21T00:00:00Z'),
    };
    prismaMock.subscription.findUnique.mockResolvedValue(ended as never);
    expect(await shouldLockNewCompletion(prismaMock, 'org_1', now)).toBe(true);
  });

  it('a pass counts answers from its start, carried-over answers included', async () => {
    // 150 of the week plus 60 carried over from the pass before.
    prismaMock.subscription.findUnique.mockResolvedValue({
      ...week,
      responsesIncluded: 210,
    } as never);
    prismaMock.response.count.mockResolvedValue(180);
    expect(await shouldLockNewCompletion(prismaMock, 'org_1', now)).toBe(false);
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', countedAt: passWindow },
    });
    prismaMock.response.count.mockResolvedValue(210);
    expect(await shouldLockNewCompletion(prismaMock, 'org_1', now)).toBe(true);
  });

  it('the quota lock is taken before counting', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(week as never);
    prismaMock.response.count.mockResolvedValue(0);
    await shouldLockNewCompletion(prismaMock, 'org_1', now);
    const lock = prismaMock.$executeRaw.mock.invocationCallOrder[0] ?? Infinity;
    const read = prismaMock.subscription.findUnique.mock.invocationCallOrder[0] ?? -Infinity;
    expect(lock).toBeLessThan(read);
    expect(prismaMock.$executeRaw.mock.calls[0]?.slice(1)).toEqual(['quota:org_1']);
  });
});

describe('passUsage', () => {
  it('reads the pass in force, its counted answers and the pending ones', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(week as never);
    prismaMock.response.count.mockResolvedValueOnce(42).mockResolvedValueOnce(7);
    expect(await passUsage(prismaMock, 'org_1', now)).toEqual({
      plan: 'WEEK',
      used: 42,
      included: 150,
      endsAt: week.currentPeriodEnd,
      inGrace: false,
      pending: 7,
    });
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', locked: true, completedAt: { not: null } },
    });
  });

  it('without a pass nothing is counted, every answer waits', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.response.count.mockResolvedValue(87);
    expect(await passUsage(prismaMock, 'org_1', now)).toEqual({
      plan: 'FREE',
      used: 0,
      included: 0,
      endsAt: null,
      inGrace: false,
      pending: 87,
    });
  });
});

describe('unlockPending', () => {
  it('unlockPending opens the oldest up to the room left', async () => {
    const bought = { ...week, periodStart: now, responsesIncluded: 150 };
    prismaMock.subscription.findUnique.mockResolvedValue(bought as never);
    prismaMock.response.count.mockResolvedValue(0);
    const pending = Array.from({ length: 87 }, (_, i) => ({ id: `r${i}` }));
    prismaMock.response.findMany.mockResolvedValue(pending as never);
    prismaMock.response.updateMany.mockResolvedValue({ count: 87 });

    expect(await unlockPending(prismaMock, 'org_1', now)).toBe(87);
    expect(prismaMock.response.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', locked: true, completedAt: { not: null } },
      orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
      take: 150,
      select: { id: true },
    });
    expect(prismaMock.response.updateMany).toHaveBeenCalledWith({
      where: { id: { in: pending.map((r) => r.id) }, locked: true },
      data: { locked: false, countedAt: now },
    });

    // 87 counted now: a second call opens at most the 63 left.
    prismaMock.response.count.mockResolvedValue(87);
    prismaMock.response.findMany.mockResolvedValue([]);
    expect(await unlockPending(prismaMock, 'org_1', now)).toBe(0);
    expect(prismaMock.response.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 63 }),
    );
  });

  it('opens nothing without a pass or once the pass is full', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    expect(await unlockPending(prismaMock, 'org_1', now)).toBe(0);
    prismaMock.subscription.findUnique.mockResolvedValue(week as never);
    prismaMock.response.count.mockResolvedValue(150);
    expect(await unlockPending(prismaMock, 'org_1', now)).toBe(0);
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
    expect(prismaMock.response.updateMany).not.toHaveBeenCalled();
  });
});

describe('answersClosed', () => {
  it('answersClosed at 1 000 recorded this month, never on a paid pass', async () => {
    expect(RECORDED_CEILING).toBe(1000);
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.response.count.mockResolvedValue(999);
    expect(await answersClosed(prismaMock, 'org_1', now)).toBe(false);
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', completedAt: month },
    });
    prismaMock.response.count.mockResolvedValue(1000);
    expect(await answersClosed(prismaMock, 'org_1', now)).toBe(true);

    const trial = { ...week, plan: 'TRIAL', graceUntil: null, responsesIncluded: 50 };
    prismaMock.subscription.findUnique.mockResolvedValue(trial as never);
    expect(await answersClosed(prismaMock, 'org_1', now)).toBe(true);

    prismaMock.subscription.findUnique.mockResolvedValue(week as never);
    prismaMock.response.count.mockClear();
    expect(await answersClosed(prismaMock, 'org_1', now)).toBe(false);
    expect(prismaMock.response.count).not.toHaveBeenCalled();
  });

  it('uses the subscription the caller already read', async () => {
    prismaMock.response.count.mockResolvedValue(1200);
    expect(await answersClosed(prismaMock, 'org_1', now, null)).toBe(true);
    expect(prismaMock.subscription.findUnique).not.toHaveBeenCalled();
  });
});

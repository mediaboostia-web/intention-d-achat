import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../quota', () => ({ passCount: vi.fn(), unlockPending: vi.fn() }));

import { passCount, unlockPending } from '../quota';
import { endPass, grantPass, grantTerms } from './grant';

const NOW = new Date('2026-11-04T10:00:00Z');
const at = (iso: string) => new Date(`${iso}T10:00:00Z`);

beforeEach(() => {
  vi.mocked(passCount)
    .mockReset()
    .mockResolvedValue({
      plan: 'TRIAL',
      used: 10,
      included: 50,
      endsAt: at('2026-11-06'),
      inGrace: false,
      pending: 0,
    } as never);
  vi.mocked(unlockPending).mockReset().mockResolvedValue(0);
  prismaMock.organization.findUnique.mockResolvedValue({ id: 'org_1' } as never);
  prismaMock.order.create.mockResolvedValue({ id: 'ord_1' } as never);
  prismaMock.subscription.findUnique.mockResolvedValue({
    organizationId: 'org_1',
    plan: 'TRIAL',
    periodStart: at('2026-11-03'),
    currentPeriodEnd: at('2026-11-06'),
    graceUntil: null,
    responsesIncluded: 50,
  } as never);
});

describe('grantTerms', () => {
  it('takes a standard pass as sold', () => {
    expect(grantTerms({ plan: 'MONTH' })).toEqual({ plan: 'MONTH', days: 30, responses: 1000 });
  });

  it('needs the days and the answers of an Unlimited pass', () => {
    expect(grantTerms({ plan: 'UNLIMITED', days: 30 })).toBeNull();
    expect(grantTerms({ plan: 'UNLIMITED', days: 30, responses: 50_000 })).toEqual({
      plan: 'UNLIMITED',
      days: 30,
      responses: 50_000,
    });
  });
});

describe('grantPass', () => {
  it('records a manual order and opens the pass like a purchase, unused trial answers kept', async () => {
    const result = await grantPass(
      prismaMock,
      {
        organizationId: 'org_1',
        terms: { plan: 'MONTH', days: 30, responses: 1000 },
        amount: 9900,
      },
      NOW,
    );
    expect(result).toEqual({ orderId: 'ord_1', endsAt: at('2026-12-04') });
    expect(prismaMock.order.create).toHaveBeenCalledWith({
      data: {
        provider: 'manual',
        organizationId: 'org_1',
        offer: 'MONTH',
        amount: 9900,
        currency: 'XOF',
        status: 'PAID',
        paidAt: NOW,
        activatedAt: NOW,
        expiresAt: NOW,
        metadata: { days: 30, responses: 1000 },
      },
      select: { id: true },
    });
    const upsert = prismaMock.subscription.upsert.mock.calls[0]![0];
    expect(upsert.update).toEqual({
      plan: 'MONTH',
      periodStart: NOW,
      currentPeriodEnd: at('2026-12-04'),
      graceUntil: at('2026-12-07'),
      responsesIncluded: 1000 + 40,
    });
    expect(unlockPending).toHaveBeenCalledWith(prismaMock, 'org_1', NOW);
    // Both locks, billing then quota, as a SasPay activation takes them.
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('writes nothing for a shop that does not exist', async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null);
    const result = await grantPass(
      prismaMock,
      { organizationId: 'nope', terms: { plan: 'WEEK', days: 7, responses: 150 }, amount: 0 },
      NOW,
    );
    expect(result).toBeNull();
    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });
});

describe('endPass', () => {
  it('sends the shop back to « Sans pass » and says what it had', async () => {
    expect(await endPass(prismaMock, 'org_1')).toEqual({ from: 'TRIAL' });
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      create: {
        organizationId: 'org_1',
        plan: 'FREE',
        periodStart: null,
        currentPeriodEnd: null,
        graceUntil: null,
        responsesIncluded: 0,
      },
      update: {
        plan: 'FREE',
        periodStart: null,
        currentPeriodEnd: null,
        graceUntil: null,
        responsesIncluded: 0,
      },
    });
  });

  it('answers null for an unknown shop', async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null);
    expect(await endPass(prismaMock, 'nope')).toBeNull();
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });
});

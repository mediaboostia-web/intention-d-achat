import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { runRenewals } from './renewals';

const db = prismaMock as unknown as PrismaClient;
const NOW = new Date('2026-11-09T08:00:00Z');
const DAY = 86_400_000;
const mail = { enqueue: vi.fn(async () => 'job_1') };
const duplicate = () => Object.assign(new Error('Unique'), { code: 'P2002' });

const ending = {
  organizationId: 'org_1',
  plan: 'MONTH',
  currentPeriodEnd: new Date('2026-11-12T07:00:00Z'),
  graceUntil: new Date('2026-11-15T07:00:00Z'),
};
const inGrace = {
  organizationId: 'org_2',
  plan: 'WEEK',
  currentPeriodEnd: new Date('2026-11-08T10:00:00Z'),
  graceUntil: new Date('2026-11-11T10:00:00Z'),
};
const trialOver = {
  organizationId: 'org_3',
  plan: 'TRIAL',
  currentPeriodEnd: new Date('2026-11-08T20:00:00Z'),
  graceUntil: null,
};

/** The three reads in order: passes ending, passes in grace, trials just over. */
function given(reminders: object[], graces: object[] = [], trials: object[] = []) {
  prismaMock.subscription.findMany
    .mockResolvedValueOnce(reminders as never)
    .mockResolvedValueOnce(graces as never)
    .mockResolvedValueOnce(trials as never);
}

beforeEach(() => {
  mail.enqueue.mockClear();
  vi.stubEnv('APP_URL', 'https://tamani.app');
  prismaMock.organizationMember.findMany.mockImplementation((async (args: {
    where: { organizationId: { in: string[] } };
  }) =>
    args.where.organizationId.in.map((organizationId) => ({
      organizationId,
      userId: `owner_${organizationId}`,
      user: { email: `${organizationId}@example.com` },
    }))) as never);
  prismaMock.notification.create.mockResolvedValue({ id: 'n_1' } as never);
});

describe('runRenewals', () => {
  it('reads paid passes ending within 3 days, passes in grace and trials over for 24 h', async () => {
    given([]);
    expect(await runRenewals(db, NOW, mail)).toEqual({ reminders: 0, graces: 0, trialsEnded: 0 });
    const calls = prismaMock.subscription.findMany.mock.calls.map((c) => c[0]?.where);
    const paid = ['WEEK', 'TWO_WEEKS', 'MONTH', 'MONTH_PLUS', 'MONTH_MAX', 'UNLIMITED'];
    expect(calls).toEqual([
      { plan: { in: paid }, currentPeriodEnd: { gt: NOW, lte: new Date(NOW.getTime() + 3 * DAY) } },
      { plan: { in: paid }, currentPeriodEnd: { lte: NOW }, graceUntil: { gt: NOW } },
      { plan: 'TRIAL', currentPeriodEnd: { gt: new Date(NOW.getTime() - DAY), lte: NOW } },
    ]);
  });

  it('FREE shops get nothing', async () => {
    given([]);
    await runRenewals(db, NOW, mail);
    for (const [args] of prismaMock.subscription.findMany.mock.calls) {
      expect(JSON.stringify(args?.where)).not.toContain('FREE');
    }
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it('reminds once per period', async () => {
    given([ending]);
    expect(await runRenewals(db, NOW, mail)).toEqual({ reminders: 1, graces: 0, trialsEnded: 0 });
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner_org_1',
        body: 'Ton pass finit le 12 novembre. Rachète-le pour garder tes réponses ouvertes.',
        dedupeKey: 'pass-reminder:org_1:2026-11-12T07:00:00.000Z:owner_org_1',
      }),
    });
    expect(mail.enqueue).toHaveBeenCalledTimes(1);
    expect(mail.enqueue).toHaveBeenCalledWith({
      to: 'org_1@example.com',
      subject: 'Ton pass Tamani finit le 12 novembre',
      html: expect.stringContaining('https://tamani.app/app/abonnement'),
      text: expect.stringContaining('Rachète-le pour garder tes réponses ouvertes.'),
    });

    // The next morning, the same period: the notification exists, no second email.
    given([ending]);
    prismaMock.notification.create.mockRejectedValue(duplicate());
    expect(await runRenewals(db, NOW, mail)).toEqual({ reminders: 0, graces: 0, trialsEnded: 0 });
    expect(mail.enqueue).toHaveBeenCalledTimes(1);
  });

  it('no email when the notification was deduped', async () => {
    given([ending]);
    prismaMock.notification.create.mockRejectedValue(duplicate());
    await runRenewals(db, NOW, mail);
    expect(mail.enqueue).not.toHaveBeenCalled();
  });

  it('still reminds without an email queue', async () => {
    given([ending]);
    expect((await runRenewals(db, NOW, null)).reminders).toBe(1);
  });

  it('grace and trial end are told once', async () => {
    given([], [inGrace], [trialOver]);
    expect(await runRenewals(db, NOW, mail)).toEqual({ reminders: 0, graces: 1, trialsEnded: 1 });
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner_org_2',
        body: 'Ton pass est terminé. Il te reste 3 jours pour le racheter.',
        dedupeKey: 'pass-grace:org_2:2026-11-08T10:00:00.000Z:owner_org_2',
      }),
    });
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner_org_3',
        body: "Ton essai est terminé. Tes nouvelles réponses t'attendent : prends un pass pour les voir.",
        dedupeKey: 'trial-ended:org_3:owner_org_3',
      }),
    });
    expect(mail.enqueue).not.toHaveBeenCalled();

    given([], [inGrace], [trialOver]);
    prismaMock.notification.create.mockRejectedValue(duplicate());
    expect(await runRenewals(db, NOW, mail)).toEqual({ reminders: 0, graces: 0, trialsEnded: 0 });
  });

  it('says the days of grace left', async () => {
    const lastDay = { ...inGrace, graceUntil: new Date('2026-11-09T20:00:00Z') };
    given([], [lastDay]);
    await runRenewals(db, NOW, mail);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: 'Ton pass est terminé. Il te reste 1 jour pour le racheter.',
      }),
    });
  });

  it('tells the owner and the admins only', async () => {
    given([ending]);
    await runRenewals(db, NOW, mail);
    expect(prismaMock.organizationMember.findMany).toHaveBeenCalledWith({
      where: { organizationId: { in: ['org_1'] }, role: { in: ['OWNER', 'ADMIN'] } },
      select: { organizationId: true, userId: true, user: { select: { email: true } } },
    });
  });
});

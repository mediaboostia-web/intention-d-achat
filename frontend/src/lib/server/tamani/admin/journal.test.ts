import { prismaMock } from '@/test-utils/prisma-mock';
import { describe, expect, it } from 'vitest';
import { JOURNAL_SIZE, loadJournal } from './journal';

const AT = new Date('2026-11-04T09:30:00Z');

function action(over: Record<string, unknown>) {
  return {
    id: 'a_1',
    action: 'shop.pass_grant',
    targetType: 'Organization',
    targetId: 'org_1',
    metadata: { plan: 'WEEK', amount: 3900 },
    createdAt: AT,
    actor: { email: 'boss@tamani.test' },
    ...over,
  };
}

describe('loadJournal', () => {
  it('reads the newest actions first, 100 at most', async () => {
    prismaMock.adminAction.findMany.mockResolvedValue([]);
    expect(await loadJournal(prismaMock)).toEqual([]);
    const args = prismaMock.adminAction.findMany.mock.calls[0]![0]!;
    expect(JOURNAL_SIZE).toBe(100);
    expect(args.take).toBe(100);
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    // No user or shop lookup when there is nothing to name.
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    expect(prismaMock.organization.findMany).not.toHaveBeenCalled();
  });

  it('names each target: the shop, the account, the month', async () => {
    prismaMock.adminAction.findMany.mockResolvedValue([
      action({}),
      action({
        id: 'a_2',
        action: 'user.rename',
        targetType: 'User',
        targetId: 'u_1',
        metadata: null,
      }),
      action({
        id: 'a_3',
        action: 'marketing.spend_set',
        targetType: 'MarketingSpend',
        targetId: '2026-10',
      }),
      action({ id: 'a_4', action: 'user.suspend', targetType: 'User', targetId: 'u_gone' }),
    ] as never);
    prismaMock.organization.findMany.mockResolvedValue([
      { id: 'org_1', name: 'Diallo Import' },
    ] as never);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'u_1', email: 'awa@test.local' }] as never);

    const rows = await loadJournal(prismaMock);

    expect(prismaMock.organization.findMany.mock.calls[0]![0]!.where).toEqual({
      id: { in: ['org_1'] },
    });
    expect(prismaMock.user.findMany.mock.calls[0]![0]!.where).toEqual({
      id: { in: ['u_1', 'u_gone'] },
    });
    expect(rows.map((r) => r.target?.label ?? null)).toEqual([
      'Diallo Import',
      'awa@test.local',
      'octobre 2026',
      null, // a deleted account keeps its id, with no name
    ]);
    expect(rows[0]).toEqual({
      id: 'a_1',
      action: 'shop.pass_grant',
      actorEmail: 'boss@tamani.test',
      target: { type: 'Organization', id: 'org_1', label: 'Diallo Import' },
      metadata: { plan: 'WEEK', amount: 3900 },
      createdAt: AT.toISOString(),
    });
  });

  it('keeps an action without a target', async () => {
    prismaMock.adminAction.findMany.mockResolvedValue([
      action({ targetType: null, targetId: null, metadata: null }),
    ] as never);
    const [row] = await loadJournal(prismaMock);
    expect(row?.target).toBeNull();
  });
});

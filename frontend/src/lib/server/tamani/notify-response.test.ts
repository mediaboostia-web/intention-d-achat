import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const notifications = vi.hoisted(() => ({ createNotification: vi.fn() }));
vi.mock('@/lib/server/notifications', () => notifications);
const push = vi.hoisted(() => ({ pushConfigured: vi.fn(() => true), sendPush: vi.fn() }));
vi.mock('@/lib/server/push/web-push', () => push);

const { notifyShopOfResponse, responseNotificationText } = await import('./notify-response');
const { log } = await import('@/lib/server/observability/log');

const text = {
  campaignTitle: 'Marmites inox 5 L',
  unitLabel: 'pièce',
  interested: true,
  buyerType: 'CONSUMER' as const,
  quantity: 3,
  reason: null,
  interestedTotal: 12,
  locked: false,
};

describe('responseNotificationText', () => {
  it('tells a yes with its quantity and the running total', () => {
    expect(responseNotificationText(text)).toEqual({
      title: 'Nouvelle réponse · Marmites inox 5 L',
      body: "Quelqu'un en veut 3 pièces (pour son usage). 12 intéressés au total.",
    });
    expect(
      responseNotificationText({ ...text, buyerType: 'RESELLER', quantity: 1, interestedTotal: 1 })
        .body,
    ).toBe("Quelqu'un en veut 1 pièce (pour revendre). 1 intéressé au total.");
  });

  it('tells a no with its reason', () => {
    const no = { ...text, interested: false, buyerType: null, quantity: null };
    expect(responseNotificationText({ ...no, reason: 'TOO_EXPENSIVE' }).body).toBe(
      "Une personne n'est pas intéressée : trop cher.",
    );
    expect(responseNotificationText(no).body).toBe("Une personne n'est pas intéressée.");
  });

  it('a locked response notifies without its content', () => {
    const { title, body } = responseNotificationText({ ...text, locked: true });
    expect(title).toBe('Nouvelle réponse · Marmites inox 5 L');
    expect(body).toBe(
      "Une nouvelle réponse t'attend. Ton forfait du mois est plein : passe à Pro pour la voir.",
    );
  });
});

const response = {
  id: 'resp_1',
  campaignId: 'camp_1',
  organizationId: 'org_1',
  interested: true,
  buyerType: 'RESELLER',
  quantity: 12,
  notInterestedReason: null,
  completedAt: new Date('2026-10-25T10:00:00Z'),
  locked: false,
  respondentId: 'rsp_1',
  // Present as if a careless include had loaded it: it must never travel.
  respondent: { firstName: 'Awa', phoneE164: '+221771234567' },
  campaign: { id: 'camp_1', title: 'Marmites inox 5 L', product: { unitLabel: 'pièce' } },
};
const subs = [
  { userId: 'user_1', endpoint: 'https://push.example/1', p256dh: 'p1', auth: 'a1' },
  { userId: 'user_2', endpoint: 'https://push.example/2', p256dh: 'p2', auth: 'a2' },
];

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.response.findUnique.mockResolvedValue(response as never);
  prismaMock.response.count.mockResolvedValue(7);
  prismaMock.organizationMember.findMany.mockResolvedValue([
    { userId: 'user_1' },
    { userId: 'user_2' },
  ] as never);
  prismaMock.pushSubscription.findMany.mockResolvedValue(subs as never);
  notifications.createNotification.mockImplementation(async (_db, input) => ({
    id: 'n',
    ...input,
  }));
  push.pushConfigured.mockReturnValue(true);
  push.sendPush.mockResolvedValue('SENT');
});

describe('notifyShopOfResponse', () => {
  it('writes one bell notification per shop member', async () => {
    await notifyShopOfResponse(prismaMock, 'resp_1');
    expect(notifications.createNotification).toHaveBeenCalledTimes(2);
    expect(notifications.createNotification).toHaveBeenCalledWith(prismaMock, {
      userId: 'user_2',
      type: 'tamani.response',
      title: 'Nouvelle réponse · Marmites inox 5 L',
      body: "Quelqu'un en veut 12 pièces (pour revendre). 7 intéressés au total.",
      data: { campaignId: 'camp_1', responseId: 'resp_1', url: '/app/campagnes/camp_1' },
      dedupeKey: 'tamani.response:resp_1:user_2',
    });
    expect(prismaMock.organizationMember.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      select: { userId: true },
    });
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: {
        campaignId: 'camp_1',
        interested: true,
        completedAt: { not: null },
        suspicious: false,
        locked: false,
      },
    });
  });

  it("never puts the respondent's name or number in a notification", async () => {
    await notifyShopOfResponse(prismaMock, 'resp_1');
    const sent = JSON.stringify([
      notifications.createNotification.mock.calls.map((c) => c[1]),
      push.sendPush.mock.calls,
    ]);
    expect(sent).not.toContain('Awa');
    expect(sent).not.toContain('771234567');
  });

  it('pushes with the campaign as tag and drops gone subscriptions', async () => {
    push.sendPush.mockResolvedValueOnce('SENT').mockResolvedValueOnce('GONE');
    await notifyShopOfResponse(prismaMock, 'resp_1');
    expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ['user_1', 'user_2'] } },
    });
    expect(push.sendPush).toHaveBeenCalledWith(subs[0], {
      title: 'Nouvelle réponse · Marmites inox 5 L',
      body: "Quelqu'un en veut 12 pièces (pour revendre). 7 intéressés au total.",
      url: '/app/campagnes/camp_1',
      tag: 'campaign:camp_1',
    });
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example/2' },
    });
  });

  it('a repeated completion notifies once', async () => {
    notifications.createNotification.mockResolvedValue(null);
    await notifyShopOfResponse(prismaMock, 'resp_1');
    expect(push.sendPush).not.toHaveBeenCalled();
  });

  it('skips push when VAPID is not configured', async () => {
    push.pushConfigured.mockReturnValue(false);
    await notifyShopOfResponse(prismaMock, 'resp_1');
    expect(notifications.createNotification).toHaveBeenCalledTimes(2);
    expect(push.sendPush).not.toHaveBeenCalled();
  });

  it('ignores a response that is not complete', async () => {
    prismaMock.response.findUnique.mockResolvedValue({ ...response, completedAt: null } as never);
    await notifyShopOfResponse(prismaMock, 'resp_1');
    expect(notifications.createNotification).not.toHaveBeenCalled();
  });

  it('swallows and logs a failure with the responseId only', async () => {
    prismaMock.organizationMember.findMany.mockRejectedValue(new Error('db down'));
    const warn = vi.spyOn(log, 'warn');
    await expect(notifyShopOfResponse(prismaMock, 'resp_1')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('response notification failed', { responseId: 'resp_1' });
  });
});

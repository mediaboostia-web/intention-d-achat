// « Tester la notification » (2026-11-04): one push to the signed-in user's
// own browsers, and how many it reached.
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();
const push = vi.hoisted(() => ({ sendPush: vi.fn(), pushConfigured: vi.fn(() => true) }));
vi.mock('@/lib/server/push/web-push', () => push);

import { POST } from './route';

const row = (n: number) => ({
  id: `s${n}`,
  userId: 'user_1',
  endpoint: `https://fcm.googleapis.com/fcm/send/${n}`,
  p256dh: 'p',
  auth: 'a',
  createdAt: new Date(),
  updatedAt: new Date(),
});
const call = () => POST(apiRequest('/api/push/test', { method: 'POST', body: {} }));

beforeEach(() => push.pushConfigured.mockReturnValue(true));
afterEach(() => vi.clearAllMocks());

describe('POST /api/push/test', () => {
  it('403 without the CSRF token, 401 without a session', async () => {
    expect((await call()).status).toBe(401);
    await signIn();
    const res = await POST(apiRequest('/api/push/test', { method: 'POST', body: {}, csrf: false }));
    expect(res.status).toBe(403);
  });

  it('503 PUSH_NOT_CONFIGURED without the VAPID keys', async () => {
    await signIn();
    push.pushConfigured.mockReturnValue(false);
    const res = await call();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'PUSH_NOT_CONFIGURED' });
  });

  it("pushes to the user's own browsers only, says how many it reached, drops the gone ones", async () => {
    await signIn();
    prismaMock.pushSubscription.findMany.mockResolvedValue([row(1), row(2), row(3)]);
    push.sendPush
      .mockResolvedValueOnce('SENT')
      .mockResolvedValueOnce('FAILED')
      .mockResolvedValueOnce('GONE');
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ devices: 3, sent: 1, failed: 1 });
    expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
    });
    expect(push.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://fcm.googleapis.com/fcm/send/1' }),
      {
        title: 'Tamani',
        body: 'Les notifications marchent sur cet appareil.',
        url: '/app/reglages#notifications',
        tag: 'tamani-test',
      },
    );
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: 'https://fcm.googleapis.com/fcm/send/3', userId: 'user_1' },
    });
  });
});

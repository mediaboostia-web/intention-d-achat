// Web Push subscriptions of the signed-in user (Tamani lot 5).
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies } from '@/test-utils/mock-cookies';
import { describe, expect, it } from 'vitest';
import { apiRequest, signIn } from '@/test-utils/shop-fixtures';

mockNextCookies();

import { DELETE, POST } from './route';

const body = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'BPk-key', auth: 'auth-secret' },
};

describe('POST /api/push/subscriptions', () => {
  it('403 without the CSRF token', async () => {
    await signIn();
    const res = await POST(
      apiRequest('/api/push/subscriptions', { method: 'POST', body, csrf: false }),
    );
    expect(res.status).toBe(403);
  });

  it('401 without a session', async () => {
    const res = await POST(apiRequest('/api/push/subscriptions', { method: 'POST', body }));
    expect(res.status).toBe(401);
  });

  it('upserts by endpoint for the signed-in user', async () => {
    await signIn();
    const res = await POST(apiRequest('/api/push/subscriptions', { method: 'POST', body }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: body.endpoint },
      create: { userId: 'user_1', endpoint: body.endpoint, p256dh: 'BPk-key', auth: 'auth-secret' },
      update: { userId: 'user_1', p256dh: 'BPk-key', auth: 'auth-secret' },
    });
  });

  it('refuses a non-https endpoint', async () => {
    await signIn();
    const res = await POST(
      apiRequest('/api/push/subscriptions', {
        method: 'POST',
        body: { ...body, endpoint: 'http://push.example/1' },
      }),
    );
    expect(res.status).toBe(400);
    expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/push/subscriptions', () => {
  it("DELETE removes only the caller's subscription", async () => {
    await signIn();
    const res = await DELETE(
      apiRequest('/api/push/subscriptions', {
        method: 'DELETE',
        body: { endpoint: body.endpoint },
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: body.endpoint, userId: 'user_1' },
    });
  });
});

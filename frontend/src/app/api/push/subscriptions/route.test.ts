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

  it('accepts the browsers push services only, so the server never posts elsewhere', async () => {
    await signIn();
    const post = (endpoint: string) =>
      POST(apiRequest('/api/push/subscriptions', { method: 'POST', body: { ...body, endpoint } }));
    for (const ok of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/QGx2',
      'https://wns2-par02p.notify.windows.com/w/?token=abc',
    ]) {
      expect((await post(ok)).status, ok).toBe(200);
    }
    for (const bad of [
      'https://169.254.169.254/latest/meta-data',
      'https://hooks.example.com/collect',
      'https://storage.googleapis.com/bucket/object',
      'https://fcm.googleapis.com.evil.example/fcm/send/abc',
    ]) {
      expect((await post(bad)).status, bad).toBe(400);
    }
    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledTimes(4);
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

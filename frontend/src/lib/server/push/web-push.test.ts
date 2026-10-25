import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({ setVapidDetails: vi.fn(), sendNotification: vi.fn() }));
vi.mock('web-push', () => ({ default: lib }));

const { pushConfigured, sendPush, vapidPublicKey } = await import('./web-push');

const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'p', auth: 'a' };
const payload = { title: 'T', body: 'B', url: '/app', tag: 'campaign:c1' };

beforeEach(() => {
  vi.stubEnv('VAPID_PUBLIC_KEY', 'pub');
  vi.stubEnv('VAPID_PRIVATE_KEY', 'priv');
  vi.stubEnv('VAPID_SUBJECT', 'mailto:notifications@tamani.app');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('web push', () => {
  it('is configured only with the three VAPID variables', () => {
    expect(pushConfigured()).toBe(true);
    expect(vapidPublicKey()).toBe('pub');
    for (const name of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']) {
      vi.stubEnv(name, '');
      expect(pushConfigured()).toBe(false);
      expect(vapidPublicKey()).toBeNull();
      vi.stubEnv(name, 'x');
    }
  });

  it('sends the payload with a day of TTL and high urgency', async () => {
    lib.sendNotification.mockResolvedValue({ statusCode: 201 });
    expect(await sendPush(sub, payload)).toBe('SENT');
    expect(lib.setVapidDetails).toHaveBeenCalledWith(
      'mailto:notifications@tamani.app',
      'pub',
      'priv',
    );
    expect(lib.sendNotification).toHaveBeenCalledWith(
      { endpoint: sub.endpoint, keys: { p256dh: 'p', auth: 'a' } },
      JSON.stringify(payload),
      { TTL: 86400, urgency: 'high' },
    );
  });

  it('reports a gone subscription on 404 and 410, a failure otherwise', async () => {
    for (const [statusCode, result] of [
      [404, 'GONE'],
      [410, 'GONE'],
      [500, 'FAILED'],
    ] as const) {
      lib.sendNotification.mockRejectedValueOnce(Object.assign(new Error('push'), { statusCode }));
      expect(await sendPush(sub, payload)).toBe(result);
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/leader-lease', () => ({
  withLease: vi.fn(async (_r: unknown, _n: string, _t: number, fn: () => Promise<void>) => fn()),
}));
vi.mock('@/lib/server/redis', () => ({ redis: null }));
vi.mock('@/lib/server/prisma', () => ({ prisma: {} }));
const queue = vi.hoisted(() => ({ mail: { enqueue: vi.fn() } as object | null }));
vi.mock('@/lib/server/queues/email-queue-singleton', () => ({ getEmailQueue: () => queue.mail }));
const renewals = vi.hoisted(() => ({
  runRenewals: vi.fn(async () => ({ reminders: 1, graces: 0, trialsEnded: 2 })),
}));
vi.mock('@/lib/server/tamani/renewals', () => renewals);

const { GET, POST, runtime } = await import('./route');

const req = (method: 'GET' | 'POST', secret: string | null = 'test-secret-0123456789') =>
  new NextRequest('http://localhost/api/cron/subscription-renewals', {
    method,
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-secret-0123456789');
  renewals.runRenewals.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/api/cron/subscription-renewals', () => {
  it('runs on node', () => {
    expect(runtime).toBe('nodejs');
  });

  it('refuses without CRON_SECRET', async () => {
    expect((await GET(req('GET', null))).status).toBe(401);
    vi.stubEnv('CRON_SECRET', '');
    expect((await POST(req('POST'))).status).toBe(500);
    expect(renewals.runRenewals).not.toHaveBeenCalled();
  });

  it('runs the renewals on GET (Vercel Cron) and POST, with the email queue', async () => {
    for (const handler of [GET, POST]) {
      const res = await handler(req(handler === GET ? 'GET' : 'POST'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, reminders: 1, graces: 0, trialsEnded: 2 });
    }
    expect(renewals.runRenewals).toHaveBeenCalledWith({}, expect.any(Date), queue.mail);
  });
});

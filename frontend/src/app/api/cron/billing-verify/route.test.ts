import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/leader-lease', () => ({
  withLease: vi.fn(async (_r: unknown, _n: string, _t: number, fn: () => Promise<void>) => fn()),
}));
vi.mock('@/lib/server/redis', () => ({ redis: null }));
vi.mock('@/lib/server/prisma', () => ({ prisma: {} }));
const billing = vi.hoisted(() => ({ reconcilePendingOrders: vi.fn(async () => 2) }));
vi.mock('@/lib/server/tamani/billing', () => billing);
const client = vi.hoisted(() => ({ saspay: {} as object | null }));
vi.mock('@/lib/server/payments/saspay', () => ({ getSaspay: () => client.saspay }));

const { GET, POST, runtime } = await import('./route');

const req = (method: 'GET' | 'POST', secret: string | null = 'test-secret-0123456789') =>
  new NextRequest('http://localhost/api/cron/billing-verify', {
    method,
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-secret-0123456789');
  client.saspay = {};
  billing.reconcilePendingOrders.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/api/cron/billing-verify', () => {
  it('runs on node', () => {
    expect(runtime).toBe('nodejs');
  });

  it('refuses a call without the cron secret', async () => {
    expect((await GET(req('GET', null))).status).toBe(401);
    expect((await POST(req('POST', 'wrong-secret-0123456789'))).status).toBe(401);
    expect(billing.reconcilePendingOrders).not.toHaveBeenCalled();
  });

  it('reconciles the pending purchases on GET (Vercel Cron) and POST', async () => {
    for (const method of ['GET', 'POST'] as const) {
      const handler = method === 'GET' ? GET : POST;
      const res = await handler(req(method));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, activated: 2 });
    }
    expect(billing.reconcilePendingOrders).toHaveBeenCalledWith(
      {},
      client.saspay,
      expect.any(Date),
    );
  });

  it('does nothing without a SasPay key', async () => {
    client.saspay = null;
    const res = await GET(req('GET'));
    expect(await res.json()).toEqual({ ok: true, activated: 0 });
    expect(billing.reconcilePendingOrders).not.toHaveBeenCalled();
  });
});

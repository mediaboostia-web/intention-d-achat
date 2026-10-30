import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SECRET = 'whsec_test_0123456789abcdef';

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();
const $transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>, _opts?: unknown) =>
  fn({ webhookLog: { findUnique, create, update } }),
);
vi.mock('@/lib/server/prisma', () => ({ prisma: { $transaction } }));

const later = vi.hoisted(() => ({ after: vi.fn() }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: later.after,
}));
const billing = vi.hoisted(() => ({ reconcilePendingOrders: vi.fn(async () => 0) }));
vi.mock('@/lib/server/tamani/billing', () => billing);
const client = vi.hoisted(() => ({ saspay: {} }));
vi.mock('@/lib/server/payments/saspay', () => ({ getSaspay: () => client.saspay }));

const { POST, runtime, dynamic } = await import('./route');

function delivery(event: string, data: Record<string, unknown> = { id: 'pay_9' }) {
  const raw = JSON.stringify({ event, data });
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', SECRET).update(`${ts}.${raw}`).digest('hex');
  return new NextRequest('http://localhost/api/webhooks/saspay', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-webhook-signature': signature,
      'x-webhook-timestamp': ts,
      'x-webhook-event': event,
    },
    body: raw,
  });
}

beforeEach(() => {
  vi.stubEnv('SASPAY_WEBHOOK_SECRET', SECRET);
  $transaction.mockClear();
  findUnique.mockReset();
  create.mockReset();
  update.mockReset();
  later.after.mockReset();
  billing.reconcilePendingOrders.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/webhooks/saspay', () => {
  it('runs on node and is never cached', () => {
    expect(runtime).toBe('nodejs');
    expect(dynamic).toBe('force-dynamic');
  });

  it('200 then reconciliation is scheduled', async () => {
    findUnique.mockResolvedValueOnce(null);
    const res = await POST(delivery('transaction.success'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, deduped: false });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'saspay',
        externalId: 'pay_9',
        eventType: 'transaction.success',
      }),
    });
    // Nothing runs inside the transaction: the reconciliation waits for the reply.
    expect(billing.reconcilePendingOrders).not.toHaveBeenCalled();
    expect(later.after).toHaveBeenCalledTimes(1);
    const wake = later.after.mock.calls[0]![0] as () => Promise<void>;
    await wake();
    expect(billing.reconcilePendingOrders).toHaveBeenCalledWith(
      expect.anything(),
      client.saspay,
      expect.any(Date),
    );
  });

  it('a failed payment wakes it too, a test event does not', async () => {
    findUnique.mockResolvedValue(null);
    await POST(delivery('transaction.failed'));
    expect(later.after).toHaveBeenCalledTimes(1);
    await POST(delivery('webhook.test', {}));
    expect(later.after).toHaveBeenCalledTimes(1);
  });

  it('a replay is deduped', async () => {
    findUnique.mockResolvedValueOnce({ id: 'wl_1', processedAt: new Date() });
    const res = await POST(delivery('transaction.success'));
    expect(await res.json()).toEqual({ ok: true, deduped: true });
    expect(create).not.toHaveBeenCalled();
    expect(later.after).not.toHaveBeenCalled();
  });

  it('401 on a bad signature, nothing written', async () => {
    const req = delivery('transaction.success');
    req.headers.set('x-webhook-signature', '0'.repeat(64));
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect($transaction).not.toHaveBeenCalled();
    expect(later.after).not.toHaveBeenCalled();
  });

  it('503 without SASPAY_WEBHOOK_SECRET', async () => {
    vi.stubEnv('SASPAY_WEBHOOK_SECRET', '');
    const res = await POST(delivery('transaction.success'));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe('BILLING_NOT_CONFIGURED');
    expect($transaction).not.toHaveBeenCalled();
  });
});

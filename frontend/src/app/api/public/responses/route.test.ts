import { prismaMock } from '@/test-utils/prisma-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { runTransactionsInline } from '@/test-utils/shop-fixtures';
import { DEVICE_A, fakePublicDb, publicLink } from '@/test-utils/public-fixtures';
import { log } from '@/lib/server/observability/log';

vi.mock('@/lib/server/redis', () => ({ redis: null }));
const later = vi.hoisted(() => ({ after: vi.fn() }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: later.after,
}));
const notify = vi.hoisted(() => ({ notifyShopOfResponse: vi.fn(async () => {}) }));
vi.mock('@/lib/server/tamani/notify-response', () => notify);

const { POST } = await import('./route');

let ipSeq = 0;
function post(body: unknown, init: { token?: string; ip?: string } = {}): NextRequest {
  const headers = new Headers({
    'content-type': 'application/json',
    'x-forwarded-for': init.ip ?? `41.82.0.${++ipSeq}`,
  });
  if (init.token) headers.set('x-response-token', init.token);
  return new NextRequest('http://localhost/api/public/responses', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const step = { code: 'Ab3dE7x', deviceId: DEVICE_A, interested: true };
const full = {
  ...step,
  buyerType: 'RESELLER',
  quantity: 12,
  timing: 'ON_ARRIVAL',
  wantsDelivery: false,
  firstName: 'Awa',
  phone: '77 123 45 67',
};

beforeEach(() => {
  later.after.mockClear();
  notify.notifyShopOfResponse.mockClear();
  runTransactionsInline();
});

describe('POST /api/public/responses', () => {
  it('saves a step without a CSRF token', async () => {
    const { responses } = fakePublicDb();
    const res = await POST(post(step));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ completed: false, respondent: null });
    expect(body).not.toHaveProperty('firstCompletion');
    expect(typeof body.token).toBe('string');
    expect(responses).toHaveLength(1);
  });

  it('returns the remembered respondent at completion', async () => {
    fakePublicDb();
    const res = await POST(post(full));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      completed: true,
      respondent: { firstName: 'Awa', phoneE164: '+221771234567', phoneMasked: '77 •• •• 67' },
    });
  });

  it('422 INVALID_PHONE', async () => {
    fakePublicDb();
    const res = await POST(post({ ...full, phone: '12 34 56' }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'INVALID_PHONE' });
  });

  it('401 INVALID_RESPONSE_TOKEN', async () => {
    fakePublicDb();
    const res = await POST(post(step, { token: 'abc' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'INVALID_RESPONSE_TOKEN' });
  });

  it('404 CAMPAIGN_NOT_FOUND', async () => {
    fakePublicDb();
    const res = await POST(post({ ...step, code: 'Zz9Zz9Z' }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'CAMPAIGN_NOT_FOUND' });
  });

  it('409 CAMPAIGN_CLOSED once the campaign has ended', async () => {
    fakePublicDb(publicLink({ campaign: { status: 'CLOSED' } }));
    const res = await POST(post(step));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'CAMPAIGN_CLOSED' });
  });

  it('400 VALIDATION_FAILED on a bad body', async () => {
    fakePublicDb();
    for (const body of ['{', { ...step, deviceId: 'not-a-uuid' }, { ...step, firstName: 'Awa' }]) {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'VALIDATION_FAILED' });
    }
  });

  it('429 RATE_LIMITED after 30 writes from one IP', async () => {
    fakePublicDb();
    for (let i = 0; i < 30; i++) {
      expect((await POST(post(step, { ip: '41.82.9.9' }))).status).toBe(200);
    }
    const res = await POST(post(step, { ip: '41.82.9.9' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'RATE_LIMITED' });
  });

  it('ignores a filled honeypot without writing', async () => {
    fakePublicDb();
    const res = await POST(post({ ...full, website: 'https://spam.example' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ completed: false });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.response.create).not.toHaveBeenCalled();
  });

  it('retries once on a unique conflict', async () => {
    const { responses } = fakePublicDb();
    const conflict = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['campaignId', 'deviceId'] },
    });
    prismaMock.$transaction.mockRejectedValueOnce(conflict);
    const res = await POST(post(step));
    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(responses).toHaveLength(1);
  });

  it('never logs the phone or the first name', async () => {
    fakePublicDb();
    const spies = (['info', 'warn', 'error'] as const).map((level) => vi.spyOn(log, level));
    await POST(post(full));
    await POST(post({ ...full, phone: '12 34 56' }));
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(spies[0]!).toHaveBeenCalled();
    expect(logged).not.toContain('771234567');
    expect(logged).not.toContain('Awa');
  });

  it('notifies the shop after the first completion', async () => {
    const { responses } = fakePublicDb();
    await POST(post(full));
    expect(later.after).toHaveBeenCalledTimes(1);
    const task = later.after.mock.calls[0]![0] as () => Promise<void>;
    await task();
    expect(notify.notifyShopOfResponse).toHaveBeenCalledWith(prismaMock, responses[0]!.id);
  });

  it('does not notify on a step or an edit', async () => {
    fakePublicDb();
    await POST(post(step));
    const done = await (await POST(post(full))).json();
    later.after.mockClear();
    await POST(post({ ...step, quantity: 24 }, { token: done.token }));
    await POST(post(full, { token: done.token }));
    expect(later.after).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/redis', () => ({ redis: null }));

const { enforcePublicRateLimit, isFirstViewToday, recordDeviceNumber } =
  await import('./public-limits');

function from(ip: string): NextRequest {
  return new NextRequest('http://localhost/api/public/responses', {
    method: 'POST',
    headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` },
  });
}

describe('public limits without Redis', () => {
  it('allows one phone 30 writes per 10 minutes and campaign, then 429 RATE_LIMITED', async () => {
    for (let i = 0; i < 30; i++) {
      expect(await enforcePublicRateLimit(from('41.82.1.1'), 'camp_rl', 'dev_a')).toBeNull();
    }
    const blocked = await enforcePublicRateLimit(from('41.82.1.1'), 'camp_rl', 'dev_a');
    expect(blocked?.status).toBe(429);
    expect(await blocked?.json()).toMatchObject({ error: 'RATE_LIMITED' });
    expect(Number(blocked?.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(await enforcePublicRateLimit(from('41.82.1.1'), 'camp_other', 'dev_a')).toBeNull();
  });

  it('lets many phones behind one operator IP answer, up to 600 writes per 10 minutes', async () => {
    // Mobile operators put many subscribers behind one public IP: 100 phones
    // answering the same campaign stay under the IP's ceiling.
    for (let i = 0; i < 600; i++) {
      expect(
        await enforcePublicRateLimit(from('41.82.2.1'), 'camp_nat', `dev_${i % 100}`),
      ).toBeNull();
    }
    const blocked = await enforcePublicRateLimit(from('41.82.2.1'), 'camp_nat', 'dev_new');
    expect(blocked?.status).toBe(429);
    expect(await enforcePublicRateLimit(from('41.82.2.2'), 'camp_nat', 'dev_new')).toBeNull();
  });

  it('isFirstViewToday is true once per device and day', async () => {
    const day = new Date('2026-10-25T09:00:00Z');
    expect(await isFirstViewToday('link_1', 'dev_1', day)).toBe(true);
    expect(await isFirstViewToday('link_1', 'dev_1', day)).toBe(false);
    expect(await isFirstViewToday('link_1', 'dev_1', new Date('2026-10-26T09:00:00Z'))).toBe(true);
  });

  it('recordDeviceNumber counts distinct numbers per device and campaign', async () => {
    expect(await recordDeviceNumber('camp_n', 'dev_1', '+221771234567')).toBe(1);
    expect(await recordDeviceNumber('camp_n', 'dev_1', '+221771234567')).toBe(1);
    expect(await recordDeviceNumber('camp_n', 'dev_1', '+221771234568')).toBe(2);
    expect(await recordDeviceNumber('camp_n', 'dev_1', '+221771234569')).toBe(3);
    expect(await recordDeviceNumber('camp_n', 'dev_2', '+221771234569')).toBe(1);
  });
});

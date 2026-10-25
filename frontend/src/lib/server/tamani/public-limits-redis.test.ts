import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  set: vi.fn(async () => 'OK' as string | null),
  sadd: vi.fn(async () => 1),
  scard: vi.fn(async () => 2),
  expire: vi.fn(async () => 1),
  incr: vi.fn(async () => 1),
}));
vi.mock('@/lib/server/redis', () => ({ redis: fake }));

const { isFirstViewToday, recordDeviceNumber } = await import('./public-limits');

describe('public limits with Redis', () => {
  it('uses the documented Redis keys', async () => {
    expect(await isFirstViewToday('link_1', 'dev_1', new Date('2026-10-25T23:30:00Z'))).toBe(true);
    expect(fake.set).toHaveBeenCalledWith('tamani:view:link_1:dev_1:20261025', '1', {
      nx: true,
      ex: 172800,
    });
    fake.set.mockResolvedValueOnce(null);
    expect(await isFirstViewToday('link_1', 'dev_1', new Date('2026-10-25T23:30:00Z'))).toBe(false);

    expect(await recordDeviceNumber('camp_1', 'dev_1', '+221771234567')).toBe(2);
    const hash = createHash('sha256').update('+221771234567').digest('hex');
    expect(fake.sadd).toHaveBeenCalledWith('tamani:device-numbers:camp_1:dev_1', hash);
    expect(JSON.stringify(fake.sadd.mock.calls)).not.toContain('771234567');
    expect(fake.expire).toHaveBeenCalledWith('tamani:device-numbers:camp_1:dev_1', 90 * 24 * 3600);
  });
});

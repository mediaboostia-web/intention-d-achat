import { describe, expect, it, vi } from 'vitest';

const wake = vi.hoisted(() => ({ markWork: vi.fn(async () => {}) }));
vi.mock('@/lib/server/cron/wake', () => wake);

const { enqueueOutbox } = await import('./index');

describe('enqueueOutbox', () => {
  it('writes the row, then wakes the outbox cron for 15 minutes (Neon free plan)', async () => {
    const create = vi.fn(async () => ({ id: 'oe_1' }));
    const tx = { outboxEvent: { create } } as unknown as Parameters<typeof enqueueOutbox>[0];
    const event = {
      kind: 'email.verification',
      payload: { to: 'a@b.c' },
    } as unknown as Parameters<typeof enqueueOutbox>[1];
    expect(await enqueueOutbox(tx, event)).toEqual({ id: 'oe_1' });
    expect(create).toHaveBeenCalledWith({
      data: { kind: 'email.verification', payload: { to: 'a@b.c' } },
      select: { id: true },
    });
    expect(wake.markWork).toHaveBeenCalledWith('outbox', 15 * 60_000);
  });
});

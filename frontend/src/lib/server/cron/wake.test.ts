import { describe, expect, it, vi } from 'vitest';
import { SWEEP_EVERY_MS, hasWork, markWork, type WakeStore } from './wake';

/** An in-memory stand-in for the Upstash calls wake.ts makes. */
function memoryStore(): WakeStore & { keys: Map<string, number> } {
  const keys = new Map<string, number>();
  return {
    keys,
    async set(key: string, value: unknown, opts?: { px?: number; nx?: boolean }) {
      if (opts?.nx && keys.has(key)) return null;
      keys.set(key, opts?.px ?? 0);
      return 'OK';
    },
    async exists(...k: string[]) {
      return k.filter((x) => keys.has(x)).length;
    },
  } as WakeStore & { keys: Map<string, number> };
}

describe('hasWork', () => {
  it('runs the first time of the hour (the safety sweep), then sleeps with nothing marked', async () => {
    const store = memoryStore();
    expect(await hasWork('outbox', store)).toBe(true);
    expect(store.keys.get('wake:outbox:sweep')).toBe(SWEEP_EVERY_MS);
    expect(await hasWork('outbox', store)).toBe(false);
    expect(await hasWork('outbox', store)).toBe(false);
  });

  it('runs while some work is marked', async () => {
    const store = memoryStore();
    await hasWork('billing', store); // the hour's sweep
    await markWork('billing', 7_200_000, store);
    expect(store.keys.get('wake:billing')).toBe(7_200_000);
    expect(await hasWork('billing', store)).toBe(true);
    expect(await hasWork('outbox', store)).toBe(true); // its own sweep, not billing's mark
    expect(await hasWork('outbox', store)).toBe(false);
  });

  it('runs every time without Redis, or when Redis fails: never miss work to save time', async () => {
    expect(await hasWork('outbox', null)).toBe(true);
    const broken = {
      set: vi.fn().mockRejectedValue(new Error('down')),
      exists: vi.fn().mockRejectedValue(new Error('down')),
    } as unknown as WakeStore;
    expect(await hasWork('outbox', broken)).toBe(true);
  });
});

describe('markWork', () => {
  it('never throws: a lost mark only waits for the next sweep', async () => {
    const broken = { set: vi.fn().mockRejectedValue(new Error('down')) } as unknown as WakeStore;
    await expect(markWork('outbox', 1000, broken)).resolves.toBeUndefined();
    await expect(markWork('outbox', 1000, null)).resolves.toBeUndefined();
  });
});

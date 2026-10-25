import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadDeviceMemory,
  newDeviceId,
  safeStorage,
  saveDeviceMemory,
  type DeviceMemory,
} from './device-memory';
import { EMPTY_ANSWERS } from './popup-machine';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('safeStorage', () => {
  it('returns the storage when it works', () => {
    const storage = memoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    expect(safeStorage()).toBe(storage);
  });

  it('safeStorage returns null when storage throws', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    expect(safeStorage()).toBeNull();
    vi.stubGlobal('window', {
      localStorage: {
        ...memoryStorage(),
        setItem: () => {
          throw new DOMException('full', 'QuotaExceededError');
        },
      },
    });
    expect(safeStorage()).toBeNull();
  });

  it('returns null outside a browser', () => {
    expect(safeStorage()).toBeNull();
  });
});

describe('loadDeviceMemory', () => {
  it('loadDeviceMemory creates a device id when storage is empty or corrupt', () => {
    for (const storage of [null, memoryStorage(), memoryStorage({ 'tamani:device': '{oops' })]) {
      const m = loadDeviceMemory(storage);
      expect(m.deviceId).toMatch(UUID_V4);
      expect(m).toMatchObject({ respondent: null, saved: {} });
    }
  });

  it('reads back what was saved', () => {
    const storage = memoryStorage();
    const m: DeviceMemory = {
      deviceId: newDeviceId(),
      respondent: { firstName: 'Awa', phoneE164: '+221771234512', phoneMasked: '77 •• •• 12' },
      saved: { camp_1: { token: 't', answers: EMPTY_ANSWERS, savedAt: '2026-10-25T10:00:00Z' } },
    };
    saveDeviceMemory(storage, m);
    expect(loadDeviceMemory(storage)).toEqual(m);
  });
});

describe('saveDeviceMemory', () => {
  it('saveDeviceMemory keeps the 20 most recent campaigns', () => {
    const storage = memoryStorage();
    const saved = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [
        `camp_${i}`,
        {
          token: 't',
          answers: EMPTY_ANSWERS,
          savedAt: new Date(Date.UTC(2026, 9, 1 + i)).toISOString(),
        },
      ]),
    );
    saveDeviceMemory(storage, { deviceId: newDeviceId(), respondent: null, saved });
    const kept = Object.keys(loadDeviceMemory(storage).saved);
    expect(kept).toHaveLength(20);
    expect(kept).not.toContain('camp_4');
    expect(kept).toContain('camp_5');
    expect(kept).toContain('camp_24');
  });

  it('does nothing without storage and never throws', () => {
    expect(() =>
      saveDeviceMemory(null, { deviceId: newDeviceId(), respondent: null, saved: {} }),
    ).not.toThrow();
  });
});

describe('newDeviceId', () => {
  it('uses crypto.randomUUID when it exists', () => {
    expect(newDeviceId()).toMatch(UUID_V4);
  });

  it('newDeviceId falls back to getRandomValues', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: <T extends ArrayBufferView>(a: T) => real.getRandomValues(a as never) as T,
    });
    const ids = new Set(Array.from({ length: 50 }, newDeviceId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});

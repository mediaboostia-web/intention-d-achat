import { describe, expect, it } from 'vitest';
import { PREF_KEYS, readPref, SHELL_PREFS_SCRIPT, writePref } from './prefs';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage & { data: Map<string, string> };
}

const throwing = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
  removeItem: () => {
    throw new Error('denied');
  },
} as unknown as Storage;

describe('readPref / writePref', () => {
  it('write, read back, then remove a preference', () => {
    const storage = memoryStorage();
    expect(readPref(storage, PREF_KEYS.theme)).toBeNull();
    writePref(storage, PREF_KEYS.theme, 'dark');
    expect(storage.data.get('tamani-theme')).toBe('dark');
    expect(readPref(storage, PREF_KEYS.theme)).toBe('dark');
    writePref(storage, PREF_KEYS.theme, null);
    expect(storage.data.has('tamani-theme')).toBe(false);
  });

  it('never throw on a missing or refusing storage', () => {
    expect(readPref(null, PREF_KEYS.sidebar)).toBeNull();
    expect(readPref(throwing, PREF_KEYS.sidebar)).toBeNull();
    expect(() => writePref(throwing, PREF_KEYS.sidebar, 'collapsed')).not.toThrow();
    expect(() => writePref(null, PREF_KEYS.sidebar, null)).not.toThrow();
  });

  it('name one layout key per tab', () => {
    expect(PREF_KEYS.layout('campagnes')).toBe('tamani-layout:campagnes');
  });
});

describe('SHELL_PREFS_SCRIPT', () => {
  const run = (storage: Storage) => {
    const dataset: Record<string, string> = {};
    new Function('document', 'localStorage', SHELL_PREFS_SCRIPT)(
      { documentElement: { dataset } },
      storage,
    );
    return dataset;
  };

  it('sets the night theme and the folded sidebar before the first paint', () => {
    const storage = memoryStorage();
    storage.data.set('tamani-theme', 'dark');
    storage.data.set('tamani-sidebar', 'collapsed');
    expect(run(storage)).toEqual({ theme: 'dark', sidebar: 'collapsed' });
  });

  it('leaves day mode and an open sidebar by default, or when storage refuses', () => {
    expect(run(memoryStorage())).toEqual({});
    expect(run(throwing)).toEqual({});
  });
});

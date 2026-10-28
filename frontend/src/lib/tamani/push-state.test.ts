import { describe, expect, it } from 'vitest';
import {
  PUSH_PROMPT_KEY,
  answeredPushPrompt,
  pushCardState,
  pushPromptDue,
  readPushPrompt,
  urlBase64ToUint8Array,
  writePushPrompt,
  type PushEnv,
} from './push-state';

const android: PushEnv = {
  configured: true,
  supported: true,
  isIos: false,
  standalone: false,
  permission: 'default',
  subscribed: false,
};

describe('pushCardState', () => {
  it('asks on a browser that can receive push', () => {
    expect(pushCardState(android)).toBe('ask');
    expect(pushCardState({ ...android, permission: 'granted' })).toBe('ask');
  });

  it('hides the card when push is off on the server or already on here', () => {
    expect(pushCardState({ ...android, configured: false })).toBe('hidden');
    expect(pushCardState({ ...android, permission: 'granted', subscribed: true })).toBe('hidden');
  });

  it('asks an iPhone to install Tamani first', () => {
    expect(pushCardState({ ...android, isIos: true, supported: false })).toBe('install-first');
    expect(pushCardState({ ...android, isIos: true, standalone: true })).toBe('ask');
  });

  it('settings says on once subscribed', () => {
    const on = { ...android, permission: 'granted' as const, subscribed: true };
    expect(pushCardState(on, 'settings')).toBe('on');
    expect(pushCardState(android, 'settings')).toBe('ask');
    expect(pushCardState({ ...on, configured: false }, 'settings')).toBe('hidden');
  });

  it('home stays hidden once subscribed', () => {
    const on = { ...android, permission: 'granted' as const, subscribed: true };
    expect(pushCardState(on, 'home')).toBe('hidden');
    expect(pushCardState(on)).toBe('hidden');
  });

  it('says when the browser refuses or cannot', () => {
    expect(pushCardState({ ...android, permission: 'denied' })).toBe('denied');
    expect(pushCardState({ ...android, supported: false })).toBe('unsupported');
  });
});

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 28, 9);

describe('pushPromptDue', () => {
  const due = (over: Partial<Parameters<typeof pushPromptDue>[0]> = {}) =>
    pushPromptDue({ state: 'ask', isPhone: true, memory: null, now: NOW, ...over });

  it('asks on a phone the first time, for ask and install-first', () => {
    expect(due()).toBe(true);
    expect(due({ state: 'install-first' })).toBe(true);
  });

  it('never asks on a computer', () => {
    expect(due({ isPhone: false })).toBe(false);
    expect(due({ isPhone: false, state: 'install-first' })).toBe(false);
  });

  it('never asks once notifications are on, refused, impossible or not ready', () => {
    for (const state of ['on', 'denied', 'unsupported', 'hidden'] as const) {
      expect(due({ state }), state).toBe(false);
    }
  });

  it('asks again only once, 7 days after « Plus tard »', () => {
    expect(due({ memory: { count: 1, at: NOW - 6 * DAY } })).toBe(false);
    expect(due({ memory: { count: 1, at: NOW - 7 * DAY } })).toBe(true);
    expect(due({ memory: { count: 2, at: NOW - 30 * DAY } })).toBe(false);
  });
});

describe('answeredPushPrompt', () => {
  it('counts each answer and dates the last one', () => {
    expect(answeredPushPrompt(null, NOW)).toEqual({ count: 1, at: NOW });
    expect(answeredPushPrompt({ count: 1, at: NOW - 8 * DAY }, NOW)).toEqual({ count: 2, at: NOW });
  });
});

/** A Storage over a Map; `fail` makes every call throw, like a blocked one. */
function memoryStorage(fail = false): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  const guard = () => {
    if (fail) throw new DOMException('blocked', 'SecurityError');
  };
  return {
    data,
    get length() {
      return data.size;
    },
    clear: () => (guard(), data.clear()),
    key: (i) => (guard(), [...data.keys()][i] ?? null),
    getItem: (k) => (guard(), data.get(k) ?? null),
    setItem: (k, v) => (guard(), void data.set(k, v)),
    removeItem: (k) => (guard(), void data.delete(k)),
  };
}

describe('readPushPrompt and writePushPrompt', () => {
  it('keep the answer count and its date', () => {
    const storage = memoryStorage();
    expect(readPushPrompt(storage)).toBeNull();
    writePushPrompt(storage, { count: 1, at: NOW });
    expect(storage.data.get(PUSH_PROMPT_KEY)).toBe(JSON.stringify({ count: 1, at: NOW }));
    expect(readPushPrompt(storage)).toEqual({ count: 1, at: NOW });
  });

  it('read nothing from a missing storage or a damaged value', () => {
    expect(readPushPrompt(null)).toBeNull();
    const storage = memoryStorage();
    for (const raw of ['oops', '{"count":"1","at":5}', '{"count":1}', 'null', '[1,2]']) {
      storage.data.set(PUSH_PROMPT_KEY, raw);
      expect(readPushPrompt(storage), raw).toBeNull();
    }
    expect(() => writePushPrompt(null, { count: 1, at: NOW })).not.toThrow();
  });

  it('pushPromptDue with throwing storage', () => {
    const storage = memoryStorage(true);
    expect(readPushPrompt(storage)).toBeNull();
    expect(() => writePushPrompt(storage, { count: 1, at: NOW })).not.toThrow();
    expect(
      pushPromptDue({ state: 'ask', isPhone: true, memory: readPushPrompt(storage), now: NOW }),
    ).toBe(true);
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url VAPID key of 65 bytes', () => {
    const raw = Uint8Array.from({ length: 65 }, (_, i) => (i * 37 + 4) % 256);
    const key = Buffer.from(raw).toString('base64url');
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(urlBase64ToUint8Array(key)).toEqual(raw);
  });
});

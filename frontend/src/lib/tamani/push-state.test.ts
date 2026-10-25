import { describe, expect, it } from 'vitest';
import { pushCardState, urlBase64ToUint8Array, type PushEnv } from './push-state';

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

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url VAPID key of 65 bytes', () => {
    const raw = Uint8Array.from({ length: 65 }, (_, i) => (i * 37 + 4) % 256);
    const key = Buffer.from(raw).toString('base64url');
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(urlBase64ToUint8Array(key)).toEqual(raw);
  });
});

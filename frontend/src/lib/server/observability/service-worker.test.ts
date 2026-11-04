// public/sw.js runs in the browser's service worker scope: loaded here in a
// vm with a fake `self`, to check what a push shows and what a tap opens.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const SW = readFileSync(resolve(__dirname, '../../../../public/sw.js'), 'utf8');

interface FakeWindow {
  url: string;
  focus: () => Promise<unknown>;
  navigate?: (url: string) => Promise<unknown>;
}

function load(windows: FakeWindow[] = []) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const self = {
    addEventListener: (type: string, fn: (e: unknown) => void) => (handlers[type] = fn),
    registration: { showNotification: vi.fn(async () => {}) },
    clients: { matchAll: vi.fn(async () => windows), openWindow: vi.fn(async () => null) },
    location: { origin: 'https://tamani.app' },
  };
  vm.runInNewContext(SW, { self, URL });
  const fire = async (type: string, event: object) => {
    const waits: Promise<unknown>[] = [];
    handlers[type]!({ ...event, waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  };
  return { self, fire };
}

const payload = {
  title: 'Nouvelle réponse · Marmites inox 5 L',
  body: "Quelqu'un en veut 3 pièces (pour son usage). 12 intéressés au total.",
  url: '/app/campagnes/camp_1',
  tag: 'campaign:camp_1',
};

describe('service worker', () => {
  it('shows the pushed notification, one per campaign', async () => {
    const { self, fire } = load();
    await fire('push', { data: { json: () => payload } });
    expect(self.registration.showNotification).toHaveBeenCalledWith(payload.title, {
      body: payload.body,
      tag: payload.tag,
      renotify: true,
      // 2026-11-04: the phone must ring and buzz for each answer.
      silent: false,
      vibrate: [200, 100, 200],
      icon: '/icons/icon-192.png',
      data: { url: payload.url },
    });
  });

  it('opens the campaign when the notification is tapped', async () => {
    const { self, fire } = load();
    const close = vi.fn();
    await fire('notificationclick', { notification: { close, data: { url: payload.url } } });
    expect(close).toHaveBeenCalled();
    expect(self.clients.openWindow).toHaveBeenCalledWith('https://tamani.app/app/campagnes/camp_1');
  });

  it('brings an open Tamani tab forward instead of opening another', async () => {
    const tab: FakeWindow = {
      url: 'https://tamani.app/app',
      focus: vi.fn(async () => tab),
      navigate: vi.fn(async () => tab),
    };
    const { self, fire } = load([tab]);
    await fire('notificationclick', {
      notification: { close: vi.fn(), data: { url: payload.url } },
    });
    expect(tab.focus).toHaveBeenCalled();
    expect(tab.navigate).toHaveBeenCalledWith('https://tamani.app/app/campagnes/camp_1');
    expect(self.clients.openWindow).not.toHaveBeenCalled();
  });

  // 2026-10-30: the offline page makes Tamani installable everywhere; pages
  // themselves are never cached.
  it('keeps only the offline page, never another page', async () => {
    const add = vi.fn(async () => {});
    const { self, fire } = loadWith({ caches: { open: vi.fn(async () => ({ add })) } });
    await fire('install', {});
    expect(add).toHaveBeenCalledWith('/offline.html');
    expect(add).toHaveBeenCalledTimes(1);
    expect(self.skipWaiting).toHaveBeenCalled();
    expect(SW).not.toMatch(/\.put\(/);
  });

  it('a page comes from the network; without network, the offline page answers', async () => {
    const page = { ok: true };
    const offline = { offline: true };
    const net = vi.fn(async () => page);
    const match = vi.fn(async () => offline);
    const { respond } = loadWith({ fetch: net, caches: { match } });
    const request = { mode: 'navigate', method: 'GET', url: 'https://tamani.app/app' };
    expect(await respond(request)).toBe(page);
    net.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await respond(request)).toBe(offline);
    expect(match).toHaveBeenCalledWith('/offline.html');
  });

  it('leaves the API, the files and sent forms to the browser', async () => {
    const { respond } = loadWith({ fetch: vi.fn() });
    expect(
      await respond({ mode: 'cors', method: 'GET', url: 'https://tamani.app/api/shops/me' }),
    ).toBe(undefined);
    expect(await respond({ mode: 'no-cors', method: 'GET', url: 'https://tamani.app/sw.js' })).toBe(
      undefined,
    );
    expect(await respond({ mode: 'navigate', method: 'POST', url: 'https://tamani.app/app' })).toBe(
      undefined,
    );
  });

  it('takes over the open pages at once and drops only its own old caches', async () => {
    const del = vi.fn(async () => true);
    const { self, fire } = loadWith({
      caches: { keys: vi.fn(async () => ['tamani-offline-v0', 'someone-else']), delete: del },
    });
    await fire('activate', {});
    expect(del).toHaveBeenCalledWith('tamani-offline-v0');
    expect(del).not.toHaveBeenCalledWith('someone-else');
    expect(self.clients.claim).toHaveBeenCalled();
  });
});

/** The worker with the globals the offline page needs; `respond` runs a fetch. */
function loadWith(globals: { fetch?: unknown; caches?: Record<string, unknown> }) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const self = {
    addEventListener: (type: string, fn: (e: unknown) => void) => (handlers[type] = fn),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    location: { origin: 'https://tamani.app' },
  };
  vm.runInNewContext(SW, {
    self,
    URL,
    fetch: globals.fetch,
    caches: globals.caches,
    Response: { error: () => ({ error: true }) },
  });
  const fire = async (type: string, event: object) => {
    const waits: Promise<unknown>[] = [];
    handlers[type]!({ ...event, waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  };
  const respond = async (request: object) => {
    let answer: Promise<unknown> | undefined;
    handlers.fetch!({ request, respondWith: (p: Promise<unknown>) => (answer = p) });
    return answer === undefined ? undefined : await answer;
  };
  return { self, fire, respond };
}

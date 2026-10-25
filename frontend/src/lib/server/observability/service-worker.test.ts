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

  it('never caches pages (no fetch handler)', () => {
    expect(SW).not.toMatch(/addEventListener\(\s*['"]fetch['"]/);
  });
});

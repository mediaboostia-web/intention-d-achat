/* global self, caches */
// Tamani service worker (lot 5): shows the Web Push notification of a new
// answer and opens its campaign when tapped. Since 2026-10-30 it also answers
// a page with /offline.html when the network is down, which lets browsers
// install Tamani; that page is the only thing it keeps, every page still
// comes from the network.

const OFFLINE_CACHE = 'tamani-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.add(OFFLINE_URL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('tamani-offline-') && k !== OFFLINE_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Only page loads: the API, files and sent forms go straight to the network.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  event.respondWith(
    fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Tamani', {
      body: data.body || '',
      // One notification per campaign, replaced by the next answer.
      tag: data.tag || 'tamani',
      renotify: true,
      // Ring and buzz for each answer; the phone's own settings still win.
      silent: false,
      vibrate: [200, 100, 200],
      icon: '/icons/icon-192.png',
      data: { url: data.url || '/app' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || '/app';
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if (open.navigate) await open.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});

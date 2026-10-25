/* global self */
// Tamani service worker (lot 5): shows the Web Push notification of a new
// answer and opens its campaign when tapped. No fetch handler: nothing is
// cached, every page still comes from the network.

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

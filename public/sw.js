// Retirement worker for browsers that installed the former ProActive7 app.
// Keep this URL available so an old worker can update and release cached app screens.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('workbox-precache-'))
          .map((name) => caches.delete(name)),
      );
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.allSettled(
        windows.map((client) => client.navigate(client.url)),
      );
    })(),
  );
});

// Kill-switch service worker: si auto-deregistra e pulisce le cache
// per i browser che hanno registrato versioni precedenti.
self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  await self.clients.claim();
  const names = await caches.keys();
  await Promise.all(names.map((n) => caches.delete(n)));
  await self.registration.unregister();
})()));

// Service Worker for Push Notifications and Offline Support
const CACHE_NAME = 'dream-catcher-v1';
const OFFLINE_CACHE = 'dream-catcher-offline-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, cache fallback for offline support
self.addEventListener('fetch', function(event) {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Clone the response before caching
        const responseClone = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(OFFLINE_CACHE).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        
        return response;
      })
      .catch(function() {
        // If network fails, try cache
        return caches.match(event.request).then(function(response) {
          if (response) {
            return response;
          }
          
          // If no cache, show offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          
          // For other requests, return a basic error response
          return new Response('Offline - Contenuto non disponibile', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data?.text()}"`);

  let notificationData = {
    title: 'Dream Catcher 🌙',
    body: 'Ricordati di registrare i tuoi sogni!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'dream-reminder',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Apri App'
      },
      {
        action: 'close',
        title: 'Chiudi'
      }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      actions: notificationData.actions,
      data: {
        url: notificationData.url || '/my-dreams'
      }
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/my-dreams';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => client.navigate(urlToOpen));
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[Service Worker] Push subscription changed.');
  
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(function(subscription) {
        console.log('[Service Worker] Subscribed after expiration', subscription.endpoint);
        // TODO: Send new subscription to application server
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-dreams') {
    event.waitUntil(syncDreams());
  }
});

async function syncDreams() {
  // This would sync any offline-created dreams when connection is restored
  console.log('[Service Worker] Syncing dreams...');
  // Implementation would go here
}

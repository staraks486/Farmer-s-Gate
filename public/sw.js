// Stub SyncManager and PeriodicSyncManager on ServiceWorkerRegistration and prototypes to prevent DOMExceptions
(function() {
  try {
    const mockSyncManager = {
      register: function(tag) {
        console.warn('[SW Sync Stub] Bypassed registering sync tag:', tag);
        return Promise.resolve();
      },
      getTags: function() {
        return Promise.resolve([]);
      },
      unregister: function() {
        return Promise.resolve();
      }
    };

    if (typeof self !== 'undefined') {
      // 1. Stub the global constructors if they exist in self/global scope
      if ('SyncManager' in self) {
        try {
          self.SyncManager.prototype.register = function(tag) {
            console.warn('[SW Sync Stub] Bypassed register on SyncManager.prototype:', tag);
            return Promise.resolve();
          };
        } catch (e) {}
      }
      if ('PeriodicSyncManager' in self) {
        try {
          self.PeriodicSyncManager.prototype.register = function(tag) {
            console.warn('[SW Sync Stub] Bypassed register on PeriodicSyncManager.prototype:', tag);
            return Promise.resolve();
          };
        } catch (e) {}
      }

      // 2. Stub the active registration instance
      if (self.registration) {
        try {
          Object.defineProperty(self.registration, 'sync', {
            configurable: true,
            enumerable: true,
            get: function() { return mockSyncManager; }
          });
        } catch (e) {}
        try {
          Object.defineProperty(self.registration, 'periodicSync', {
            configurable: true,
            enumerable: true,
            get: function() { return mockSyncManager; }
          });
        } catch (e) {}
      }

      // 3. Stub the prototype for any future/other registrations
      if ('ServiceWorkerRegistration' in self) {
        const proto = self.ServiceWorkerRegistration.prototype;
        try {
          Object.defineProperty(proto, 'sync', {
            configurable: true,
            enumerable: true,
            get: function() { return mockSyncManager; }
          });
        } catch (e) {}
        try {
          Object.defineProperty(proto, 'periodicSync', {
            configurable: true,
            enumerable: true,
            get: function() { return mockSyncManager; }
          });
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('[SW Sync Stub] Failed to establish stub:', err);
  }
})();

const CACHE_NAME = 'fg-cache-v1-latest'; // Change version to force update
const STATIC_ASSETS = [
  '/',
  '/index.html',
  // Vite injects hashed assets into index.html, so caching index.html is key.
];

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately so the new SW takes over
  event.waitUntil(self.clients.claim());
  
  // Delete old caches to force loading the new version
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // We want to force the latest version of HTML and API responses from network
  // For static assets (JS/CSS/images), we can try cache first, then network.
  
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Always network-first for HTML and API routes
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/api/') || url.hostname.includes('firebase')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for other assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Cache the newly fetched response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      });
    })
  );
});

// Note: Background sync for Firestore is handled by the Firestore SDK's enableIndexedDbPersistence()
// in the main thread (src/lib/firebase.ts), which provides robust offline transaction queuing
// and auto-sync when connection is restored, fully supporting all platforms including iOS.
// No background sync event listener is needed here, preventing DOMExceptions during registration.


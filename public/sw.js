// Service Worker for Quran Tracker PWA

const CACHE_NAME = 'quran-tracker-v2';
const OFFLINE_PAGE = '/index.html';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/dashboard',
  '/history',
  '/analytics',
  '/settings',
  // Add more static assets/pages here if needed
];

// Immediately claim clients and skip waiting
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Immediately claim clients
      self.clients.claim(),
    ])
  );
  console.log('[Service Worker] Activated and claimed clients');
});

// Skip waiting on install
self.addEventListener('install', event => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching important offline assets');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Cache install failed:', error);
      })
  );
  console.log('[Service Worker] Installed and skipped waiting');
});

// Fetch handler with improved offline support
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Handle API requests differently - allow the app to handle offline api fallbacks
  if (url.pathname.startsWith('/api/')) {
    // Let the application use its offline client logic for API requests
    return;
  }

  // For navigation requests, always serve the cached app shell (index.html) for SPA routing
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // For other requests, use cache-first strategy, fall back to network
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(networkResponse => {
        // Optionally cache new resources
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Background sync for updating when online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-reading-logs') {
    console.log('[Service Worker] Syncing reading logs');
    // The actual sync logic is handled in the app
  }
});

// Listen for messages from the client
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Log service worker lifecycle events for debugging
console.log('[Service Worker] Script loaded');
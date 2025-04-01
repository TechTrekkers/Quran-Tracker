// Service Worker for Quran Tracker PWA

const CACHE_NAME = 'quran-tracker-v2';
const OFFLINE_PAGE = '/';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  '/?source=pwa',
  // Add more static assets here if needed
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

  // Cache strategy: Try network first, fall back to cache, then offline page
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for future offline use
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // When network fails, try to serve from cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If the request is for a page (HTML), return the offline page
            if (event.request.mode === 'navigate' || 
                (event.request.method === 'GET' && 
                 event.request.headers.get('accept').includes('text/html'))) {
              return caches.match(OFFLINE_PAGE);
            }
            
            // For other resources like images/css that aren't in cache, just fail
            console.log('[Service Worker] Resource not in cache:', event.request.url);
            throw new Error('Resource not in cache and network unavailable');
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
// Service Worker for Quran Tracker PWA

const CACHE_NAME = 'quran-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  // Add other assets that should be cached for offline use
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response from cache
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because it's a one-time use stream
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              // Store the fetched response in the cache
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return a fallback
        if (event.request.url.indexOf('/api/') !== -1) {
          // For API requests, we might want to use IndexedDB or return default data
          return new Response(JSON.stringify({ error: 'Offline mode - API unavailable' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
  );
});
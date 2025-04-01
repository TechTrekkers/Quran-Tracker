// Service Worker for Quran Tracker PWA

const CACHE_NAME = 'quran-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  // CSS and JS files will be captured during the fetch
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
  // Handle API requests differently as they should use IndexedDB when offline
  if (event.request.url.includes('/api/')) {
    // For API requests, let the application handle the offline logic
    // through the offlineApiClient.ts
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response from cache
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Don't cache non-success responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Don't cache if this is a dynamic API call
            if (response.url.includes('/api/')) {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // Store the fetched response in the cache
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Failed to cache response:', error);
              });
              
            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            
            // If we're trying to fetch an HTML page, return the cached home page as fallback
            if (event.request.headers.get('Accept')?.includes('text/html')) {
              return caches.match('/');
            }
            
            // For other resources, just let the error happen
            throw error;
          });
      })
  );
});
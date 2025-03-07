// Service Worker configuration
const CACHE_NAME = 'therapist-chatbot-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/styles.css',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a stream and can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // If fetch fails, return a fallback response for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // Otherwise, let the error propagate
          return Promise.reject(new Error('Failed to fetch'));
        });
      })
  );
}); 
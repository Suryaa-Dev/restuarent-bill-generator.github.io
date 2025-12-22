const CACHE_NAME = 'anand-pos-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 🔥 activate immediately
});

// Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ❌ NEVER cache Supabase / API requests
  if (url.origin.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});


// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // 🔥 control open tabs
});

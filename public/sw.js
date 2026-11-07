// public/sw.js
importScripts('/kds-push.js');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 🚫 DO NOT intercept fetch
// Let the browser handle all requests (Vite-safe)

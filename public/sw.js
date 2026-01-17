// public/sw.js
// Basic service worker to satisfy PWA install criteria
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A fetch handler is required for the PWA to be installable on Chrome.
  // This is a "no-op" fetch handler.
});

import { defaultCacheOnFront, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Cache-first for immutable static assets
      matcher: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Network-first for /api/* excluding mutations
      matcher: ({ url, request }) => {
        const isApi = url.pathname.startsWith("/api/");
        const isMutation =
          (url.pathname === "/api/chat" && request.method === "POST") ||
          (url.pathname === "/api/chats/all" && request.method === "DELETE");
        return isApi && !isMutation;
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      // Network-first for navigation/page requests with offline fallback
      matcher: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            handlerDidError: async () => {
              return caches.match("/offline");
            },
          },
        ],
      },
    },
    ...defaultCacheOnFront,
  ],
});

serwist.addEventListeners();

// Placeholder listeners for push and sync
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push Received.", event);
});

self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background Sync.", event);
});

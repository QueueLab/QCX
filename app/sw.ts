import { Serwist, CacheFirst, NetworkFirst } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: false,
  runtimeCaching: [
    {
      // Cache-first for immutable static assets
      matcher: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico)$/,
      handler: new CacheFirst({
        cacheName: "static-assets",
      }),
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
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 5,
      }),
    },
    {
      // Network-first for navigation/page requests with offline fallback
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          {
            handlerDidError: async () => {
              return caches.match("/offline");
            },
          },
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

// Placeholder listeners for push and sync
self.addEventListener("push", (event: any) => {
  console.log("[Service Worker] Push Received.", event);
});

self.addEventListener("sync", (event: any) => {
  console.log("[Service Worker] Background Sync.", event);
});

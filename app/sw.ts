import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// Cache-first strategy for navigation requests (HTML pages)
// This makes the PWA load instantly from cache
const navigationCacheFirst = {
  matcher: ({ request }: { request: Request }) => request.mode === "navigate",
  handler: new CacheFirst({
    cacheName: "pages-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
};

const serwist = new Serwist({
  // @ts-expect-error - __SW_MANIFEST is injected by Serwist
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false, // Disable since we're using CacheFirst for navigation
  runtimeCaching: [navigationCacheFirst, ...defaultCache],
});

serwist.addEventListeners();

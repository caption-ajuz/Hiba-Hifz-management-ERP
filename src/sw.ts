/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare let self: ServiceWorkerGlobalScope;

// Immediately activate new service workers for zero-lag app shell updates
self.skipWaiting();
clientsClaim();

// 1. App Shell & Static Bundle Pre-caching
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Serve cached App Shell for SPA navigations (excludes API and static files)
try {
  const appShellHandler = createHandlerBoundToURL('/index.html');
  const navigationRoute = new NavigationRoute(appShellHandler, {
    denylist: [/^\/api\//, /^\/uploads\//, /^\/socket\.io\//],
  });
  registerRoute(navigationRoute);
} catch {
  // In dev mode, index.html may not be in __WB_MANIFEST; fall back gracefully
}

// 2. Cache-First for Google Fonts stylesheets & webfonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'hyba-google-fonts-styles',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 15, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'hyba-google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// 3. Cache-First for static assets (images, avatars, logos, icons)
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'hyba-static-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// 4. Network-Only for Authentication, WebAuthn, and Health endpoints (never serve stale auth)
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/health/') ||
    url.pathname.startsWith('/socket.io/'),
  new NetworkOnly()
);

// 5. Stale-While-Revalidate for Dynamic Portal API GET Responses
// Renders cached content immediately while refreshing silently in the background
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/auth/') &&
    !url.pathname.startsWith('/api/health/'),
  new StaleWhileRevalidate({
    cacheName: 'hyba-api-swr-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
    ],
  })
);

// 6. Workbox Background Sync for offline API writes (POST/PUT/DELETE)
const apiMutationSyncPlugin = new BackgroundSyncPlugin('hyba-api-mutations', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({ queue }) => {
    let entry;
    let syncedCount = 0;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        syncedCount++;
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    if (syncedCount > 0) {
      await notifyClients({
        type: 'HYBA_BG_SYNC_COMPLETED',
        syncedCount,
        timestamp: Date.now(),
      });
    }
  },
});

for (const method of ['POST', 'PUT', 'DELETE'] as const) {
  registerRoute(
    ({ url }) =>
      url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/api/auth/') &&
      !url.pathname.startsWith('/api/upload/'),
    new NetworkOnly({
      plugins: [apiMutationSyncPlugin],
    }),
    method
  );
}

// Helper to broadcast messages to active Hyba windows
async function notifyClients(message: Record<string, unknown>) {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of allClients) {
    client.postMessage(message);
  }
}

// 7. Custom Background Sync event (flushes IndexedDB offline queue via client or directly)
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'hyba-offline-sync') {
    event.waitUntil(
      notifyClients({
        type: 'HYBA_TRIGGER_QUEUE_FLUSH',
        timestamp: Date.now(),
      })
    );
  }
});

// 8. Periodic Background Sync: silently refresh fresh portal content in cache
const PERIODIC_REFRESH_ENDPOINTS = [
  '/api/announcements',
  '/api/events',
  '/api/timetable',
  '/api/campuses',
  '/api/classes',
];

async function refreshPortalContentInBackground() {
  try {
    const cache = await caches.open('hyba-api-swr-cache');
    await Promise.allSettled(
      PERIODIC_REFRESH_ENDPOINTS.map(async (endpoint) => {
        const res = await fetch(endpoint, { credentials: 'include' });
        if (res.ok) {
          await cache.put(endpoint, res.clone());
        }
      })
    );
    await notifyClients({
      type: 'HYBA_PERIODIC_REFRESH_DONE',
      timestamp: Date.now(),
    });
  } catch {
    // Ignore background refresh network failures
  }
}

self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'hyba-portal-refresh') {
    event.waitUntil(refreshPortalContentInBackground());
  }
});

// Listen for explicit commands from app
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'PERIODIC_REFRESH_NOW') {
    event.waitUntil(refreshPortalContentInBackground());
  }
});

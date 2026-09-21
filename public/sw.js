/* Mother's Love PWA service worker.
 *
 * Keep this intentionally small. The live display depends on fresh API data,
 * so this worker does not intercept fetch requests or cache application/API
 * responses. Its purpose is to provide an installable PWA lifecycle without
 * changing the app's network behavior.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Harnessie service worker. It exists so browsers offer installation and
// caches nothing: the fetch listener never calls respondWith, so every
// request, event stream, and WebSocket goes to the network unchanged.
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', () => {})

/* eslint-disable no-restricted-globals */
const CACHE = 'tap-drink-v1';
const PRECACHE = ['/', '/manifest.json'];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch (network-first for API, cache-first for assets) ─────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) return; // skip API routes
  e.respondWith(
    caches.match(e.request).then((hit) => hit ?? fetch(e.request))
  );
});

// ── Push notification ─────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = { title: '💧 Time to hydrate!', body: 'Tap the bottle!' };
  try { data = e.data?.json() ?? data; } catch { /* use defaults */ }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: 'hydration-reminder',
      renotify: true,
      actions: [{ action: 'log', title: '💧 Log 250 ml' }],
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      if (list.length) {
        list[0].focus();
        if (e.action === 'log') list[0].postMessage({ type: 'LOG_DRINK' });
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

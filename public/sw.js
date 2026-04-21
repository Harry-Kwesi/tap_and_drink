/* eslint-disable no-restricted-globals */
const CACHE = 'tap-drink-v2';
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

// ── Fetch (Network-first for HTML, skip Next dev) ─────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Skip API routes, Next.js internal dev/build assets, and extensions
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/') || url.protocol === 'chrome-extension:') return;

  // Network-first for navigation (HTML)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first for other assets
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

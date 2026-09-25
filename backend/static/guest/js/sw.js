/* sw.js — ARMENU Service Worker: cache-first static, network-first API & 3D, offline fallback */
const CACHE_NAME = 'armenu-v3';
const STATIC_CACHE = 'armenu-static-v3';
const API_CACHE = 'armenu-api-v3';

const STATIC_ASSETS = [
  '/static/guest/css/theme.css',
  '/static/guest/css/menu.css',
  '/static/guest/css/ar.css',
  '/static/guest/js/i18n.js',
  '/static/guest/js/toast.js',
  '/static/guest/js/theme.js',
  '/static/guest/js/cart.js',
  '/static/guest/js/ws.js',
  '/static/guest/js/menu.js',
  '/static/guest/js/dish.js',
  '/static/guest/js/ar.js',
  '/static/guest/js/call.js',
  '/static/guest/js/order.js',
  '/static/guest/js/offline.js',
  '/static/guest/js/chatbot.js',
  '/static/common/js/logger.js',
  '/static/guest/img/dish-placeholder.svg',
  '/static/guest/icons/icon-192.png',
  '/static/guest/icons/icon-512.png',
  '/static/i18n/uz.json',
  '/static/i18n/ru.json',
  '/static/i18n/en.json',
];

// Install — static assets ni cache'ga saqlash
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — eski cache'larni tozalash
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== API_CACHE)
            .map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — strategiya: static cache-first, API network-first
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. WebSocket va boshqa protokollar: SW aralashmaydi
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.pathname.startsWith('/ws/')) {
    return;
  }

  // 2. Non-GET requests: to'g'ridan-to'g'ri tarmoqqa
  if (event.request.method !== 'GET') {
    return;
  }

  // 2.5 3D GLB Modellar — Network-first (yangilanishlar darhol ko'rinsin)
  if (url.pathname.endsWith('.glb')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Static assets — cache-first
  if (
      url.pathname.startsWith('/static/') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // 4. API — network-first, offline bo'lsa cache'dan
  if (url.pathname.startsWith('/v1/')) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.ok) {
          const clone = response.clone();
          caches.open(API_CACHE).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
        });
      })
    );
    return;
  }

  // 5. HTML Navigation / Boshqa sahifalar — network-first, fallback to cache, HECH QACHON undefined qaytarmaydi
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Offline — internet aloqasi yo\'q', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});

// Offline navbat — background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

async function syncOfflineOrders() {
  const cache = await caches.open('armenu-offline-orders');
  const keys = await cache.keys();
  for (const req of keys) {
    try {
      const body = await req.clone().text();
      const resp = await fetch('/v1/orders/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: body,
      });
      if (resp.ok) {
        await cache.delete(req);
        // Mijozga xabar berish
        const clients = await self.clients.matchAll();
        clients.forEach(c => c.postMessage({type: 'order-synced', ok: true}));
      }
    } catch(e) {
      // Offline — keyinroq sinab ko'ramiz
    }
  }
}

// Push notification (kelajak uchun)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'ARMENU', {
      body: data.body || '',
      icon: '/static/favicon.ico',
      badge: '/static/favicon.ico',
    })
  );
});

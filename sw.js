// ================================================================
//  sw.js - Service Worker لتشغيل التطبيق كـ PWA
//  الإصدار 1.0.0
// ================================================================

const CACHE_NAME = 'saloni-admin-v1.0.0';
const ASSETS = [
  '/',
  '/admin.html',
  '/index.html',
  '/display.html',
  '/offline.html',
  '/supabase-client.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ SW: Caching assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('✅ SW: Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات Supabase API
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // تجاهل طلبات Google Fonts و CDN
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com') ||
      event.request.url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // استراتيجية: Cache First ثم Network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // تحديث الخلفية
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                  });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { body: '📢 تحديث جديد في صالوني' };
  }

  const options = {
    body: data.body || '📢 تحديث جديد في صالوني',
    icon: '/icon-192.png',
    badge: '/icon-152.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/admin.html'
    },
    actions: [
      { action: 'open', title: 'فتح لوحة المدير' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('✂️ صالوني', options)
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    const url = event.notification.data.url || '/admin.html';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

console.log('✅ Service Worker loaded');

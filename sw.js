// ==============================================================
//  sw.js - Service Worker للتطبيق
//  - يدعم التحديث الفوري عبر Cache API
//  - يخزن الملفات الأساسية للعمل دون اتصال
//  - يستمع لأحداث push (لإشعارات لاحقة)
// ==============================================================

const CACHE_NAME = 'saloni-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/display.html',
  '/supabase-client.js',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png'
];

// ===== تثبيت SW =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Caching assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ===== تنشيط SW =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ===== استراتيجية Cache First مع تحديث الخلفية =====
self.addEventListener('fetch', event => {
  // تجاهل طلبات Supabase (API) لمنع التخزين المؤقت للبيانات الحساسة
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // تحديث الخلفية
          fetch(event.request).then(response => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, response.clone());
              });
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then(response => {
          // تخزين الملف الجديد في الكاش
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        }).catch(() => {
          // عرض صفحة الخطأ في حال عدم الاتصال
          return new Response('⚠️ لا يوجد اتصال بالإنترنت', { status: 503 });
        });
      })
  );
});

// ===== استقبال إشعارات push =====
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'صالوني';
  const options = {
    body: data.body || 'هناك تحديث جديد في حجزك',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [200, 100, 200],
    data: data.url || '/'
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ===== التعامل مع ضغط الإشعار =====
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

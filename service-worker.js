// service-worker.js
const CACHE_NAME = 'saloni-v1.0.1';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/display.html',
  '/supabase-client.js',
  '/manifest.json',
  '/offline.html',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ===== INSTALL =====
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

// ===== ACTIVATE =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('✅ Service Worker: Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', event => {
  // تجاهل طلبات Supabase API (تتعامل معها مباشرة دون كاش)
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // تجاهل طلبات Google Fonts و CDN (تتعامل معها مباشرة)
  if (event.request.url.includes('fonts.googleapis.com') || 
      event.request.url.includes('fonts.gstatic.com') ||
      event.request.url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // استراتيجية: Cache First ثم Network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // إذا كان الملف في الكاش، أعده (مع تحديث الخلفية)
        if (cachedResponse) {
          // تحديث الخلفية: جلب النسخة الجديدة وتخزينها مؤقتاً
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, networkResponse.clone());
                  });
              }
            })
            .catch(() => { /* تجاهل أخطاء الخلفية */ });
          return cachedResponse;
        }

        // وإلا، حاول جلب الملف من الشبكة
        return fetch(event.request)
          .then(response => {
            // تحقق من صحة الاستجابة
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // نسخ الاستجابة للتخزين المؤقت
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // إذا كان طلب HTML، قدم صفحة offline
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }
            // للطلبات الأخرى، قد نعيد استجابة فارغة أو نتركها تفشل
          });
      })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { body: 'هناك تحديث جديد في صالوني' };
  }

  const options = {
    body: data.body || 'هناك تحديث جديد في صالوني',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'فتح التطبيق'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('صالوني', options)
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open') {
    const url = event.notification.data.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
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

// ===== SYNC (للخلفية) =====
self.addEventListener('sync', event => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(
      // يمكن تنفيذ مزامنة البيانات في الخلفية
      console.log('🔄 Background sync: syncing appointments')
    );
  }
});

console.log('✅ Service Worker loaded successfully');

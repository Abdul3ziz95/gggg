// ==============================================================
//  SERVICE WORKER - صالوني
//  الإصدار 2.0 - يدعم التخزين المؤقت للملفات الأساسية
// ==============================================================

const CACHE_NAME = 'saloni-cache-v2';
const OFFLINE_URL = '/';

// الملفات الأساسية التي سيتم تخزينها مؤقتاً (بدون display.html)
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
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

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Caching files');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// تفعيل الـ Service Worker وحذف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('🗑 Service Worker: Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => self.clients.claim())
  );
});

// اعتراض الطلبات وتقديم الملفات المخزنة مؤقتاً
self.addEventListener('fetch', event => {
  // تجاهل طلبات Supabase (API) وملفات خارجية
  if (event.request.url.includes('supabase.co') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        // إذا لم يكن الملف في الكاش، حمله من الشبكة
        return fetch(event.request).catch(() => {
          // إذا كان الطلب لصفحة HTML، عرض صفحة غير متصل
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// تحديث الكاش في الخلفية (عند الاتصال)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

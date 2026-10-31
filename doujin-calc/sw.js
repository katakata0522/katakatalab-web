/**
 * sw.js (v1.5.0)
 * 同人即売会シミュレーター オフラインキャッシュ
 */

const CACHE_PREFIX = 'doujin-calc-';
const CACHE_NAME = 'doujin-calc-v1.5.3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/toast.js',
  './js/calculator.js?v=20261027-1',
  './js/legal-tax-data.js',
  './js/state.js',
  './js/renderer.js?v=20261027-1',
  './js/app.js?v=20261027-1',
  './js/lucide.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((networkRes) => {
      const copy = networkRes.clone();
      caches.open(CACHE_NAME).then((cache) => {
        if (e.request.url.startsWith('http')) cache.put(e.request, copy);
      });
      return networkRes;
    }).catch(() => caches.match(e.request).then((res) => res || caches.match('./index.html')))
  );
});

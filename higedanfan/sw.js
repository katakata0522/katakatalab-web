'use strict';
const CACHE_NAME = "higedanfan-pwa-96e84cc5eb2c8f18";
const CACHE_PREFIX = "higedanfan-pwa-";
const CORE_ASSETS = ["/higedanfan/","/higedanfan/manifest.webmanifest","/higedanfan/hige-mark.svg?v=34b8cc7","/higedanfan/hige-icon-192.png","/higedanfan/hige-icon-512.png","/higedanfan/hige-touch-180.png?v=cd4d0ca","/higedanfan/assets/jsx-runtime-Wy9s6hX0.js","/higedanfan/assets/tempoReviewStatus-Br_63qV_.js","/higedanfan/assets/setlist-yzqVZZH8.js","/higedanfan/assets/fanRecordStorage-BHRj6FOX.js","/higedanfan/assets/x-CcCbOfAa.js","/higedanfan/assets/quizSessionClear-BNXGu9Kp.js","/higedanfan/assets/preload-helper-BB3Jik1U.js","/higedanfan/assets/map-pin-DDxiGCUT.js","/higedanfan/assets/KurunIntroOverlay-hkzEI2iF.js","/higedanfan/assets/main-C5IGo4iO.js","/higedanfan/assets/main-DfR1Ad5P.css"];
const MAX_RUNTIME_ENTRIES = 80;
const NETWORK_TIMEOUT_MS = 4500;

function canonicalUrl(rawUrl) {
  const url = new URL(rawUrl, self.registration.scope);
  if (url.pathname.endsWith('/index.html')) {
    url.pathname = url.pathname.slice(0, -'index.html'.length);
  }
  return url;
}

const CORE_KEYS = new Set(
  CORE_ASSETS.map(asset => {
    const url = canonicalUrl(asset);
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.webmanifest')) {
      url.search = '';
    }
    return url.href;
  }),
);

function cacheKeyFor(request) {
  const url = canonicalUrl(request.url);
  url.hash = '';
  const bare = new URL(url.href);
  bare.search = '';
  if (request.mode === 'navigate' || CORE_KEYS.has(bare.href)) {
    url.search = '';
  }
  return url.href;
}

function offlineFallbackResponse() {
  return new Response(
    '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>オフライン｜115万キロのファンノート</title><body style="margin:0;padding:24px;font-family:sans-serif;background:#faf6eb;color:#253331;"><main style="max-width:480px;margin:40px auto;background:#fffdf8;border:1px solid #dfd7c7;border-radius:16px;padding:24px;"><h1 style="font-size:20px;margin:0 0 12px;">通信に接続できません</h1><p style="font-size:14px;line-height:1.7;margin:0 0 16px;">電波のよい場所で再読み込みすると、最新のページを開けます。</p><button type="button" onclick="location.reload()" style="padding:10px 18px;border-radius:10px;border:none;background:#253331;color:#faf6eb;font-size:14px;cursor:pointer;">再読み込み</button></main></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

async function fetchBounded(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function storeSafely(cache, key, response) {
  if (!cache || !response || !response.ok || response.type !== 'basic') return;
  try {
    await cache.put(key, response.clone());
    const keys = await cache.keys();
    const extra = keys.filter(req => !CORE_KEYS.has(cacheKeyFor(req)));
    for (const obsolete of extra.slice(0, Math.max(0, extra.length - MAX_RUNTIME_ENTRIES))) {
      await cache.delete(obsolete);
    }
  } catch {
    // 端末の保存容量上限でも表示を失敗させない。
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map(name => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/higedanfan/')) return;
  if (url.pathname === '/higedanfan/sw.js') return;

  const isNavigation = request.mode === 'navigate';
  const isHashedAsset = url.pathname.startsWith('/higedanfan/assets/');
  const isManifest = request.destination === 'manifest' || url.pathname.endsWith('/manifest.webmanifest');
  if (!isNavigation && !isHashedAsset && !isManifest && !['style', 'script', 'image', 'font'].includes(request.destination)) {
    return;
  }

  const key = cacheKeyFor(request);

  if (isHashedAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME).catch(() => null);
      if (cache) {
        const cached = await cache.match(key).catch(() => undefined);
        if (cached) return cached;
      }
      const response = await fetch(request);
      if (cache) {
        event.waitUntil(storeSafely(cache, key, response));
      }
      return response;
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME).catch(() => null);
    try {
      const response = await fetchBounded(request);
      if (response.status >= 500 && isNavigation) {
        throw new Error('Server error during navigation');
      }
      if (cache) {
        event.waitUntil(storeSafely(cache, key, response));
      }
      return response;
    } catch {
      if (cache) {
        const cached = await cache.match(key).catch(() => undefined);
        if (cached) return cached;
        if (isNavigation) {
          const homeCached = await cache.match(canonicalUrl('/higedanfan/').href).catch(() => undefined);
          if (homeCached) return homeCached;
        }
      }
      if (isNavigation) return offlineFallbackResponse();
      return Response.error();
    }
  })());
});

'use strict';

const CACHE_PREFIX = 'screenshot-crop-';
const STATIC_CACHE = 'screenshot-crop-static-20261121-versioned-shell';
const NETWORK_TIMEOUT_MS = 4000;
const APP_SCOPE_PATH = '/screenshot-crop/';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './theme.js',
  './core.js',
  './device-profiles.js',
  './crop-presets.js',
  './redaction.js',
  './frame.js',
  './image.js',
  './preview.js',
  './zip.js',
  './sample.js',
  './script.js',
  './pwa.js',
  './manifest.webmanifest',
  './pwa-icon.svg'
];

// The publisher stamps STATIC_CACHE from the exact shell bytes. A fresh install
// must request that release from the CDN as well as use a fresh local cache.
const installedUrls = new Map(CORE_ASSETS.map(asset => {
  const url = new URL(asset, self.registration.scope);
  url.searchParams.set('v', STATIC_CACHE);
  return [url.pathname, url.href];
}));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([...installedUrls.values()].map((url) => new Request(
        url, { cache: 'reload' }
      ))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(APP_SCOPE_PATH)) return;
  const installedUrl = installedUrls.get(url.pathname);
  const cacheKey = installedUrl || request;

  event.respondWith((async () => {
    // A complete installed app must start without waiting for the network.
    // Keep the installed shell together until the user accepts a new worker.
    let cache;
    try {
      cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const fallback = await cache.match(installedUrls.get(APP_SCOPE_PATH));
        if (fallback) return fallback;
      }
    } catch {
      // Storage failures must not prevent an online launch.
    }

    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Network timeout'));
        }, NETWORK_TIMEOUT_MS);
      });
      const network = await Promise.race([
        fetch(installedUrl || request, { signal: controller.signal }),
        timeout
      ]);
      // Return the response immediately; cache writes never block rendering.
      if (network.ok && cache) {
        event.waitUntil(
          cache.put(cacheKey, network.clone()).catch(() => {})
        );
      }
      return network;
    } catch {
      if (request.mode === 'navigate') {
        return new Response(
          '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>スクショ端カット</title><body><h1>接続を確認してください</h1><p>画面を読み込めませんでした。通信が戻ったら、もう一度開いてください。</p><button onclick="location.reload()">再読み込み</button></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      return Response.error();
    } finally {
      clearTimeout(timer);
    }
  })());
});

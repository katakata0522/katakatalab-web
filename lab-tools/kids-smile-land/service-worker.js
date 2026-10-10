const CACHE_PREFIX = 'smile-land-v';
const CACHE_NAME = 'smile-land-v2-20260818';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './tailwind-built.css',
  './app.js',
  './manifest.json',
  './kiwimaru-400.woff2',
  './kiwimaru-500.woff2',
  './icon-192.png',
  './icon-512.png'
];

// インストール時にキャッシュを生成

// 起動は保存済みの同じ版を優先し、通信・容量不足・他アプリ干渉を共通処理で防ぐ。
importScripts('/pwa-runtime.js');
self.PwaRuntime.configure({
  cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ASSETS,
});

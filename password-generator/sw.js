// Service Worker for Password Gen
const CACHE_PREFIX = 'password-gen-';
const CACHE_NAME = 'password-gen-v24';
const RUNTIME_CACHE = 'password-gen-runtime-v5';
const ASSETS = [
    './',
    './index.html',
    './style.css?v=20261121-tools',
    './script.js?v=20261121-tools',
    './pwd-logic.js',
    './vault.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// インストール時: キャッシュを作成 + 即座にアクティブ化

// 起動は保存済みの同じ版を優先し、通信・容量不足・他アプリ干渉を共通処理で防ぐ。
importScripts('/pwa-runtime.js?v=20261121-tools');
self.PwaRuntime.configure({
  versionedPrecache: true,
  autoUpdate: false,
  cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ASSETS,
});

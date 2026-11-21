'use strict';

const CACHE_PREFIX = 'qrcode-';
const STATIC_CACHE = 'qrcode-static-v31';
const RUNTIME_CACHE = 'qrcode-runtime-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './guides.html',
  './pro-plan.html',
  './guide-wifi.html',
  './guide-line.html',
  './guide-vcard.html',
  './guide-mail.html',
  './guide-social.html',
  './guide-print.html',
  './lp-restaurant.html',
  './lp-beauty.html',
  './lp-events.html',
  './style.css',
  './style.css?v=20261121-tools',
  './content.css',
  './script.js',
  './script.js?v=20261121-tools',
  './vendor/qrious.min.js',
  './vendor/jszip.min.js',
  './vendor/jspdf.umd.min.js',
  './js/pwa.js',
  './js/pwa.js?v=20261119-review',
  './js/pro-config.js',
  './js/details-ui.js',
  './manifest.webmanifest',
  './ogp.png',
  './THIRD_PARTY_NOTICES.txt',
  './robots.txt',
  './sitemap.xml',
  './terms.html',
  './privacy.html',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// 起動は保存済みの同じ版を優先し、通信・容量不足・他アプリ干渉を共通処理で防ぐ。
importScripts('/pwa-runtime.js?v=20261121-tools');
self.PwaRuntime.configure({
  versionedPrecache: true,
  cacheName: STATIC_CACHE, cachePrefix: CACHE_PREFIX, assets: STATIC_ASSETS,
});

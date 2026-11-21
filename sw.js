const CACHE_NAME = 'katakatalab-v25';
const CACHE_PREFIX = 'katakatalab-';
const ASSETS = [
    './',
    './index.html',
    './style.css?v=20261121-other-works',
    './script.js',
    './project-filter-state.js',
    './project-history.js',
    './projects.json',
    './offline.html',
    './manifest.json',
    './terms.html',
    './privacy.html',
    './other-projects.html',
    './about-katakatalab.html',
    './who-is-katakata.html',
    './icon.svg',
    './icon-192.png',
    './icon-512.png',
    './ogp.svg',
    './discount-calc/', './discount-calc/index.html', './discount-calc/style.css?v=20261121-tools', './discount-calc/script.js?v=20261121-tools', './discount-calc/manifest.json'
];

// Install Service Worker

// 起動は保存済みの同じ版を優先し、通信・容量不足・他アプリ干渉を共通処理で防ぐ。
importScripts('/pwa-runtime.js?v=20261121-tools');
self.PwaRuntime.configure({
  // 利用中の旧版を維持し、対象画面を閉じた後に更新を有効化する。
  autoUpdate: false,
  versionedPrecache: true,
  cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ASSETS,
  fallbackAsset: './offline.html',
  excludedPaths: [
    "/asobi-pocket/", "/schedule-gen/", "/composer/", "/pikalab/",
    "/higedanfan", "/screenshot-crop/", "/qrcode/",
    "/password-generator/", "/emphasis-lines/", "/doujin-calc/",
    "/motion-atlas/",
    "/lab-tools/gravity-todo/", "/lab-tools/kids-smile-land/",
  ],
});

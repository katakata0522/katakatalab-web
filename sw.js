const CACHE_NAME = 'katakatalab-v16';
const CACHE_PREFIX = 'katakatalab-';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './project-filter-state.js',
    './project-history.js',
    './projects.json',
    './offline.html',
    './manifest.json',
    './terms.html',
    './privacy.html',
    './gear.html',
    './about-katakatalab.html',
    './who-is-katakata.html',
    './icon.svg',
    './icon-192.png',
    './icon-512.png',
    './ogp.svg',
    './discount-calc/', './discount-calc/index.html', './discount-calc/style.css', './discount-calc/script.js', './discount-calc/manifest.json'
];

// Install Service Worker

// 起動は保存済みの同じ版を優先し、通信・容量不足・他アプリ干渉を共通処理で防ぐ。
importScripts('/pwa-runtime.js');
self.PwaRuntime.configure({
  // 利用中の旧版を維持し、対象画面を閉じた後に更新を有効化する。
  autoUpdate: false,
  cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ASSETS,
  fallbackAsset: './offline.html', excludedPaths: ["/asobi-pocket/","/schedule-gen/","/composer/","/pikalab/","/screenshot-crop/","/qrcode/","/password-generator/","/emphasis-lines/","/lab-tools/gravity-todo/","/lab-tools/kids-smile-land/"],
});

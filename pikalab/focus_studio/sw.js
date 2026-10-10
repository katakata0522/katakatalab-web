// Service Worker for Focus Studio PWA
const CACHE_NAME = 'focus-studio-v5';
const CACHE_PREFIX = 'focus-studio-';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './tailwind.generated.css',
    './style.css',
    './script.js',
    './assets/tone-14.8.49.js',
    './favicon.png',
    './manifest.json',
    '../pwa-runtime.js'
];


// 保存済みのシェルを即座に返し、更新の失敗時は旧版を保つ。
importScripts('../pwa-runtime.js');
self.PwaRuntime.configure({
    cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ASSETS_TO_CACHE, autoUpdate: false,
});

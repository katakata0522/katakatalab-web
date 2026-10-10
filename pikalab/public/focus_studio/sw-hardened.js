// Focus Studio hardened Service Worker
const CACHE_PREFIX = 'focus-studio-';
const CACHE_NAME = `${CACHE_PREFIX}v6`;
const NETWORK_TIMEOUT_MS = 4500;

const ESSENTIAL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './runtime-hardening.js',
    './favicon.png',
    './manifest.json',
    '../pwa-runtime.js',
    '../style.css',
    '../js/tone-loader.js'
];


// 保存済みのシェルを即座に返し、更新の失敗時は旧版を保つ。
importScripts('../pwa-runtime.js');
self.PwaRuntime.configure({
    cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ESSENTIAL_ASSETS, autoUpdate: false,
});

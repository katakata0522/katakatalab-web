/* タイピング道場 オフラインキャッシュ */
const CACHE_NAME = 'typing-dojo-v3';
const CACHE_PREFIX = 'typing-dojo-';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './typing-core.js',
    '../data/idioms.js',
    '../pwa-runtime.js'
];


importScripts('../pwa-runtime.js');
self.PwaRuntime.configure({ cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ASSETS });

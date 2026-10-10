const CACHE_PREFIX = 'spacelab-cache-';
const CACHE_NAME = 'spacelab-cache-v4';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './data.js',
    './config.js',
    './state.js',
    './audio-manager.js',
    './canvas-renderer.js',
    './ui-controller.js',
    './assets/background.png',
    './assets/sun.png',
    './assets/mercury.png',
    './assets/venus.png',
    './assets/earth.png',
    './assets/mars.png',
    './assets/jupiter.png',
    './assets/saturn.png',
    './assets/uranus.png',
    './assets/neptune.png',
    './assets/ufo.png',
    './assets/spaceship.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
});

self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

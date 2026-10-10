/**
 * Service Worker - EmphasisLinesStudio PWA
 * オフライン対応のキャッシュ戦略
 */

const CACHE_NAME = 'emphasis-lines-v20260922-1';
const CACHE_PREFIX = 'emphasis-lines-';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/tailwind.built.css?v=20260613-2',
    './css/style.css?v=20260824-responsive',
    './js/app.js?v=20260613-2',
    './js/constants.js?v=20260613-2',
    './js/state.js?v=20260613-2',
    './js/ui.js?v=20260613-2',
    './js/renderers/renderer.js?v=20260613-2',
    './js/services/ExportService.js?v=20260613-2',
    './js/services/ImageService.js?v=20260613-2',
    './js/managers/BatchManager.js?v=20260613-2',
    './js/managers/ToastManager.js?v=20260613-2',
    './js/managers/index.js?v=20260613-2',
    './js/utils/analytics.js?v=20260613-2',
    './js/utils/random.js?v=20260613-2',
    './js/utils/validation.js?v=20260613-2',
    './manifest.json',
    './icons/icon.svg'
];

// Install: キャッシュにアセットを格納

// 起動は保存済みの同じ版を優先し、通信・容量不足・他アプリ干渉を共通処理で防ぐ。
importScripts('/pwa-runtime.js');
self.PwaRuntime.configure({
  cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ASSETS_TO_CACHE,
});

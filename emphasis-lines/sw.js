/**
 * Service Worker - EmphasisLinesStudio PWA
 * オフライン対応のキャッシュ戦略
 */

const CACHE_NAME = 'emphasis-lines-v20261121-versioned-controls';
const CACHE_PREFIX = 'emphasis-lines-';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/tailwind.built.css?v=20261010-1',
    './css/style.css?v=20261121-controls',
    './js/app.js?v=20261119-review',
    './js/constants.js?v=20261119-review',
    './js/state.js?v=20261119-review',
    './js/ui.js?v=20261119-review',
    './js/renderers/renderer.js?v=20261119-review',
    './js/services/ExportService.js?v=20261119-review',
    './js/services/ImageService.js?v=20261119-review',
    './js/managers/BatchManager.js?v=20261119-review',
    './js/managers/ToastManager.js?v=20261119-review',
    './js/managers/index.js?v=20261119-review',
    './js/utils/analytics.js?v=20261119-review',
    './js/utils/random.js?v=20261119-review',
    './js/utils/validation.js?v=20261119-review',
    './manifest.json',
    './icons/icon.svg'
];

// Install: キャッシュにアセットを格納

// 起動は保存済みの同じ版を優先し、通信・容量不足・他アプリ干渉を共通処理で防ぐ。
importScripts('/pwa-runtime.js?v=20261121-tools');
self.PwaRuntime.configure({
  versionedPrecache: true,
  cacheName: CACHE_NAME, cachePrefix: CACHE_PREFIX, assets: ASSETS_TO_CACHE,
});

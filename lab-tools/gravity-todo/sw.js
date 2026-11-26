const APP_SHELL_CACHE_PREFIX = 'gravity-todo-app-v';
const APP_SHELL_CACHE = 'gravity-todo-app-v26';
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './style.css?v=20261121-task-controls',
  './icon.svg',
  './vendor/matter.min.js',
  './src/persistPolicy.js',
  './src/main.js?v=20261121-task-controls',
  './src/taskText.js',
  './src/PhysicsEngine.js?v=20261121-task-controls',
  './src/ParticleSystem.js',
  './src/SoundManager.js',
  './src/StorageManager.js',
  './src/UIManager.js?v=20261121-task-controls',
  './src/TaskRenderer.js',
  './src/InteractionManager.js',
  './src/SettingsManager.js',
  './src/TaskDetailPanel.js?v=20261121-task-controls',
  './src/BGMManager.js',
  './src/GyroManager.js',
  './src/TimeTheme.js'
];

// 起動は保存済みの同じ版を優先し、通信・容量不足・他アプリ干渉を共通処理で防ぐ。
importScripts('/pwa-runtime.js?v=20261121-tools');
self.PwaRuntime.configure({
  cacheName: APP_SHELL_CACHE, cachePrefix: APP_SHELL_CACHE_PREFIX, assets: APP_SHELL_URLS, versionedPrecache: true,
});

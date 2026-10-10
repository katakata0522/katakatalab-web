import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import htmlBuildInputs from './scripts/html-build-inputs.cjs'

const { getHtmlInputs } = htmlBuildInputs;

function normalizeHtmlPath(context) {
  return String(context?.filename || context?.path || '').replace(/\\/g, '/');
}

function isLabPage(context, directoryName) {
  const htmlPath = normalizeHtmlPath(context);
  return htmlPath.endsWith(`/${directoryName}/index.html`);
}

function hasScript(html, source) {
  return html.includes(`src="${source}"`) || html.includes(`src='${source}'`);
}

function pikalabLearningEvolution() {
  return {
    name: 'pikalab-learning-evolution',
    transformIndexHtml(html, context) {
      // 外部フォントが応答しなくても、ラボの起動を止めない。
      html = html.replace(/<link\b[^>]*>/gi, tag => {
        if (!/href=["']https:\/\/fonts\.googleapis\.com\//i.test(tag) || !/rel=["']stylesheet["']/i.test(tag)) return tag;
        return tag.replace(/\s*\/?\>$/, ' media="print" onload="this.media=\'all\'">');
      });
      const tags = [];

      if (isLabPage(context, 'fraction_lab') && !hasScript(html, './concept-evolution.js')) {
        tags.push({
          tag: 'script',
          attrs: { src: './concept-evolution.js', defer: true },
          injectTo: 'body'
        });
      }

      if (isLabPage(context, 'speed_reader')) {
        const speedScripts = [
          './js/constants.js',
          './js/app.js?v=20261003-speed1',
          './js/comprehension.js?v=20261003-speed1'
        ];

        speedScripts.forEach((source) => {
          if (!hasScript(html, source)) {
            tags.push({
              tag: 'script',
              attrs: { src: source, defer: true },
              injectTo: 'body'
            });
          }
        });
      }

      return { html, tags };
    }
  };
}


function pwaPrecacheAssets() {
  let outputRoot;
  // コピー後にWorkboxが走査する。公開済みのPWA資産だけを明示し、内部資料を含めない。
  const assets = [
    'focus_studio/manifest.json', 'space_lab/manifest.json', 'science_maker/manifest.json',
    'science_maker/script.js', 'science_maker/script-core.js', 'science_maker/summer-support.js',
    'science_maker/topics.js', 'js/qrcode.min.js'
  ];
  return {
    name: 'pikalab-pwa-precache-assets',
    configResolved(config) { outputRoot = path.resolve(config.root, config.build.outDir); },
    writeBundle() {
      for (const relative of assets) {
        const destination = path.join(outputRoot, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(__dirname, relative), destination);
      }
    }
  };
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: getHtmlInputs(__dirname),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 3099
  },
  plugins: [
    pikalabLearningEvolution(),
    pwaPrecacheAssets(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      // 自動の相対パス注入は使わず、各入口で登録先を明示する
      injectRegister: false,
      // ルートと各ラボのmanifestを参照HTMLが明示する
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        importScripts: ['education-sw-privacy.js'],
        // アプリ本体だけを先読みし、大型画像・音声は必要時に取得する
        globPatterns: ['**/*.{js,css,html,ico,svg,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        // 利用中のラボのコードと保存版を混ぜず、閉じた後に切り替える。
        skipWaiting: false,
        clientsClaim: true,
        // 複数ページ構成なので、各ラボへの遷移をトップHTMLへ置き換えない
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pikalab-google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.href.startsWith(self.registration.scope) && /\.(?:png|jpg|jpeg|svg|webp)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pikalab-images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.href.startsWith(self.registration.scope) && /\.(?:js|css)$/i.test(url.pathname) && !/\/(?:sw|sw-hardened|service-worker|pwa-runtime)\.js$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pikalab-static-resources-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ]
})


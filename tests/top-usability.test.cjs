const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { repositoryRoot } = require('./helpers/repository.cjs');

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

test('トップページに検索補助、最近使ったもの、安全な共有導線がある', () => {
  const html = read('index.html');
  const script = read('script.js');

  assert.match(html, /id="search-suggestions"/);
  assert.match(html, /id="recent-projects"/);
  assert.match(html, /id="project-share-row"/);
  assert.match(html, /aria-keyshortcuts="\/"/);
  assert.match(html, /project-history\.js/);
  assert.match(script, /getProjectSearchSuggestions/);
  assert.match(script, /recordRecentProject/);
  assert.match(script, /navigator\.clipboard/);
  assert.match(script, /projects\.json\?v=/);
  assert.match(script, /noResults\.classList\.add\('visible'\)/);
});



test('ルートService WorkerはKatakataLab自身の旧キャッシュだけを削除する', async () => {
  const source = read('sw.js');
  const currentCache = source.match(/const CACHE_NAME = '([^']+)'/)?.[1];
  assert.ok(currentCache, 'ルートService WorkerのCACHE_NAMEが必要です');

  const listeners = new Map();
  const deleted = [];
  const context = {
    self: {
      addEventListener(type, listener) { listeners.set(type, listener); },
      skipWaiting() {},
      clients: { claim: async () => undefined },
      location: { origin: 'https://katakatalab.com' },
      registration: { scope: 'https://katakatalab.com/' },
    },
    caches: {
      open: async () => ({ addAll: async () => undefined, put: async () => undefined }),
      keys: async () => [
        currentCache,
        'katakatalab-old-test',
        'focus-studio-v5',
        'typing-dojo-v3',
        'workbox-precache-test',
      ],
      delete: async (name) => { deleted.push(name); return true; },
      match: async () => null,
    },
    fetch: async () => ({ ok: true, clone() { return this; } }),
    URL,
    console,
  };

  vm.createContext(context);
  context.importScripts = () => vm.runInContext(read('pwa-runtime.js'), context);
  vm.runInContext(source, context, { filename: 'sw.js' });
  const activate = listeners.get('activate');
  assert.equal(typeof activate, 'function');

  let activation;
  activate({ waitUntil(promise) { activation = promise; } });
  await activation;

  assert.deepEqual(deleted, ['katakatalab-old-test']);
});

test('主要ツールからトップへ戻る導線がpx/rem変換にもある', () => {
  assert.match(read('px-rem-converter/index.html'), /breadcrumbs-tool/);
  assert.match(read('px-rem-converter/index.html'), /href="\.\.\/"/);
});

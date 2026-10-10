'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const workers = [["sw.js","CACHE_NAME","ASSETS"],["qrcode/sw.js","STATIC_CACHE","STATIC_ASSETS"],["emphasis-lines/sw.js","CACHE_NAME","ASSETS_TO_CACHE"],["password-generator/sw.js","CACHE_NAME","ASSETS"],["lab-tools/gravity-todo/sw.js","APP_SHELL_CACHE","APP_SHELL_URLS"],["lab-tools/kids-smile-land/service-worker.js","CACHE_NAME","ASSETS"],["pikalab/focus_studio/sw.js","CACHE_NAME","ASSETS_TO_CACHE"],["pikalab/public/focus_studio/sw-hardened.js","CACHE_NAME","ESSENTIAL_ASSETS"],["pikalab/typing_dojo/sw.js","CACHE_NAME","ASSETS"]];
const pending = () => new Promise(() => {});
function response(label) { return { label, ok: true, status: 200, type: 'basic', clone() { return this; }, arrayBuffer: async () => new ArrayBuffer(0) }; }
function runtime(file, { entries = new Map(), network = async () => response('fresh'), openFailure = false, installFailure = false, put = async () => {}, fastTimeout = false } = {}) {
  const directory = file.replace('pikalab/public/', 'pikalab/').replace(/[^/]+$/, '');
  const scope = 'https://katakatalab.com/' + directory;
  const handlers = new Map(), background = [], installs = [], fetches = [];
  let skipWaiting = 0;
  const cache = { match: async key => entries.get(typeof key === 'string' ? key : key.url),
    addAll: async requests => { installs.push(requests); if (installFailure) throw new Error('install failed'); },
    put: async (key, value) => { await put(); entries.set(key, value); },
    keys: async () => [...entries.keys()].map(url => new Request(url)), delete: async key => entries.delete(key.url) };
  const context = { URL, Request, Response, Set, AbortController,
    setTimeout: fastTimeout ? callback => setImmediate(callback) : setTimeout,
    clearTimeout: fastTimeout ? clearImmediate : clearTimeout,
    self: { registration: { scope }, location: { origin: 'https://katakatalab.com' }, clients: { claim: async () => {} },
      skipWaiting: async () => { skipWaiting++; }, addEventListener: (type, handler) => handlers.set(type, [...(handlers.get(type) || []), handler]) },
    caches: { open: async () => { if (openFailure) throw new Error('quota'); return cache; }, keys: async () => [], delete: async () => true },
    fetch: (request, options) => { fetches.push(request); return network(request, options); } };
  vm.createContext(context);
  context.importScripts = url => vm.runInContext(fs.readFileSync(path.join(root, /education-sw-privacy/.test(url) ? 'education-sw-privacy.js' : 'pwa-runtime.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  return { scope, entries, installs, fetches, background, get skipWaiting() { return skipWaiting; },
    install() { let done; for (const handler of handlers.get('install')) handler({ waitUntil: promise => { done = promise; } }); return done; },
    async fetch(relative, { mode = 'navigate', destination = 'document', method = 'GET' } = {}) {
      let done, stopped = false;
      for (const handler of handlers.get('fetch')) {
        if (stopped) break;
        handler({ request: { url: new URL(relative, scope).href, method, mode, destination },
          stopImmediatePropagation: () => { stopped = true; },
          waitUntil: promise => background.push(promise), respondWith: promise => { done = promise; } });
      }
      return done;
    } };
}
for (const [file] of workers) {
  test(file + ': 他origin・POST・APIの通信に介入しない', async () => {
    const app = runtime(file);
    assert.equal(await app.fetch('https://example.com/index.html'), undefined);
    assert.equal(await app.fetch('./save', { method: 'POST' }), undefined);
    assert.equal(await app.fetch('./api', { mode: 'cors', destination: '' }), undefined);
  });
  test(file + ': 完全な必須資産だけで更新し、失敗を有効化しない', async () => {
    const ok = runtime(file); await ok.install();
    assert.ok(ok.installs[0].every(request => request.cache === 'reload'));
    assert.equal(new Set(ok.installs[0].map(request => request.url)).size, ok.installs[0].length);
    const failed = runtime(file, { installFailure: true });
    await assert.rejects(failed.install(), /install failed/);
    assert.equal(failed.skipWaiting, 0);
  });
  test(file + ': 通信停滞でも保存済み画面は即座に開く', async () => {
    const app = runtime(file, { network: pending });
    const cached = response('cached');
    app.entries.set(app.scope, cached);
    const marker = Symbol('pending');
    assert.equal(await Promise.race([app.fetch('./?launch=1'), new Promise(resolve => setImmediate(() => resolve(marker)))]), cached);
    assert.equal(app.fetches.length, 0);
  });
  test(file + ': 通信・本文の停滞は上限で自分の入口へ戻り、scriptにはHTMLを返さない', async () => {
    for (const network of [pending, async () => ({ ...response('headers'), clone: () => ({ arrayBuffer: pending }) })]) {
      const app = runtime(file, { network, fastTimeout: true });
      const cached = response('own-entry');
      app.entries.set(app.scope, cached);
      const result = await app.fetch('./missing.html');
      if (file === 'sw.js') assert.equal(result.status, 503); else assert.equal(result, cached); 
      // ルートだけはoffline.htmlを使うため、初回失敗は503の再試行画面になる。
    }
    const app = runtime(file, { network: pending, fastTimeout: true });
    assert.equal((await app.fetch('./missing.js', { mode: 'cors', destination: 'script' })).type, 'error');
  });
  test(file + ': 保存容量不足・保存停滞でも正常な取得結果を返す', async () => {
    for (const options of [{ openFailure: true }, { put: pending }]) {
      const app = runtime(file, options);
      const result = await Promise.race([app.fetch('./new.html'), new Promise(resolve => setImmediate(() => resolve(null)))]);
      assert.equal(result.label, 'fresh');
    }
  });
}
test('KatakataLab本体は利用中の画面を更新で差し替えず、閉じるまで旧版を使う', async () => {
  const app = runtime('sw.js');
  await app.install();
  assert.equal(app.skipWaiting, 0);
});

test('index.htmlの起動先と正規ディレクトリURLは同じ先読みを使い、転送応答を保存しない', async () => {
  for (const [file] of workers) {
    const app = runtime(file, { network: pending });
    await app.install();
    assert.ok(app.installs[0].some(request => request.url === app.scope), file);
    assert.ok(app.installs[0].every(request => !new URL(request.url).pathname.endsWith('/index.html')), file);
    const cached = response('canonical-shell');
    app.entries.set(app.scope, cached);
    assert.equal(await app.fetch('./index.html?standalone=1'), cached, file);
    assert.equal(app.fetches.length, 0, file);
  }
});
test('ルートPWAは個別アプリの画面とAPI通信に介入しない', async () => {
  const app = runtime('sw.js');
  for (const url of ['pikalab/', 'qrcode/', 'password-generator/', 'screenshot-crop/', 'lab-tools/gravity-todo/']) assert.equal(await app.fetch(url), undefined);
  assert.equal(await app.fetch('/api/data', { destination: '', mode: 'cors' }), undefined);
});
test('動的資産の異なるquery版を同じcacheへ混ぜない', async () => {
  const app = runtime('qrcode/sw.js');
  const old = response('old');
  app.entries.set(new URL('./dynamic.js?v=old', app.scope).href, old);
  assert.equal((await app.fetch('./dynamic.js?v=new', { destination: 'script', mode: 'cors' })).label, 'fresh');
});

test('root PWAはキャッシュされた旧共通ローダーを返さず、教育PWAは空の応答で実行を止める', async () => {
  const normal = runtime('sw.js');
  normal.entries.set('https://katakatalab.com/analytics.js', response('stale-analytics'));
  assert.equal(await normal.fetch('/analytics.js', { mode: 'cors', destination: 'script' }), undefined);
  for (const file of ['lab-tools/kids-smile-land/service-worker.js', 'pikalab/typing_dojo/sw.js']) {
    const education = runtime(file);
    const result = await education.fetch('/analytics.js', { mode: 'cors', destination: 'script' });
    assert.equal(await result.text(), '');
    assert.equal(education.fetches.length, 0);
  }
});


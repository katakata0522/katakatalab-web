'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repositoryRoot = path.resolve(__dirname, '..');

const CACHE_PREFIX_BY_FILE = new Map([
  ['doujin-calc/sw.js', 'doujin-calc-'],
  ['emphasis-lines/sw.js', 'emphasis-lines-'],
  ['lab-tools/gravity-todo/sw.js', 'gravity-todo-app-v'],
  ['lab-tools/kids-smile-land/service-worker.js', 'smile-land-v'],
  ['password-generator/sw.js', 'password-gen-'],
  ['pikalab/focus_studio/sw.js', 'focus-studio-'],
  ['pikalab/space_lab/sw.js', 'spacelab-cache-'],
  ['pikalab/typing_dojo/sw.js', 'typing-dojo-'],
  ['qrcode/sw.js', 'qrcode-'],
  ['screenshot-crop/sw.js', 'screenshot-crop-'],
  ['sw.js', 'katakatalab-'],
]);

const SKIPPED_DIRECTORIES = new Set([
  '.git', '_archive', 'node_modules', 'dist', 'public-build', 'tests',
  'scratch', 'temp-artifacts', 'visual-guard-artifacts',
]);

function discoverServiceWorkers(directory = repositoryRoot, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      discoverServiceWorkers(absolutePath, output);
      continue;
    }
    if (!entry.isFile() || !/^(?:sw|service-worker)\.js$/i.test(entry.name)) continue;
    output.push(path.relative(repositoryRoot, absolutePath).split(path.sep).join('/'));
  }
  return output.sort();
}

async function runActivate(relativePath, cacheKeys) {
  const source = fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
  const listeners = new Map();
  const deleted = [];
  const context = {
    self: {
      addEventListener(type, listener) { listeners.set(type, listener); },
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined },
      location: { origin: 'https://katakatalab.com' },
      registration: { scope: 'https://katakatalab.com/example/' },
    },
    caches: {
      keys: async () => cacheKeys,
      delete: async (name) => { deleted.push(name); return true; },
      open: async () => ({
        add: async () => undefined,
        addAll: async () => undefined,
        put: async () => undefined,
        match: async () => null,
      }),
      match: async () => null,
    },
    fetch: async () => ({ ok: true, status: 200, type: 'basic', clone() { return this; } }),
    Request: class Request {},
    URL,
    console,
  };

  vm.createContext(context);
  context.importScripts = () => vm.runInContext(fs.readFileSync(path.join(repositoryRoot, 'pwa-runtime.js'), 'utf8'), context);
  vm.runInContext(source, context, { filename: relativePath });
  const activate = listeners.get('activate');
  assert.equal(typeof activate, 'function', `${relativePath}: activate handler`);

  let activation;
  activate({ waitUntil(promise) { activation = promise; } });
  if (activation) await activation;
  return deleted;
}

test('同一オリジンのService Workerは自分の旧キャッシュだけを削除する', async () => {
  const discovered = discoverServiceWorkers();
  assert.deepEqual(
    discovered,
    [...CACHE_PREFIX_BY_FILE.keys()].sort(),
    'Service Workerを追加・削除した場合はキャッシュ所有prefixを明示してください',
  );

  for (const relativePath of discovered) {
    const ownPrefix = CACHE_PREFIX_BY_FILE.get(relativePath);
    const ownOldCache = `${ownPrefix}old-test`;
    const foreignCaches = [
      'foreign-cache-sentinel',
      'another-app-v999',
      'workbox-precache-foreign',
    ];
    const deleted = await runActivate(relativePath, [ownOldCache, ...foreignCaches]);

    assert.ok(deleted.includes(ownOldCache), `${relativePath}: 自分の旧キャッシュを整理する`);
    for (const foreignCache of foreignCaches) {
      assert.equal(
        deleted.includes(foreignCache),
        false,
        `${relativePath}: 他アプリのキャッシュ ${foreignCache} を削除しない`,
      );
    }
  }
});

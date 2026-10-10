'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { LAB_WORKERS, finalizeLabServiceWorkers, readLabWorker } = require('./finalize-lab-service-workers.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-lab-cache-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const worker of LAB_WORKERS) {
    const lab = path.posix.dirname(worker);
    const directory = path.join(root, lab);
    fs.mkdirSync(directory, { recursive: true });
    const prefix = 'focus-studio-';
    const listName = worker.endsWith('sw-hardened.js') ? 'ESSENTIAL_ASSETS' : 'ASSETS_TO_CACHE';
    fs.writeFileSync(path.join(root, worker), `const CACHE_PREFIX = '${prefix}';\nconst CACHE_NAME = '${prefix}v4';\nconst ${listName} = ['./', './index.html', './app.js', './style.css'];\nself.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(${listName}))));\n`);
    fs.writeFileSync(path.join(directory, 'index.html'), `<title>${lab}</title>`);
    fs.writeFileSync(path.join(directory, 'app.js'), '/* runtime */');
    fs.writeFileSync(path.join(directory, 'style.css'), '/* styles */');
  }
  return root;
}

test('ASSETSの最終バイトでラボのキャッシュ版を更新し、prefix・対象・処理を維持する', t => {
  const root = fixture(t);
  const originals = LAB_WORKERS.map(worker => fs.readFileSync(path.join(root, worker), 'utf8'));
  const initial = finalizeLabServiceWorkers(root);
  for (const [index, worker] of LAB_WORKERS.entries()) {
    const before = readLabWorker(originals[index]);
    const afterSource = fs.readFileSync(path.join(root, worker), 'utf8');
    const after = readLabWorker(afterSource);
    assert.ok(after.cacheName.startsWith(before.prefix));
    assert.match(after.cacheName, /-runtime-[a-f0-9]{20}$/);
    assert.deepEqual(after.assets, before.assets);
    assert.equal(afterSource.replace(after.cacheName, before.cacheName), originals[index]);
  }
  assert.deepEqual(finalizeLabServiceWorkers(root), initial);
  assert.deepEqual(finalizeLabServiceWorkers(root, { checkOnly: true }), initial);
  fs.appendFileSync(path.join(root, 'focus_studio', 'app.js'), '\n/* fixed runtime */');
  assert.throws(() => finalizeLabServiceWorkers(root, { checkOnly: true }), /focus_studio.*キャッシュ版/);
  const changed = finalizeLabServiceWorkers(root);
  assert.notEqual(changed[0].cacheName, initial[0].cacheName);
  assert.notEqual(changed[1].cacheName, initial[1].cacheName);
});

test('ワーカー処理が変わっても再生成され、ASSETS外の内部ファイルは版に影響しない', t => {
  const root = fixture(t);
  const before = finalizeLabServiceWorkers(root);
  fs.writeFileSync(path.join(root, 'focus_studio', 'private-not-cached.js'), 'not public precache');
  assert.deepEqual(finalizeLabServiceWorkers(root), before);
  fs.appendFileSync(path.join(root, 'focus_studio', 'sw-hardened.js'), '\n/* updated lifecycle */');
  assert.notEqual(finalizeLabServiceWorkers(root)[1].cacheName, before[1].cacheName);
});

test('ASSETS欠損では全ラボを部分更新せず、生成形式が不明なら失敗する', t => {
  const root = fixture(t);
  const before = fs.readFileSync(path.join(root, 'focus_studio', 'sw.js'), 'utf8');
  fs.unlinkSync(path.join(root, 'focus_studio', 'app.js'));
  assert.throws(() => finalizeLabServiceWorkers(root), /app\.js/);
  assert.equal(fs.readFileSync(path.join(root, 'focus_studio', 'sw.js'), 'utf8'), before);
  assert.throws(() => readLabWorker('const CACHE_NAME = "unknown";'), /キャッシュ定義/);
  assert.throws(() => readLabWorker(before.replace("'./app.js'", 'dangerous()')), /ASSETS/);
});

test('生成HTMLと実行時scriptの依存だけを両Focus一覧へ追加し、記事リンクやSpaceワーカーを追加しない', t => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'assets'));
  for (const name of ['generated.css', 'icon.png', 'tone.js']) fs.writeFileSync(path.join(root, 'assets', name), '/* emitted */');
  fs.writeFileSync(path.join(root, 'focus_studio', 'index.html'), '<link rel="stylesheet" href="../assets/generated.css"><link rel="icon" href="../assets/icon.png"><script src="app.js"></script><a href="../unrelated/index.html">article</a><link rel="stylesheet" href="https://example.test/font.css">');
  fs.writeFileSync(path.join(root, 'focus_studio', 'app.js'), 'loadScript("../assets/tone.js");');
  const results = finalizeLabServiceWorkers(root);
  for (const result of results.filter(result => result.lab === 'focus_studio')) {
    assert.deepEqual(result.assets.slice(0, 4), ['./', './index.html', './app.js', './style.css']);
    assert.deepEqual(result.assets.slice(4), ['../assets/generated.css', '../assets/icon.png', '../assets/tone.js']);
    assert.equal(result.assets.some(asset => /unrelated|https:/.test(asset)), false);
  }
  assert.deepEqual(finalizeLabServiceWorkers(root), results);
  assert.deepEqual(LAB_WORKERS, ['focus_studio/sw.js', 'focus_studio/sw-hardened.js', 'typing_dojo/sw.js']);
  assert.equal(fs.existsSync(path.join(root, 'space_lab')), false);
});

test('hardenedのtemplateキャッシュ名と共有../資産も安全・再現可能に版管理する', t => {
  const root = fixture(t);
  const worker = path.join(root, 'focus_studio', 'sw-hardened.js');
  const source = fs.readFileSync(worker, 'utf8').replace("'focus-studio-v4'", '`${CACHE_PREFIX}v6`').replace("'./style.css'", "'./style.css', '../shared.js'");
  fs.writeFileSync(worker, source);
  fs.writeFileSync(path.join(root, 'shared.js'), '/* shared */');
  const initial = finalizeLabServiceWorkers(root);
  assert.match(initial[1].cacheName, /^focus-studio-v6-runtime-/);
  assert.match(fs.readFileSync(worker, 'utf8'), /`\$\{CACHE_PREFIX\}v6-runtime-[a-f0-9]{20}`/);
  assert.deepEqual(finalizeLabServiceWorkers(root), initial);
  fs.appendFileSync(path.join(root, 'shared.js'), '\n/* changed */');
  const changed = finalizeLabServiceWorkers(root);
  assert.equal(changed[0].cacheName, initial[0].cacheName);
  assert.notEqual(changed[1].cacheName, initial[1].cacheName);
});

test('生成HTMLの配信外参照や欠損もキャッシュ版の部分更新前に拒否する', t => {
  const root = fixture(t);
  const worker = path.join(root, 'focus_studio', 'sw.js');
  const original = fs.readFileSync(worker, 'utf8');
  for (const href of ['../../outside.js', '../assets/missing.js']) {
    fs.writeFileSync(path.join(root, 'focus_studio', 'index.html'), `<script src="${href}"></script>`);
    assert.throws(() => finalizeLabServiceWorkers(root), /precache/);
    assert.equal(fs.readFileSync(worker, 'utf8'), original);
  }
});

test('ラボのキャッシュ版をルートWorkboxのrevisionより先に確定する', () => {
  const pkg = require('../package.json');
  const commands = pkg.scripts.build.split('&&').map(command => command.trim());
  const labs = commands.findIndex(command => command.includes('finalize-lab-service-workers.cjs'));
  const root = commands.findIndex(command => command.includes('finalize-service-worker.cjs'));
  const deploy = commands.findIndex(command => command.includes('finalize-deploy-output.cjs'));
  assert.ok(labs > deploy && root > labs);
  assert.match(pkg.scripts['verify:build'], /finalize-lab-service-workers\.cjs dist --check/);
});

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { contentRevision, finalizeServiceWorker, readPrecacheManifest, verifyServiceWorker } = require('./finalize-service-worker.cjs');

function fixture(t, entries = [{ url: 'index.html', revision: 'before-copy' }]) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-final-cache-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>final runtime</title>');
  const worker = `define(["./workbox-test"],function(e){e.precacheAndRoute(${JSON.stringify(entries)},{});e.registerRoute(/\\.js$/,new e.StaleWhileRevalidate)});`;
  fs.writeFileSync(path.join(root, 'sw.js'), worker);
  return root;
}

test('最終コピー・加工後のバイトからrevisionを確定し、URLと順序は維持する', t => {
  const root = fixture(t, [
    { url: 'index.html', revision: 'before-copy' },
    { url: 'assets/app-hash.js', revision: null },
  ]);
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(path.join(root, 'assets/app-hash.js'), '/* final hardened runtime */');
  fs.writeFileSync(path.join(root, 'internal-only.js'), '/* copied after Vite */');
  const before = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const entries = finalizeServiceWorker(root);
  assert.deepEqual(entries.map(entry => entry.url), ['index.html', 'assets/app-hash.js']);
  for (const entry of entries) {
    assert.equal(entry.revision, contentRevision(fs.readFileSync(path.join(root, entry.url))));
  }
  const after = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const oldManifest = readPrecacheManifest(before);
  const newManifest = readPrecacheManifest(after);
  assert.equal(before.slice(0, oldManifest.start), after.slice(0, newManifest.start));
  assert.equal(before.slice(oldManifest.end), after.slice(newManifest.end));
  assert.deepEqual(finalizeServiceWorker(root), entries);
  assert.equal(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), after);
  fs.appendFileSync(path.join(root, 'assets/app-hash.js'), '\n/* next build */');
  const changed = finalizeServiceWorker(root);
  assert.equal(changed[0].revision, entries[0].revision);
  assert.notEqual(changed[1].revision, entries[1].revision);
});

test('minify済みWorkboxのデータを文字列の括弧・エスケープを壊さず読む', () => {
  const source = 'e.precacheAndRoute([{url:"asset]name.js",revision:null},{url:"a\\\"b.js",revision:"old",integrity:"sha256-test"}],{});';
  assert.deepEqual(readPrecacheManifest(source).entries, [
    { url: 'asset]name.js', revision: null },
    { url: 'a"b.js', revision: 'old', integrity: 'sha256-test' },
  ]);
});

test('不明な生成形式・空一覧・重複・実行可能な式は失敗させる', () => {
  for (const source of [
    'no worker', 'w.precacheAndRoute([],{});',
    'w.precacheAndRoute([{url:"a",revision:missing}],{});',
    'w.precacheAndRoute([{url:"a",revision:(globalThis.executed = true)}],{});',
    'w.precacheAndRoute([{url:"a",revision:null},{url:"a",revision:null}],{});',
    'w.precacheAndRoute([{url:"a",revision:null}],{});w.precacheAndRoute([{url:"b",revision:null}],{});',
    'w.precacheAndRoute([{url:"a",revision:null}',
  ]) assert.throws(() => readPrecacheManifest(source), /precache/);
  assert.equal(globalThis.executed, undefined);
});

test('欠けた対象・配信外参照・外部URL・自己参照ではSWを部分更新しない', t => {
  for (const url of ['missing.js', '../outside.js', '%2e%2e/outside.js', '/absolute.js',
    'https://example.test/app.js', 'app.js?v=2', 'folder\\app.js', 'sw.js', './sw.js']) {
    const root = fixture(t, [{ url: 'index.html', revision: 'old' }, { url, revision: 'old' }]);
    const before = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.throws(() => finalizeServiceWorker(root), /precache|Service Worker/);
    assert.equal(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), before);
  }
});

test('検証モードは未確定・確定後に変更されたバイトを検出し、修復で隠さない', t => {
  const root = fixture(t);
  assert.throws(() => verifyServiceWorker(root), /revisionが一致しません/);
  const entries = finalizeServiceWorker(root);
  assert.deepEqual(verifyServiceWorker(root), entries);
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  fs.appendFileSync(path.join(root, 'index.html'), '\n<!-- late change -->');
  assert.throws(() => verifyServiceWorker(root), /index\.html/);
  assert.equal(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), worker);
});

test('symlink経由でも配信ディレクトリ外を読まない', t => {
  const root = fixture(t, [{ url: 'escape.js', revision: null }]);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-cache-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'private.js'), 'private');
  fs.symlinkSync(path.join(outside, 'private.js'), path.join(root, 'escape.js'));
  assert.throws(() => finalizeServiceWorker(root), /配信ルート外/);
});

test('buildは公開ファイルのコピーと加工が終わってからSWを確定する', () => {
  const pkg = require('../package.json');
  const commands = pkg.scripts.build.split('&&').map(command => command.trim());
  const finalization = commands.findIndex(command => command.includes('finalize-service-worker.cjs'));
  assert.ok(finalization > 0);
  for (const script of ['vite build', 'copy-build-runtime-assets.cjs', 'harden-focus-studio-build.cjs', 'finalize-deploy-output.cjs']) {
    const position = commands.findIndex(command => command.includes(script));
    assert.ok(position >= 0 && position < finalization, script);
  }
  // 公開資産の最終確定後は、読み取り専用の教育プライバシー監査だけを許可する。
  // 新たなコピー・変換工程をSW確定後に追加した場合はCIを失敗させる。
  assert.deepEqual(commands.slice(finalization + 1),
    ['node ../scripts/education-no-tracking.cjs --pikalab-build']);
  assert.match(pkg.scripts['verify:build'], /finalize-service-worker\.cjs dist --check/);
  assert.match(pkg.scripts['verify:build'], /education-no-tracking\.cjs --pikalab-build/);
  assert.equal(pkg.scripts['test:pwa-e2e'], 'node scripts/pwa-cache-e2e.mjs');
});

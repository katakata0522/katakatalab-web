'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { resolvePrecacheFile } = require('./finalize-service-worker.cjs');
const { collectResourceReferences, collectTransitiveScriptReferences, resolveLocalReference } = require('./verify-build-output.cjs');

// Space Labは旧ワーカーを明示的に解除しているため公開対象へ戻さない。
const LAB_WORKERS = Object.freeze(['focus_studio/sw.js', 'focus_studio/sw-hardened.js', 'typing_dojo/sw.js']);

function readLabWorker(source) {
  const names = [...source.matchAll(/\bconst\s+CACHE_NAME\s*=\s*(['"`])([^'"`\\\r\n]+)\1\s*;/g)];
  const prefix = source.match(/\bconst\s+CACHE_PREFIX\s*=\s*(['"])([^'"\\]+)\1\s*;/)?.[2];
  const lists = [...source.matchAll(/\bconst\s+(?:ASSETS(?:_TO_CACHE)?|ESSENTIAL_ASSETS)\s*=\s*\[([\s\S]*?)\]\s*;/g)];
  if (names.length !== 1 || !prefix || lists.length !== 1) {
    throw new Error('ラボのService Workerのキャッシュ定義を一意に解析できません');
  }
  const assets = lists[0][1].split(',').map(item => item.trim()).filter(Boolean).map(item => {
    const match = item.match(/^(['"])([^'"\\]+)\1$/);
    if (!match) throw new Error('ラボのService WorkerのASSETSが不正です');
    return match[2];
  });
  if (!assets.length) throw new Error('ラボのService WorkerのASSETSが空です');
  const nameMatch = names[0];
  const nameStart = nameMatch.index + nameMatch[0].indexOf(nameMatch[1]) + 1;
  const literal = nameMatch[2];
  const isTemplate = nameMatch[1] === '`';
  if (isTemplate && !/^\$\{CACHE_PREFIX\}[\w.-]+$/.test(literal)) throw new Error('ラボのキャッシュ名の式が不正です');
  const cacheName = isTemplate ? literal.replace('${CACHE_PREFIX}', prefix) : literal;
  if (!cacheName.startsWith(prefix)) throw new Error('ラボのキャッシュ名がprefixと一致しません');
  const baseName = cacheName.replace(/-runtime-[a-f0-9]{20}$/, '');
  const baseLiteral = literal.replace(/-runtime-[a-f0-9]{20}$/, '');
  const assetsStart = lists[0].index + lists[0][0].indexOf('[') + 1;
  return { assets, prefix, cacheName, baseName, baseLiteral, nameStart, nameEnd: nameStart + literal.length,
    assetsStart, assetsEnd: assetsStart + lists[0][1].length };
}

function resolveLabAsset(buildRoot, lab, asset) {
  if (!asset || /[\\?#\0]/.test(asset) || asset.startsWith('/') || /^[A-Za-z][\w+.-]*:/.test(asset)) {
    throw new Error(`安全でないラボのASSETS URLです: ${asset}`);
  }
  const reference = asset.endsWith('/') ? asset + 'index.html' : asset;
  return resolvePrecacheFile(buildRoot, path.posix.join(lab, reference));
}

function versionLabWorker(buildRoot, worker, source) {
  const definition = readLabWorker(source);
  const lab = path.posix.dirname(worker);
  const hash = crypto.createHash('sha256');
  // ワーカー自身の変更も反映しつつ、再実行では生成済みsuffixをハッシュしない。
  hash.update(source.slice(0, definition.nameStart) + definition.baseLiteral + source.slice(definition.nameEnd));
  for (const asset of definition.assets) {
    const file = resolveLabAsset(buildRoot, lab, asset);
    if (fs.realpathSync(file) === fs.realpathSync(path.join(buildRoot, worker))) {
      throw new Error('ラボのService Worker自身はASSETSに含められません');
    }
    const bytes = fs.readFileSync(file);
    hash.update(`\0${asset}\0${bytes.length}\0`);
    hash.update(bytes);
  }
  const suffix = `-runtime-${hash.digest('hex').slice(0, 20)}`;
  const cacheName = definition.baseName + suffix;
  return {
    ...definition,
    cacheName,
    source: source.slice(0, definition.nameStart) + definition.baseLiteral + suffix + source.slice(definition.nameEnd),
  };
}

function completeWorkerAssets(buildRoot, worker, source) {
  const definition = readLabWorker(source);
  const lab = path.posix.dirname(worker);
  const htmlPath = path.join(buildRoot, lab, 'index.html');
  const references = collectResourceReferences(fs.readFileSync(htmlPath, 'utf8'));
  references.push(...collectTransitiveScriptReferences(buildRoot, htmlPath, references));
  const known = new Set(definition.assets.map(asset => new URL(asset, `https://pikalab.invalid/${lab}/`).href));
  const extra = [];
  for (const reference of references) {
    const target = resolveLocalReference(buildRoot, htmlPath, reference);
    if (!target) continue;
    const relative = path.relative(buildRoot, target).split(path.sep).join('/');
    // 参照先が実在し、symlinkも含めて配信ルート内にあることを先に確認する。
    resolvePrecacheFile(buildRoot, relative);
    let asset = path.posix.relative(lab, relative);
    if (!asset.startsWith('.')) asset = './' + asset;
    const key = new URL(asset, `https://pikalab.invalid/${lab}/`).href;
    if (known.has(key)) continue;
    known.add(key);
    extra.push(asset);
  }
  if (!extra.length) return source;
  const existing = source.slice(definition.assetsStart, definition.assetsEnd).trimEnd();
  const appended = existing + (existing.endsWith(',') ? '' : ',')
    + '\n    ' + extra.map(asset => JSON.stringify(asset)).join(',\n    ') + '\n';
  return source.slice(0, definition.assetsStart) + appended + source.slice(definition.assetsEnd);
}

function finalizeLabServiceWorkers(buildRoot, { checkOnly = false } = {}) {
  // 全ラボの参照検証を終えてから書く。片方の欠損で部分的に版だけ進めない。
  const workers = LAB_WORKERS.map(worker => {
    const lab = path.posix.dirname(worker);
    const workerPath = path.join(buildRoot, worker);
    const source = fs.readFileSync(workerPath, 'utf8');
    const complete = completeWorkerAssets(buildRoot, worker, source);
    const result = versionLabWorker(buildRoot, worker, complete);
    if (checkOnly && result.source !== source) throw new Error(`${lab}: 最終配信バイトとService Workerのキャッシュ版が一致しません`);
    return { lab, worker, workerPath, original: source, ...result };
  });
  if (!checkOnly) {
    for (const worker of workers) {
      if (worker.source !== worker.original) fs.writeFileSync(worker.workerPath, worker.source);
    }
  }
  return workers.map(({ lab, worker, cacheName, assets }) => ({ lab, worker, cacheName, assets }));
}

module.exports = { LAB_WORKERS, completeWorkerAssets, finalizeLabServiceWorkers, readLabWorker, resolveLabAsset, versionLabWorker };

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..', process.argv[2] || 'dist');
    const results = finalizeLabServiceWorkers(root, { checkOnly: process.argv.includes('--check') });
    for (const result of results) console.log(`${result.worker}: ${result.cacheName}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Workboxの生成したデータ部分だけを読む。生成コードをevalしない。
function parseManifestLiteral(literal) {
  let json = '';
  for (let index = 0; index < literal.length;) {
    const character = literal[index];
    if (character === '"') {
      const start = index++;
      while (index < literal.length) {
        if (literal[index] === '\\') index += 2;
        else if (literal[index++] === '"') break;
      }
      json += literal.slice(start, index);
      continue;
    }
    const identifier = literal.slice(index).match(/^[A-Za-z_$][\w$]*/)?.[0];
    if (identifier) {
      const following = literal.slice(index + identifier.length).trimStart();
      json += following.startsWith(':') ? JSON.stringify(identifier) : identifier;
      index += identifier.length;
      continue;
    }
    json += character;
    index += 1;
  }
  return JSON.parse(json);
}

function readPrecacheManifest(workerSource) {
  const calls = [...workerSource.matchAll(/\bprecacheAndRoute\s*\(\s*(\[)/g)];
  if (calls.length !== 1) throw new Error('Workboxのprecache一覧が一意に見つかりません');
  const start = calls[0].index + calls[0][0].lastIndexOf('[');
  let inString = false;
  let depth = 0;
  for (let index = start; index < workerSource.length; index += 1) {
    const character = workerSource[index];
    if (inString) {
      if (character === '\\') index += 1;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '[') depth += 1;
    else if (character === ']' && --depth === 0) {
      let entries;
      try { entries = parseManifestLiteral(workerSource.slice(start, index + 1)); }
      catch { throw new Error('Workboxのprecache一覧を安全に解析できません'); }
      if (!Array.isArray(entries) || entries.length === 0) throw new Error('Workboxのprecache一覧が空です');
      const urls = new Set();
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object' || typeof entry.url !== 'string'
          || !(typeof entry.revision === 'string' || entry.revision === null)) {
          throw new Error('Workboxのprecache項目が不正です');
        }
        if (urls.has(entry.url)) throw new Error(`Workboxのprecache URLが重複しています: ${entry.url}`);
        urls.add(entry.url);
      }
      return { start, end: index + 1, entries };
    }
  }
  throw new Error('Workboxのprecache一覧が閉じられていません');
}

function resolvePrecacheFile(buildRoot, url) {
  // URL一覧はViteの生成結果を維持する。外部URL・クエリ・親参照は受け付けない。
  if (!url || /[\\?#\0]/.test(url) || url.startsWith('/') || /^[A-Za-z][\w+.-]*:/.test(url)) {
    throw new Error(`安全でないprecache URLです: ${url}`);
  }
  let decoded;
  try { decoded = decodeURIComponent(url); }
  catch { throw new Error(`不正なprecache URLです: ${url}`); }
  if (decoded.split(/[\\/]/).some(part => part === '..') || /[\\\0]/.test(decoded)) {
    throw new Error(`安全でないprecache URLです: ${url}`);
  }
  const root = fs.realpathSync(buildRoot);
  const file = path.resolve(root, decoded);
  const isInside = candidate => candidate !== root && candidate.startsWith(root + path.sep);
  if (!isInside(file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`precache対象が配信成果物にありません: ${url}`);
  }
  if (!isInside(fs.realpathSync(file))) throw new Error(`precache対象が配信ルート外です: ${url}`);
  return file;
}

function contentRevision(bytes) {
  return crypto.createHash('md5').update(bytes).digest('hex');
}

function finalizeServiceWorker(buildRoot) {
  const workerPath = path.join(buildRoot, 'sw.js');
  const source = fs.readFileSync(workerPath, 'utf8');
  const manifest = readPrecacheManifest(source);
  const entries = manifest.entries.map(entry => {
    const file = resolvePrecacheFile(buildRoot, entry.url);
    if (fs.realpathSync(file) === fs.realpathSync(workerPath)) throw new Error('Service Worker自身はprecache対象にできません');
    return { ...entry, revision: contentRevision(fs.readFileSync(file)) };
  });
  // 再走査はしない。後段でコピーした内部資産がprecacheへ追加されるのを防ぐ。
  const result = source.slice(0, manifest.start) + JSON.stringify(entries) + source.slice(manifest.end);
  if (result !== source) fs.writeFileSync(workerPath, result);
  return entries;
}

function verifyServiceWorker(buildRoot) {
  const source = fs.readFileSync(path.join(buildRoot, 'sw.js'), 'utf8');
  const { entries } = readPrecacheManifest(source);
  for (const entry of entries) {
    const expected = contentRevision(fs.readFileSync(resolvePrecacheFile(buildRoot, entry.url)));
    if (entry.revision !== expected) throw new Error(`最終配信バイトとprecache revisionが一致しません: ${entry.url}`);
  }
  return entries;
}

module.exports = { contentRevision, finalizeServiceWorker, readPrecacheManifest, resolvePrecacheFile, verifyServiceWorker };

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..', process.argv[2] || 'dist');
    const checkOnly = process.argv.includes('--check');
    const entries = checkOnly ? verifyServiceWorker(root) : finalizeServiceWorker(root);
    console.log(`最終配信バイトによるprecache${checkOnly ? '検証' : '更新'}: ${entries.length}件`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

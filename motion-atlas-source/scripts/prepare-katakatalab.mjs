import { copyFile, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('..', import.meta.url));
const entryTag = /^\s*<script type="module" crossorigin src="\.\/assets\/([\w-]+\.js)"><\/script>\s*$/;
const linkTag = /^\s*<link rel="(stylesheet|modulepreload)" crossorigin href="\.\/assets\/([\w-]+\.(?:css|js))"\s*\/?>\s*$/;

function readAssetTags(html, label) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const lines = html.split(eol);
  const start = lines.findIndex(line => entryTag.test(line));
  if (start === -1) throw new Error(`${label}のViteエントリーが見つかりません`);
  let end = start + 1;
  while (end < lines.length && linkTag.test(lines[end])) end++;
  const tags = lines.slice(start, end);
  if (!tags.some(line => line.includes('rel="stylesheet"'))) {
    throw new Error(`${label}にViteのスタイルシートが見つかりません`);
  }
  return { eol, lines, start, tags };
}

function chunkName(name) {
  return name.replace(/-[\w-]{8}(?=\.js$)/, '');
}

function updateAssetTags(published, built, assets) {
  const referenced = new Set(built.tags.map(tag => tag.match(entryTag)?.[1] ?? tag.match(linkTag)[2]));
  for (const name of referenced) {
    if (!assets.includes(name)) throw new Error(`ビルド結果の参照先が見つかりません: ${name}`);
  }
  const builtChunks = new Map(assets.filter(name => name.endsWith('.js')).map(name => [chunkName(name), name]));
  const extraPreloads = [];
  // 公開用HTMLで追加している先読みも、対応する新しいチャンクに引き継ぐ。
  for (const tag of published.tags) {
    const match = tag.match(linkTag);
    if (match?.[1] !== 'modulepreload') continue;
    const previous = match[2];
    const next = builtChunks.get(chunkName(previous));
    if (next && !referenced.has(next)) extraPreloads.push(tag.replace(previous, next));
  }
  const nextTags = [...built.tags];
  const stylesheet = nextTags.findIndex(line => line.includes('rel="stylesheet"'));
  nextTags.splice(stylesheet, 0, ...extraPreloads);
  const indent = published.tags[0].match(/^\s*/)[0];
  const indentedTags = nextTags.map(tag => indent + tag.trimStart());
  published.lines.splice(published.start, published.tags.length, ...indentedTags);
  return published.lines.join(published.eol);
}

async function readAssetIfPresent(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function main() {
  const [mode, checkout, ...extra] = process.argv.slice(2);
  if (!['--check', '--prepare'].includes(mode) || !checkout || extra.length) {
    throw new Error('使い方 npm run release:check または npm run release:prepare の後ろに -- と公開リポジトリのパスを指定してください');
  }

  const publicDir = resolve(checkout, 'motion-atlas');
  const dist = join(project, 'dist');
  const builtAssets = join(dist, 'assets');
  const currentHtml = await readFile(join(publicDir, 'index.html'), 'utf8');
  if (!currentHtml.includes('<link rel="canonical" href="https://katakatalab.com/motion-atlas/"')) {
    throw new Error('公開リポジトリの motion-atlas/index.html を指定してください');
  }
  const published = readAssetTags(currentHtml, '公開版');
  const built = readAssetTags(await readFile(join(dist, 'index.html'), 'utf8'), 'ビルド結果');
  const assets = (await readdir(builtAssets, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /\.(?:js|css)$/.test(entry.name))
    .map(entry => entry.name);
  const nextHtml = updateAssetTags(published, built, assets);

  const additions = [];
  for (const name of assets) {
    const current = await readAssetIfPresent(join(publicDir, 'assets', name));
    if (current === null) {
      additions.push(name);
    } else if (!current.equals(await readFile(join(builtAssets, name)))) {
      throw new Error(`公開版とビルド結果で同じファイル名の内容が異なります: ${name}`);
    }
  }

  const indexChanged = currentHtml !== nextHtml;
  if (!indexChanged && additions.length === 0) {
    console.log(`公開版と一致しました（HTMLの参照先とJavaScript・CSS ${assets.length}件）`);
    return;
  }
  if (mode === '--check') {
    const changes = [...(indexChanged ? ['index.html'] : []), ...additions];
    throw new Error(`公開版との差分 ${changes.join(', ')}`);
  }

  const releaseDir = join(project, '.release');
  await mkdir(releaseDir, { recursive: true });
  const stagingDir = await mkdtemp(join(releaseDir, 'preview-'));
  const stagingApp = join(stagingDir, 'motion-atlas');
  const stagingAssets = join(stagingApp, 'assets');
  await mkdir(stagingAssets, { recursive: true });
  if (indexChanged) await writeFile(join(stagingApp, 'index.html'), nextHtml, 'utf8');
  for (const name of additions) {
    await copyFile(join(builtAssets, name), join(stagingAssets, name));
  }
  console.log(`公開候補を作成しました ${stagingApp}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

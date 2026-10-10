const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('TailSnap専用ポリシーが実装と公開要件を説明する', () => {
  const html = read('privacy/tailsnap/index.html');

  assert.match(html, /TailSnap v2\.6\.1/);
  assert.match(html, /activeTab/);
  assert.match(html, /scripting/);
  assert.match(html, /sidePanel/);
  assert.match(html, /Webサイト内容|ページ内容/);
  assert.match(html, /localStorage/);
  assert.match(html, /AIサービスへ自動送信することはありません/);
  assert.match(html, /Pro販売とオンライン購入確認を行っていません/);
  assert.match(html, /https:\/\/katakatalab\.com\/privacy\/tailsnap\//);
  assert.doesNotMatch(html, /googlesyndication|google-analytics|gtag\(/i);
});

test('公開ビルドとsitemapがTailSnap専用ポリシーを含む', () => {
  const buildScript = read('.github/scripts/build-public-root.cjs');
  const sitemap = read('sitemap.xml');

  assert.match(buildScript, /'privacy'/);
  assert.match(sitemap, /https:\/\/katakatalab\.com\/privacy\/tailsnap\//);
});

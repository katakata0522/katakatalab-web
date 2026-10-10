'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  read,
  resolveRepositoryPath,
} = require('./helpers/repository.cjs');

function extractMetadata(relativePath) {
  const html = read(relativePath);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
  const description = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';
  const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';
  const twitterTitle = html.match(/<meta[^>]+name="twitter:title"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';
  const twitterDescription = html.match(/<meta[^>]+name="twitter:description"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';
  return { html, title, description, ogTitle, ogDescription, twitterTitle, twitterDescription };
}

function sitemapUrls(relativePath) {
  return [...read(relativePath).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function sitemapUrlToFile(url, prefix, baseDirectory) {
  let relativeUrl = url.slice(prefix.length);
  if (relativeUrl === '' || relativeUrl.endsWith('/')) {
    relativeUrl += 'index.html';
  }
  return path.posix.join(baseDirectory, relativeUrl);
}

function primaryPageJsonLd(html) {
  for (const match of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    const parsed = JSON.parse(match[1]);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const page = items.find((item) => ['WebApplication', 'WebPage', 'CollectionPage', 'WebSite'].includes(item?.['@type']));
    if (page) return page;
  }
  return null;
}

test('YouTube公式ヘルプは言語クエリなしの安定URLを使う', () => {
  const sources = [
    read('guides/aspect-ratio-guide.html'),
    read('scripts/generate-english-pages.cjs'),
  ];

  for (const source of sources) {
    assert.match(source, /https:\/\/support\.google\.com\/youtube\/answer\/72431["']/);
    assert.doesNotMatch(source, /support\.google\.com\/youtube\/answer\/72431\?hl=/);
  }
});

test('公開ガイドは仕様を超える絶対表現や誇張表現を使わない', () => {
  const fontLab = read('font-lab/index.html');
  const codeStudioGuide = read('guides/codestudio-guide.html');

  assert.doesNotMatch(fontLab, /最強の破壊力|絶対的王者|絶対に目を惹きつけたい|爆速CDN/);
  assert.match(codeStudioGuide, /最大10件/);
  assert.doesNotMatch(codeStudioGuide, /いつでも元に戻せる/);
});

test('日本語ツールは日本語タイトルと内容を説明するメタ説明を持つ', () => {
  const pikalabTop = extractMetadata('pikalab/index.html');
  assert.match(pikalabTop.description, /プログラミングや音楽、漢字、瞬読、算数/);
  assert.equal(pikalabTop.ogDescription, pikalabTop.description);
  assert.equal(pikalabTop.twitterDescription, pikalabTop.description);
  assert.equal(primaryPageJsonLd(pikalabTop.html)?.description, pikalabTop.description);

  const qr = extractMetadata('qrcode/index.html');
  assert.match(qr.title, /QR(?:コード| Maker Lab)/i);
  assert.match(qr.title, /KatakataLab/);
  assert.match(qr.description, /URL・テキスト・Wi-Fi情報/);
  assert.doesNotMatch(qr.description, /安全な|安心|商用利用OK/);
  assert.equal(qr.ogTitle, qr.title);
  assert.equal(qr.twitterTitle, qr.title);
  assert.doesNotMatch(qr.html, /Safe, Free, Unlimited|安全なQRコード作成ツール|商用利用OK/);

  const deepSea = extractMetadata('pikalab/deepsea_lab/index.html');
  assert.match(deepSea.title, /深海/);
  assert.match(deepSea.title, /PikaLab/);

  const pikalabPages = [
    'pikalab/deepsea_lab/index.html',
    'pikalab/book_report/index.html',
    'pikalab/color_lab/index.html',
    'pikalab/manabi_land/index.html',
  ];
  for (const relativePath of pikalabPages) {
    const metadata = extractMetadata(relativePath);
    assert.equal(metadata.ogTitle, metadata.title, `${relativePath}: og:titleをtitleと同期してください`);
    assert.equal(metadata.ogDescription, metadata.description, `${relativePath}: og:descriptionをdescriptionと同期してください`);
    assert.equal(metadata.twitterTitle, metadata.title, `${relativePath}: twitter:titleをtitleと同期してください`);
    assert.equal(metadata.twitterDescription, metadata.description, `${relativePath}: twitter:descriptionをdescriptionと同期してください`);
    const jsonLd = primaryPageJsonLd(metadata.html);
    assert.equal(jsonLd?.name, metadata.title, `${relativePath}: JSON-LD nameをtitleと同期してください`);
    assert.equal(jsonLd?.description, metadata.description, `${relativePath}: JSON-LD descriptionをdescriptionと同期してください`);
  }

  for (const relativePath of pikalabPages.slice(1)) {
    const metadata = extractMetadata(relativePath);
    assert.ok(metadata.description?.trim(), `${relativePath}: descriptionが空です`);
    assert.notEqual(metadata.description, metadata.title, `${relativePath}: descriptionがtitleと同一です`);
    assert.doesNotMatch(metadata.description, /TODO|TBD|Lorem ipsum/i, `${relativePath}: descriptionに未完成文言があります`);
  }
});

test('サイトマップ掲載HTMLはmainランドマークを1つ持つ', () => {
  const sitemapDefinitions = [
    {
      sitemap: 'sitemap.xml',
      prefix: 'https://katakatalab.com/',
      baseDirectory: '',
    },
    {
      sitemap: 'pikalab/sitemap.xml',
      prefix: 'https://katakatalab.com/pikalab/',
      baseDirectory: 'pikalab',
    },
  ];
  const missingMain = [];
  const multipleMain = [];

  for (const definition of sitemapDefinitions) {
    for (const url of sitemapUrls(definition.sitemap)) {
      if (!url.startsWith(definition.prefix)) continue;
      const relativePath = sitemapUrlToFile(url, definition.prefix, definition.baseDirectory);
      const absolutePath = resolveRepositoryPath(relativePath);
      if (!fs.existsSync(absolutePath) || !absolutePath.endsWith('.html')) continue;
      const html = fs.readFileSync(absolutePath, 'utf8');
      const mainCount = (html.match(/<main\b/gi) || []).length;
      if (mainCount === 0) missingMain.push(relativePath);
      if (mainCount > 1) multipleMain.push(relativePath);
    }
  }

  assert.deepEqual(missingMain, []);
  assert.deepEqual(multipleMain, []);
});

test('キッズ・スマイル・ランドは小画面でタイトルを単語途中改行させない', () => {
  const html = read('lab-tools/kids-smile-land/index.html');
  const css = read('lab-tools/kids-smile-land/style.css');

  assert.match(html, /class="[^"]*kids-site-title[^"]*"/);
  assert.match(html, /<span class="kids-site-title__name">キッズ・スマイル・ランド<\/span>/);
  assert.match(css, /\.kids-site-title__name\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.kids-site-title\s*\{[^}]*font-size:\s*0\.875rem/s);
});

test('QRコード作成ツールは小画面で見出し領域を不要に引き伸ばさない', () => {
  const css = read('qrcode/style.css');

  assert.match(
    css,
    /@media\s*\(max-width:\s*768px\)[\s\S]*?\.header-inner\s*\{[^}]*flex:\s*0\s+1\s+auto/s,
  );
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  read,
  repositoryRoot,
} = require('./helpers/repository.cjs');
const { TOOL_CONFIGS } = require('../scripts/generate-english-pages.cjs');

const editorialPages = Object.freeze([
  'en/index.html',
  'en/site-information.html',
  'guides/en/social-image-sizes.html',
  'guides/en/password-security.html',
]);

test('英語ハブ・案内・ガイドは共通シェルと操作アクセシビリティを使う', () => {
  const shellPath = path.join(repositoryRoot, 'international/english-shell.css');
  assert.equal(fs.existsSync(shellPath), true, '英語共通CSSが必要です');

  const css = read('international/english-shell.css');
  assert.match(css, /\.english-site-nav\s+a[\s\S]*?min-height:\s*44px/i);
  assert.match(css, /\.english-tool-page\s+\.english-tool-bar\s+a[\s\S]*?min-height:\s*44px/i);
  assert.match(css, /:focus-visible[\s\S]*?outline/i);

  for (const file of editorialPages) {
    const html = read(file);
    assert.match(html, /href="\/international\/english-shell\.css\?v=[0-9A-Za-z._-]+"/i, `${file} は英語共通CSSを読み込んでください`);
    assert.match(html, /<body class="english-site-shell/i, `${file} に英語サイト用bodyクラスが必要です`);
    assert.match(html, /class="english-site-header"/i, `${file} に共通ヘッダーが必要です`);
    assert.match(html, /class="english-site-main/i, `${file} に共通本文コンテナが必要です`);
    assert.match(html, /class="english-site-footer"/i, `${file} に共通フッターが必要です`);
  }
});

test('英語ツールは小さな素の言語リンクではなく共通ナビを使う', () => {
  for (const config of TOOL_CONFIGS) {
    const html = read(config.output);
    assert.match(html, /href="\/international\/english-shell\.css\?v=[0-9A-Za-z._-]+"/i, `${config.output} は英語共通CSSを読み込んでください`);
    assert.match(html, new RegExp(`<body[^>]*class="[^"]*english-tool-page[^"]*english-tool--${config.slug}`), `${config.output} にツール用bodyクラスが必要です`);
    assert.match(html, /class="english-tool-bar"/i, `${config.output} に共通ナビが必要です`);
    assert.doesNotMatch(html, /class="language-switch"|font:\s*600\s+\.8rem/i, `${config.output} の小さな言語リンクを残さないでください`);
  }

  const qrHtml = read('qrcode/en/index.html');
  const qrBar = qrHtml.match(/<nav class="english-tool-bar"[\s\S]*?<\/nav>/i)?.[0] ?? '';
  assert.match(qrBar, /KatakataLab English/i);
  assert.doesNotMatch(qrBar, /hreflang="ja"|Japanese version/i, 'QRはツール内の言語タブと重複させないでください');
});

test('英語説明欄とフッターは共通構造と操作領域を持つ', () => {
  const css = read('international/english-shell.css');
  assert.match(css, /\.english-tool-page\s+\.tool-footer\s+a[\s\S]*?min-height:\s*44px/i);

  for (const config of TOOL_CONFIGS) {
    const html = read(config.output);
    assert.match(html, /class="article-content english-content"/i);
    assert.match(html, /<footer class="tool-footer" aria-label="Site information">/i);
    assert.doesNotMatch(html, /<footer class="tool-footer"[^>]+style=/i);
  }
});

test('OGP英語版の1列グリッドは子要素の最小幅で画面外へ広がらない', () => {
  const css = read('ogp-simulator/style.css');
  assert.match(css, /\.two-column-layout\s*>\s*\*\s*\{[^}]*min-width:\s*0/s);
});

test('Font Lab英語版はアイコンフォント読込前の文字列で横へ広がらない', () => {
  const css = read('international/english-shell.css');
  assert.match(css, /\.english-tool--font-lab \.material-symbols-rounded\s*\{[^}]*width:\s*1em[^}]*overflow:\s*hidden/s);
});

test('英語版に確認済みの日本語UI表記を残さない', () => {
  const pxRem = read('px-rem-converter/en/index.html');
  const textDiff = read('text-diff/en/index.html');

  assert.match(pxRem, /aria-current="page">PX to REM Converter</i);
  assert.doesNotMatch(pxRem, /px\s*\/\s*rem\s*変換/i);
  assert.match(textDiff, /aria-label="Clear both inputs"/i);
  assert.doesNotMatch(textDiff, /aria-label="両方の入力をすべてクリア"/i);
});

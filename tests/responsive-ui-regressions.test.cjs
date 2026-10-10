const test = require('node:test');
const assert = require('node:assert/strict');
const { read: readFile } = require('./helpers/repository.cjs');

test('トップページは画面幅ごとにナビゲーションを整理する', () => {
  const css = readFile('style.css');

  assert.match(css, /\.menu-toggle\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(max-width:\s*768px\)[\s\S]*?\.menu-toggle\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.nav-link\s*\{[^}]*min-height:\s*44px/s);
});

test('トップページは小画面でも英語導線を残しつつヘッダーをはみ出させない', () => {
  const html = readFile('index.html');
  const css = readFile('style.css');

  assert.match(html, /<a href="en\/" class="mobile-nav-link" hreflang="en" lang="en">[^<]*English tools<\/a>/);
  assert.match(css, /@media \(max-width:\s*768px\)[\s\S]*?\.language-link\s*\{[^}]*display:\s*none/s);
});

test('トップページのスマホ操作要素はタップ領域を保ち、絞り込みラベルを2列ですべて表示する', () => {
  const css = readFile('style.css');

  assert.match(css, /\.shelf-nav-wrapper::after\s*\{/);
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.shelf-nav\s*\{[^}]*overflow:\s*visible;/s);
  assert.match(css, /\.shelf-nav-wrapper::after\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.card-guide-links a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.footer-links a\s*\{[^}]*min-height:\s*44px/s);
});

test('QR作成ページのモバイル操作バーは編集領域に固定重なりしない', () => {
  const css = readFile('qrcode/style.css');
  const actionBarBlocks = [...css.matchAll(/\.mobile-action-bar\s*\{([^}]*)\}/g)];
  const actionBarBlock = actionBarBlocks.at(-1)?.[1] ?? '';

  assert.match(actionBarBlock, /position:\s*sticky/);
  assert.doesNotMatch(actionBarBlock, /position:\s*fixed/);
});

test('QR作成ページの主要操作は44px以上のタップ領域を持つ', () => {
  const css = readFile('qrcode/style.css');

  for (const selector of [
    '.breadcrumbs-tool a',
    '.lang-tab',
    '.btn-sidebar-toggle',
    '.btn-sidebar-close',
    '.btn-adjust',
    'input[type="color"]',
    '.color-swatch',
    '.btn-icon-small',
    '.tool-footer a',
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(css, new RegExp(`${escaped}\\s*\\{[^}]*min-(?:height|block-size):\\s*44px`, 's'), `${selector} のタップ領域が不足しています`);
  }
});

test('QR作成ページのカラースウォッチは380px以下でも44pxのタップ領域を維持する', () => {
  const css = readFile('qrcode/style.css');
  const narrowSwatch = css.match(/@media \(max-width:\s*380px\)[\s\S]*?\.color-swatch\s*\{([^}]*)\}/)?.[1] ?? '';

  assert.match(narrowSwatch, /width:\s*44px\s*!important/);
  assert.match(narrowSwatch, /height:\s*44px\s*!important/);
  assert.match(narrowSwatch, /min-height:\s*44px\s*!important/);
  assert.match(narrowSwatch, /flex:\s*0\s+0\s+44px\s*!important/);
  assert.doesNotMatch(narrowSwatch, /28px/);
});

test('PikaLabのゲスト導線は44px以上の高さになる余白を持つ', () => {
  const html = readFile('pikalab/index.html');
  const guestButton = html.match(/<button[^>]+id="guest-enter-btn"[\s\S]*?<\/button>/)?.[0] ?? '';

  assert.match(guestButton, /\bpy-3\b/);
  assert.doesNotMatch(guestButton, /\bpy-2\b/);
});

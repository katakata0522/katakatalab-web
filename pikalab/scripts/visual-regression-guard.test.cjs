const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, 'visual-regression-guard.mjs'), 'utf8');

test('visual guard runs dark checks only for routes with a dark-mode contract', () => {
  assert.match(source, /route\.darkShouldBeDark \? \['light', 'dark'\] : \['light'\]/);
  assert.doesNotMatch(source, /const themes = \['light', 'dark'\]/);
});

test('optional Typing Dojo interactions cannot consume Playwright 30 second defaults', () => {
  const typingGuard = source.slice(source.indexOf('async function assertTypingDojo'));
  assert.ok(typingGuard.includes('page.setDefaultTimeout(1000);'));
});


test('visual guardはdist欠損をソースツリーで補完しない', () => {
  assert.match(source, /const server = await startStaticServer\(distDir\)/);
  assert.match(source, /function startStaticServer\(directory\)/);
  assert.doesNotMatch(source, /fallbackDirectory|fallbackPath/);
});

test('1秒intervalの高速化はTyping Dojoだけに限定する', () => {
  assert.match(source, /accelerateCountdown:\s*route\.id === 'typing-dojo'/);
  assert.match(source, /if \(accelerateCountdown\)/);
});

test('visual guardは任意の本文文字数やSpeed Readerの旧max-widthを固定しない', () => {
  assert.doesNotMatch(source, /bodyTextLength\s*<\s*80/);
  assert.doesNotMatch(source, /mainWidth\s*>\s*980/);
  assert.match(source, /bodyTextLength === 0/);
});

test('cache-bust query付きのローカルCSSも読込検証対象にする', () => {
  assert.match(source, /url\.pathname\.endsWith\('\.css'\)/);
});


test('visual guardはPikaLabカタログの未設定Labを自動的に検査対象へ追加する', () => {
  assert.match(source, /app-data\.json/);
  assert.match(source, /catalog\.apps/);
  assert.match(source, /configuredPaths/);
  assert.match(source, /const routes = \[\.\.\.configuredRoutes, \.\.\.catalogRoutes, \.\.\.additionalRoutes\]/);
});


test('visual guardはGalaxy相当と360px幅で全Labのスマホ実用性を確認する', () => {
  assert.match(source, /\{ id: 'mobile', width: 390, height: 844 \}/);
  assert.match(source, /\{ id: 'mobile-small', width: 360, height: 800 \}/);
  assert.match(source, /assertMobileUsability/);
  assert.match(source, /height: 520/);
  assert.match(source, /parents-modal-open/);
});

test('visual guardはPikaLab内のHTTP失敗・console error・ページ横はみ出しを見逃さない', () => {
  assert.match(source, /local HTTP error/);
  assert.match(source, /result\.errors\.push\(\`console error:/);
  assert.match(source, /horizontal overflow/);
  assert.doesNotMatch(source, /allowHorizontalOverflow/);
});


test('visual guardのmobile-smallは公開Labだけに限定してActions消費を抑える', () => {
  assert.match(source, /const catalogPaths = new Set/);
  assert.match(source, /const routeViewports = catalogPaths\.has\(route\.urlPath\)/);
  assert.match(source, /viewport\.id !== 'mobile-small'/);
});


test('カタログ外の記事・EduPlay・CodeStudio・Kotobaもビルド成果物から検査する', () => {
  assert.match(source, /collectPublishedHtmlRoutes\(distDir\)/);
  assert.match(source, /!coveredPaths\.has\(route\.urlPath\)/);
});

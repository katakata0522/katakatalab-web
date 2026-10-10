const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function currentAssetVersions(html) {
  const appVersion = html.match(/src="js\/app\.js\?v=([^"]+)"/)?.[1];
  const cssVersion = html.match(/href="css\/style\.css\?v=([^"]+)"/)?.[1];
  assert.ok(appVersion && cssVersion, '主要JS/CSSにcache-bust tokenが必要です');
  return { appVersion, cssVersion };
}

test('visible SVG export button is wired to ExportService.exportSVG', () => {
  const html = read('index.html');
  const ui = read('js/ui.js');

  assert.match(html, /id="btnExportSVG"/);
  assert.match(ui, /btnExportSVG:\s*document\.getElementById\('btnExportSVG'\)/);
  assert.match(ui, /btnExportSVG\.addEventListener\('click',\s*\(\)\s*=>\s*this\.\#exportSVG\(\)\)/);
  assert.match(ui, /ExportService\.exportSVG\(/);
});

test('gradient controls update endColor and validation preserves sanitized colors', () => {
  const html = read('index.html');
  const ui = read('js/ui.js');
  const validation = read('js/utils/validation.js');

  assert.match(html, /id="toggleGradient"/);
  assert.match(html, /id="paramEndColor"/);
  assert.match(ui, /gradientToggle:\s*document\.getElementById\('toggleGradient'\)/);
  assert.match(ui, /endColor:\s*document\.getElementById\('paramEndColor'\)/);
  assert.match(ui, /updateParams\(\{\s*endColor:/);
  assert.match(validation, /endColor:\s*sanitizeHexColor\(/);
});

test('history captures the pre-edit state and does not enable undo on initial load', () => {
  const app = read('js/app.js');
  const ui = read('js/ui.js');
  const state = read('js/state.js');

  assert.doesNotMatch(app, /store\.pushHistory\(\);/);
  assert.match(state, /pushHistory\(force\s*=\s*false\)/);
  assert.match(ui, /#beginHistoryCapture\(\)/);
  assert.match(ui, /this\.\#updateHistoryUI\(\);/);
  assert.doesNotMatch(ui, /store\.updateParams\(\{\s*\[key\]:\s*val\s*\},\s*true\)/);
  assert.match(ui, /store\.pushHistory\(true\)/);
});

test('cache-busted module URLs and service-worker ownership stay in sync', () => {
  const html = read('index.html');
  const sw = read('sw.js');
  const moduleFiles = [
    'js/app.js',
    'js/state.js',
    'js/ui.js',
    'js/renderers/renderer.js',
    'js/managers/BatchManager.js',
    'js/managers/index.js',
  ];

  const { appVersion, cssVersion } = currentAssetVersions(html);
  assert.match(sw, /const CACHE_NAME = 'emphasis-lines-v[^']+';/);
  assert.match(sw, /const CACHE_PREFIX = 'emphasis-lines-';/);
  assert.ok(
    sw.includes('./css/style.css?v=' + cssVersion),
    'Service Workerは公開中のCSS tokenをprecacheしてください',
  );
  assert.ok(
    sw.includes('./js/app.js?v=' + appVersion),
    'Service Workerは公開中のJS tokenをprecacheしてください',
  );

  for (const file of moduleFiles) {
    assert.doesNotMatch(read(file), /from ['"][^'"]+\.js['"]/);
  }
});

test('site footer is outside the flex app shell', () => {
  const html = read('index.html');
  const mainClose = html.indexOf('</main>');
  const footer = html.indexOf('<footer class="tool-footer"');

  assert.notEqual(mainClose, -1);
  assert.notEqual(footer, -1);
  assert.ok(footer > mainClose);
});

test('legacy root entry files are compatibility shims, not stale duplicate implementations', () => {
  const html = read('index.html');
  const { appVersion, cssVersion } = currentAssetVersions(html);
  const shims = {
    'ui.js': './js/ui.js',
    'state.js': './js/state.js',
    'renderer.js': './js/renderers/renderer.js',
    'ExportService.js': './js/services/ExportService.js',
  };

  for (const [file, target] of Object.entries(shims)) {
    const source = read(file).trim();
    assert.ok(
      source.includes(target + '?v=' + appVersion),
      file + ': 現行module versionへ委譲してください',
    );
    assert.doesNotMatch(
      source,
      /document\.getElementById|class UIManager|class Store|class LineRenderer|class ExportService/,
    );
  }

  assert.ok(
    read('style.css').includes("./css/style.css?v=" + cssVersion),
    'root style.cssは現行CSS versionへ委譲してください',
  );
});

test('guide and English pages follow the current cache token and index policy', () => {
  const html = read('index.html');
  const guide = read('guide.html');
  const english = read('en/index.html');
  const { cssVersion } = currentAssetVersions(html);

  assert.ok(guide.includes('css/style.css?v=' + cssVersion));
  assert.ok(english.includes('css/style.css?v=' + cssVersion));
  assert.doesNotMatch(guide, /テロップ|文字入れ/);
  assert.match(guide, /PNGまたはSVG形式/);
  assert.match(guide, /更新日[:：]\s*\d{4}年\d{1,2}月\d{1,2}日/);
  assert.doesNotMatch(
    guide,
    /<span style="color: #4b5563;">\|<\/span>\s*<span style="color: #4b5563;">\|<\/span>/,
  );
  assert.doesNotMatch(
    english,
    /<span style="color: #4b5563;">\|<\/span>\s*<span style="color: #4b5563;">\|<\/span>/,
  );

  for (const [label, page] of [
    ['日本語本体', html],
    ['ガイド', guide],
    ['英語版', english],
  ]) {
    assert.match(
      page,
      /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i,
      label + ': 現行index方針を維持してください',
    );
  }
});

test('noindex中のEmphasis LinesサブサイトマップはURLを掲載しない', () => {
  const sitemap = read('sitemap.xml');
  assert.equal((sitemap.match(/<loc>/g) || []).length, 0);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  ANALYTICS_SCRIPT_PATH,
  GA4_MEASUREMENT_ID,
  PUBLIC_ROOT_FILES,
  ensureAnalyticsCoverage,
  validateAnalyticsCoverage,
} = require('../.github/scripts/build-public-root.cjs');

test('公開成果物は旧GA4直書きを除去して共通ローダー1本へ統一する', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'katakatalab-ga4-'));

  try {
    fs.mkdirSync(path.join(root, 'guides'), { recursive: true });

    fs.writeFileSync(
      path.join(root, 'index.html'),
      '<!doctype html><html><head><title>Top</title></head><body></body></html>',
      'utf8',
    );

    fs.writeFileSync(
      path.join(root, 'guides', 'legacy.html'),
      `<!doctype html><html><head>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_MEASUREMENT_ID}');
</script>
</head><body></body></html>`,
      'utf8',
    );

    fs.writeFileSync(
      path.join(root, 'guides', 'shared.html'),
      `<!doctype html><html><head><script defer src="${ANALYTICS_SCRIPT_PATH}"></script></head><body></body></html>`,
      'utf8',
    );

    const result = ensureAnalyticsCoverage(root);

    assert.deepEqual(result, {
      checked: 3,
      injected: 2,
      existing: 1,
      legacyRemoved: 1,
    });

    for (const relativePath of ['index.html', 'guides/legacy.html', 'guides/shared.html']) {
      const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
      assert.equal(html.split(ANALYTICS_SCRIPT_PATH).length - 1, 1, relativePath);
      assert.doesNotMatch(html, new RegExp(GA4_MEASUREMENT_ID), relativePath);
    }

    assert.doesNotThrow(() => validateAnalyticsCoverage(root));

    const secondPass = ensureAnalyticsCoverage(root);
    assert.deepEqual(secondPass, {
      checked: 3,
      injected: 0,
      existing: 3,
      legacyRemoved: 0,
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('幼児向けページには共通Analyticsを注入せず、混入時はビルドを止める', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'katakatalab-no-child-ga4-'));
  try {
    const educationDir = path.join(root, 'lab-tools', 'kids-smile-land');
    fs.mkdirSync(educationDir, { recursive: true });
    const childPath = path.join(educationDir, 'index.html');
    const guidePath = path.join(root, 'index.html');
    fs.writeFileSync(childPath, '<!doctype html><html><head></head><body>Safe for kids</body></html>');
    fs.writeFileSync(guidePath, '<!doctype html><html><head></head><body>Normal tool</body></html>');

    const result = ensureAnalyticsCoverage(root);
    assert.deepEqual(result, { checked: 2, injected: 1, existing: 0, legacyRemoved: 0 });
    assert.doesNotMatch(fs.readFileSync(childPath, 'utf8'), /analytics\.js|googletagmanager/);
    assert.match(fs.readFileSync(guidePath, 'utf8'), /analytics\.js/);
    assert.doesNotThrow(() => validateAnalyticsCoverage(root));

    const second = ensureAnalyticsCoverage(root);
    assert.deepEqual(second, { checked: 2, injected: 0, existing: 1, legacyRemoved: 0 });

    fs.writeFileSync(childPath, '<!doctype html><html><head><script src="/analytics.js"></script></head></html>');
    assert.throws(() => ensureAnalyticsCoverage(root), /教育ページに広告・解析コード/);
    assert.throws(() => validateAnalyticsCoverage(root), /educational page must not load analytics/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('ファンサイトのトップと曲ページには解析を注入しない', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'katakatalab-fan-no-ga4-'));
  try {
    const fanDir = path.join(root, 'higedanfan');
    const songDir = path.join(fanDir, 'songs', 'white-noise');
    fs.mkdirSync(songDir, { recursive: true });
    const fanPage = path.join(fanDir, 'index.html');
    const songPage = path.join(songDir, 'index.html');
    const normalPage = path.join(root, 'index.html');
    for (const file of [fanPage, songPage, normalPage]) {
      fs.writeFileSync(file, '<!doctype html><html><head></head><body></body></html>');
    }

    assert.deepEqual(ensureAnalyticsCoverage(root), { checked: 3, injected: 1, existing: 0, legacyRemoved: 0 });
    for (const file of [fanPage, songPage]) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /analytics\.js|googletagmanager/);
    assert.match(fs.readFileSync(normalPage, 'utf8'), /analytics\.js/);
    assert.doesNotThrow(() => validateAnalyticsCoverage(root));

    fs.writeFileSync(songPage, '<!doctype html><html><head><script src="/analytics.js"></script></head></html>');
    assert.throws(() => ensureAnalyticsCoverage(root), /ファンサイトに広告・解析コード/);
    assert.throws(() => validateAnalyticsCoverage(root), /fan site must not load analytics/);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive: true, force: true });
  }
});



test('共通Analyticsは分類・ツール操作・内部回遊をPIIなしで計測する', () => {
  assert.ok(PUBLIC_ROOT_FILES.includes(ANALYTICS_SCRIPT_PATH.replace(/^\//, '')));

  const source = fs.readFileSync(path.join(__dirname, '..', 'analytics.js'), 'utf8');

  assert.match(source, new RegExp(GA4_MEASUREMENT_ID));
  assert.match(source, /content_group/);
  assert.match(source, /tool_start/);
  assert.match(source, /tool_action/);
  assert.match(source, /select_content/);
  assert.match(source, /site_search/);
  assert.match(source, /content_progress/);
  assert.match(source, /selection_source/);
  assert.match(source, /sanitizePageLocation/);
  assert.match(source, /utm_/);
  assert.doesNotMatch(source, /search_term\s*:/);
  assert.doesNotMatch(source, /input\.value[^\n]*gtag|gtag[^\n]*input\.value/);
});

test('トップの自由入力検索語は通常URLへ同期せず共有時だけURL化する', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

  assert.match(
    source,
    /buildProjectFilterUrl\(window\.location\.href, \{[\s\S]*?filter: activeFilter,[\s\S]*?query: '',[\s\S]*?\}\)/,
  );
  assert.match(
    source,
    /const shareUrl = projectFilterState[\s\S]*?buildProjectFilterUrl\(window\.location\.href, \{[\s\S]*?filter: activeFilter,[\s\S]*?query,[\s\S]*?\}\)/,
  );
  assert.match(source, /KatakataAnalytics\.trackShare/);
});

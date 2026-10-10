'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const {
  BITMAP_EXCLUSIONS, CHANNEL_TOLERANCE, DOCUMENT_HEIGHT_BASE_SHA, DOCUMENT_HEIGHT_EXPECTATIONS, VIEWPORTS,
  compareDocumentSizes, comparePixels, compareRouteSets, createRequestTracker, installSeededRandom, needsFreshContextDiagnostic, resolveServedFile,
  preservationStatus, summarizePreservation,
} = require('./visual-preservation-core.cjs');

function pixel(r = 0, g = 0, b = 0, a = 255) {
  return { width: 1, height: 1, data: Buffer.from([r, g, b, a]) };
}

test('同一RGBA画像は完全一致し、差分画像も生成する', () => {
  const comparison = comparePixels(pixel(20, 30, 40), pixel(20, 30, 40));
  assert.equal(comparison.passed, true);
  assert.equal(comparison.changedPixels, 0);
  assert.equal(comparison.rawDifferentPixels, 0);
  assert.equal(comparison.diff.data.length, 4);
});

test('1ピクセルでも2/255を超える差を不合格にし、比率の許容は設けない', () => {
  assert.equal(CHANNEL_TOLERANCE, 2);
  assert.equal(comparePixels(pixel(20), pixel(22)).passed, true);
  const comparison = comparePixels(pixel(20), pixel(23));
  assert.equal(comparison.passed, false);
  assert.equal(comparison.changedPixels, 1);
  assert.deepEqual([...comparison.diff.data], [255, 0, 0, 255]);
  assert.equal(comparePixels(pixel(0, 0, 0, 255), pixel(0, 0, 0, 252)).passed, false);
});

test('画面寸法の変化・破損したRGBA入力を検出する', () => {
  const larger = { width: 2, height: 1, data: Buffer.from([0, 0, 0, 255, 0, 0, 0, 255]) };
  const comparison = comparePixels(pixel(), larger);
  assert.equal(comparison.passed, false);
  assert.equal(comparison.sameDimensions, false);
  assert.equal(comparison.changedPixels, 1);
  assert.throws(() => comparePixels({ width: 0, height: 1, data: [] }, pixel()), /RGBA/);
  assert.throws(() => comparePixels({ width: 2, height: 1, data: [0] }, pixel()), /RGBA/);
});

test('公開ルートの追加・削除を隠さず、共通ルートも比較対象に残す', () => {
  const routes = paths => paths.map(urlPath => ({ urlPath }));
  assert.deepEqual(compareRouteSets(routes(['/', '/old/']), routes(['/', '/new/'])), {
    added: ['/new/'], removed: ['/old/'], common: ['/'],
  });
});

test('同じseedは隔離ページ間で同じ乱数列を生成する', () => {
  const sample = seed => vm.runInNewContext(`(${installSeededRandom.toString()})({seed:${seed}}); Array.from({length:20},()=>Math.random()).join(',')`);
  assert.equal(sample(142), sample(142));
  assert.notEqual(sample(142), sample(143));
  for (const value of sample(142).split(',').map(Number)) assert.ok(value >= 0 && value < 1);
});

test('配信元は指定distだけであり、親パス・symlink経由の漏出を拒否する', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-preservation-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const dist = path.join(temp, 'dist');
  fs.mkdirSync(path.join(dist, 'lab'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'lab', 'index.html'), 'test');
  fs.writeFileSync(path.join(temp, 'outside.txt'), 'outside');
  fs.symlinkSync(path.join(temp, 'outside.txt'), path.join(dist, 'escape.txt'));
  assert.equal(resolveServedFile(dist, '/lab/'), path.join(dist, 'lab', 'index.html'));
  for (const url of ['/../outside.txt', '/%2e%2e/outside.txt', '/escape.txt', '/missing', '/bad%ZZ', '/a%00b', '/a%5cb']) {
    assert.equal(resolveServedFile(dist, url), null, url);
  }
});

test('既存Playwrightの明示exportからPNG codecを利用できる', () => {
  // グローバル環境のpngjs/pixelmatchに依存しない。lock更新時にもこの契約を検証する。
  const { PNG } = require('playwright-core/lib/utilsBundle');
  const original = pixel(120, 40, 200);
  const decoded = PNG.sync.read(PNG.sync.write(original));
  assert.equal(comparePixels(original, decoded).passed, true);
});

test('要求された2画面幅のみ比較し、除外はDeepsea装飾worker bitmapだけとする', () => {
  assert.deepEqual(VIEWPORTS.map(({ width, height }) => [width, height]), [[1366, 900], [390, 844]]);
  assert.deepEqual(Object.keys(BITMAP_EXCLUSIONS), ['/deepsea_lab/']);
  assert.equal(BITMAP_EXCLUSIONS['/deepsea_lab/'][0].selector, '#particle-canvas');
  assert.ok(BITMAP_EXCLUSIONS['/deepsea_lab/'][0].reason);
});

test('runnerはCI外ではブラウザを起動せず明示的に失敗する', () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'visual-preservation.mjs')], {
    encoding: 'utf8', env: { ...process.env, CI: 'false' }, timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CI専用/);
});

test('runnerの証跡には両commit・bitmap除外理由・固定時計・全ルート差分が含まれる', () => {
  const source = fs.readFileSync(path.join(__dirname, 'visual-preservation.mjs'), 'utf8');
  assert.match(source, /baselineCommit: process\.env\.VISUAL_BASE_SHA/);
  assert.match(source, /candidateCommit: process\.env\.VISUAL_CANDIDATE_SHA/);
  assert.match(source, /bitmapExclusions: BITMAP_EXCLUSIONS/);
  assert.match(source, /fixedTime: FIXED_TIME/);
  assert.match(source, /routeSets\.common\.flatMap/);
  assert.match(source, /summarizePreservation\(report\.routeSets, results\)/);
  assert.match(source, /allowedChangedPixels: 0/);
  assert.match(source, /context\.serviceWorkers\(\)\.length/);
  assert.match(source, /ServiceWorkerContainer\.prototype\.register/);
  assert.match(source, /result\.sha256 = digest\(screenshot\)/);
  assert.doesNotMatch(source, /continue-on-error|allowHorizontalOverflow|ignoreHTTPSErrors/);
});

test('asset待機は実HTTPの完了/失敗を待ち、srcdoc lifecycleへ依存しない', async () => {
  const context = new EventEmitter();
  const tracker = createRequestTracker(context, () => false, { idleMs: 5, timeoutMs: 200 });
  const first = { url: () => 'https://example.test/font.woff2' };
  const second = { url: () => 'https://example.test/frame.js' };
  context.emit('request', first);
  let done = false;
  const settled = tracker.wait().then(() => { done = true; });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(done, false);
  context.emit('request', second);
  context.emit('requestfinished', first);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(done, false);
  context.emit('requestfailed', second);
  await settled;
  assert.equal(done, true);
});

test('未完了assetをURL付きで不合格にし、広告除外と非HTTP要求だけは待たない', async () => {
  const context = new EventEmitter();
  const tracker = createRequestTracker(context, request => request.url().includes('/ad/'), { idleMs: 5, timeoutMs: 30 });
  for (const url of ['https://example.test/ad/script.js', 'data:image/png;base64,AA', 'about:srcdoc']) {
    context.emit('request', { url: () => url });
  }
  await tracker.wait();
  const stalled = { url: () => 'https://example.test/stalled.js' };
  context.emit('request', stalled);
  await assert.rejects(tracker.wait(), /stalled\.js/);
  context.emit('requestfinished', stalled);
  await tracker.wait();
});

test('同page再撮影はDOM/時計と厳密pixel差を記録し、cross-version判定の免除にしない', () => {
  const source = fs.readFileSync(path.join(__dirname, 'visual-preservation.mjs'), 'utf8');
  assert.match(source, /result\.repeatCapture =/);
  assert.match(source, /comparePixels\(PNG\.sync\.read\(screenshot\), PNG\.sync\.read\(repeat\)\)/);
  assert.match(source, /stateUnchanged:/);
  assert.match(source, /domSha256: digest\(html\)/);
  assert.match(source, /if \(result\.comparison && !result\.comparison\.passed\)/);
  assert.match(source, /result\.comparison\.manualReviewRequired = true/);
  assert.doesNotMatch(source, /result\.comparison\.passed\s*=|result\.errors\.push\(`pixel差分:/);
  assert.doesNotMatch(source, /waitForLoadState\('networkidle'/);
});

test('生の画素不一致だけはreview_requiredとして残し、自動合格・承認にしない', () => {
  const routeSets={common:['/'],added:[],removed:[]};
  const comparison=comparePixels(pixel(20),pixel(23));
  const result={errors:[],comparison};
  const summary=summarizePreservation(routeSets,[result],1);
  assert.equal(summary.strictPixelFailures,1);
  assert.equal(summary.failedComparisons,0);
  assert.equal(summary.manualReviewRequired,true);
  assert.equal(preservationStatus(summary),'review_required');
  assert.equal(comparison.passed,false);
  assert.deepEqual(result.errors,[]);
  const passed=summarizePreservation(routeSets,[{errors:[],comparison:comparePixels(pixel(20),pixel(20))}],1);
  assert.equal(preservationStatus(passed),'passed');
  assert.equal(passed.manualReviewRequired,false);
});

test('画素レビュー契約はroute・geometry・実行時・asset・時計・読込・未検証を免除しない', () => {
  const routes={common:['/'],added:[],removed:[]};
  const comparison=()=>comparePixels(pixel(20),pixel(23));
  for(const error of ['pageerror','asset request failed','初期時計/RAF位相','撮影時計/RAF位相',
    'capture timeout','document寸法変更','除外bitmap位置変更','candidate fresh1: local HTTP 404']) {
    const summary=summarizePreservation(routes,[{errors:[error],comparison:comparison()}],1);
    assert.equal(preservationStatus(summary),'failed',error);
    assert.equal(summary.strictPixelFailures,1);
    assert.equal(summary.manualReviewRequired,true);
  }
  for(const result of [{errors:[],comparison:null},
    {errors:[],comparison:{...comparison(),sameDimensions:false}},
    {errors:[],comparison:{...comparison(),documentSize:{passed:false}}}]) {
    assert.equal(preservationStatus(summarizePreservation(routes,[result],1)),'failed');
  }
  assert.equal(preservationStatus(summarizePreservation(routes,[],1)),'failed');
  for(const changed of [{...routes,added:['/new/']},{...routes,removed:['/old/']}]) {
    assert.equal(preservationStatus(summarizePreservation(changed,[{errors:[],comparison:comparison()}],1)),'failed');
  }
});

test('runnerは画素レビューとblocking失敗を分離し、補助captureの決定的エラーも残す', () => {
  const source=fs.readFileSync(path.join(__dirname,'visual-preservation.mjs'),'utf8');
  assert.match(source,/report\.status = preservationStatus\(report\.summary\)/);
  assert.match(source,/if \(report\.status === 'failed'\) \{\s*throw new Error/);
  assert.match(source,/report\.manualReviewRequired = report\.summary\.manualReviewRequired/);
  assert.match(source,/result\.errors\.push\(\.\.\.target\[side\]\.errors\.map/);
  assert.match(source,/if \(!comparison\.sameDimensions\) result\.errors\.push/);
  assert.match(source,/review_required.*strictPixelFailures/s);
  assert.match(source,/マージ前.*独立レビュー/);
  assert.doesNotMatch(source,/continue-on-error|renderingVariance|assessRenderingVariance|VERIFIED_RENDER_VARIANCE/);
  assert.doesNotMatch(source,/comparison\.passed\s*=\s*true|errors\.(?:splice|pop)\(/);
  const guidance=fs.readFileSync(path.join(__dirname,'visual-preservation-review.md'),'utf8');
  assert.match(guidance,/review_required/);
  assert.match(guidance,/マージ前/);
  assert.match(guidance,/独立レビュー/);
});

test('改善しなかった描画switchを撤回し、CSS・GPU・font描画方式も上書きしない', () => {
  const source = fs.readFileSync(path.join(__dirname, 'visual-preservation.mjs'), 'utf8');
  assert.match(source, /chromium\.launch\(\{ headless: true, timeout: 15000 \}\)/);
  assert.doesNotMatch(source, /--disable-gpu|--font-render-hinting|--deterministic-mode|--enable-begin-frame-control|CHROMIUM_RENDER_ARGS/);
});

test('新規context診断はDeepsea mobileだけに限定し、最初の比較を置き換えない', () => {
  for (const viewport of VIEWPORTS) {
    for (const route of ['/deepsea_lab/', '/deepsea_lab/?other=1', '/space_lab/', '/']) {
      assert.equal(needsFreshContextDiagnostic(route, viewport.id), route === '/deepsea_lab/' && viewport.id === 'mobile');
    }
  }
  const source = fs.readFileSync(path.join(__dirname, 'visual-preservation.mjs'), 'utf8');
  const start = source.indexOf('if (needsFreshContextDiagnostic(task.urlPath, task.viewport.id))');
  const end = source.indexOf('\n      results.push(result);', start);
  const diagnostic = source.slice(start, end);
  assert.match(diagnostic, /replacesStrictComparison: false/);
  assert.match(diagnostic, /for \(const sample of \[1, 2\]\)/);
  assert.match(diagnostic, /baselineVsBaseline/);
  assert.match(diagnostic, /candidateVsCandidate/);
  assert.match(diagnostic, /freshBaselineVsCandidate/);
  assert.doesNotMatch(diagnostic, /result\.comparison\s*=|result\.errors\s*=|result\.errors\.(?:pop|splice)/);
  assert.match(source, /result\.radarDiagnostics =/);
  assert.equal(CHANNEL_TOLERANCE, 2);
  assert.deepEqual(Object.keys(BITMAP_EXCLUSIONS), ['/deepsea_lab/']);
});

test('事実訂正8記事の文書高だけを記録付きで許容し、幅・画素・他ルートを免除しない', () => {
  const expectedRoutes = [
    'curiosity-and-questions', 'independent-science-projects', 'starting-homework-routine',
    'teaching-children-at-home', 'how-to-praise-children', 'math-difficulty-support',
    'morning-school-reluctance', 'skills-for-ai-era',
  ].map(name => `/articles/${name}.html`).sort();
  assert.deepEqual(Object.keys(DOCUMENT_HEIGHT_EXPECTATIONS).sort(), expectedRoutes);
  const baseline = { width: 390, height: 4000 };
  for (const route of expectedRoutes) {
    const result = compareDocumentSizes(route, baseline, { width: 390, height: 4060 }, DOCUMENT_HEIGHT_BASE_SHA);
    assert.equal(result.passed, true);
    assert.equal(result.allowedHeightChange, true);
    assert.equal(result.heightDelta, 60);
    assert.equal(result.widthDelta, 0);
    assert.ok(result.expectedHeightChangeReason.includes('訂正'));
    assert.equal(compareDocumentSizes(route, baseline, { width: 391, height: 4060 }, DOCUMENT_HEIGHT_BASE_SHA).passed, false);
    assert.equal(compareDocumentSizes(route, baseline, baseline).allowedHeightChange, false);
  }
  for (const route of ['/articles/', '/articles/smart-child.html', '/unknown/', '/articles/skills-for-ai-era.html?other=1']) {
    assert.equal(compareDocumentSizes(route, baseline, { width: 390, height: 4001 }).passed, false);
  }
  assert.equal(comparePixels(pixel(20), pixel(23)).passed, false);
  assert.throws(() => compareDocumentSizes(expectedRoutes[0], baseline, { width: 390 }), /文書寸法/);
});


test('事実訂正の高さ例外を訂正済みの後続コミットへ持ち越さない', () => {
  const before = {width:390,height:4000}; const after = {width:390,height:4060};
  for (const route of Object.keys(DOCUMENT_HEIGHT_EXPECTATIONS)) {
    assert.equal(compareDocumentSizes(route, before, after).passed, false);
    assert.equal(compareDocumentSizes(route, before, after, 'unrelated-baseline').passed, false);
    assert.equal(compareDocumentSizes(route, before, after, DOCUMENT_HEIGHT_BASE_SHA).passed, true);
  }
});

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const CHANNEL_TOLERANCE = 2;
const VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'desktop', width: 1366, height: 900 }),
  Object.freeze({ id: 'mobile', width: 390, height: 844 }),
]);

// worker の乱数・時計はページの仮想時計と同期しない。DOMは残し、粒子bitmapだけを除外する。
const BITMAP_EXCLUSIONS = Object.freeze({
  '/deepsea_lab/': Object.freeze([Object.freeze({
    selector: '#particle-canvas',
    reason: 'OffscreenCanvas workerの独立した乱数・時計による装飾粒子。bitmapのみ除外し、canvasの位置・寸法は比較する。',
  })]),
});

// 今回確認した基準コミットからの事実訂正だけに限定し、後続PRには例外を持ち越さない。
const DOCUMENT_HEIGHT_BASE_SHA = '0922c0e8474050d832f492d884b986f83d3408d4';
const DOCUMENT_HEIGHT_EXPECTATIONS = Object.freeze({
  '/articles/curiosity-and-questions.html': 'Bonawitz/Jiroutの誤った出典URLを一次資料へ訂正したことによる参考文献の折り返し',
  '/articles/independent-science-projects.html': 'Bonawitzの誤ったPMIDを訂正したことによる参考文献の折り返し',
  '/articles/starting-homework-routine.html': 'Langberg研究の対象・結論・書誌・出典URLの訂正による本文と参考文献の折り返し',
  '/articles/teaching-children-at-home.html': '研究種別とPomerantz/Grolnick出典URLの訂正による本文と参考文献の折り返し',
  '/articles/how-to-praise-children.html': 'Brummelman研究の著者順・著者名・掲載ページの訂正による参考文献の折り返し',
  '/articles/math-difficulty-support.html': '算数不安レビューの著者名の訂正による参考文献の折り返し',
  '/articles/morning-school-reluctance.html': 'COCOLOプランの誤った公的資料URLの訂正による参考文献の折り返し',
  '/articles/skills-for-ai-era.html': 'OECDの3能力と文科省資料URLの訂正による本文と参考文献の折り返し',
});

function compareDocumentSizes(urlPath, baseline, candidate, baselineCommit = null) {
  for (const size of [baseline, candidate]) {
    if (!size || !Number.isSafeInteger(size.width) || !Number.isSafeInteger(size.height)
        || size.width <= 0 || size.height < 0) throw new Error('文書寸法が不正です');
  }
  const widthDelta = candidate.width - baseline.width;
  const heightDelta = candidate.height - baseline.height;
  const expectedHeightChangeReason = baselineCommit === DOCUMENT_HEIGHT_BASE_SHA
    ? DOCUMENT_HEIGHT_EXPECTATIONS[urlPath] || null : null;
  const allowedHeightChange = heightDelta !== 0 && Boolean(expectedHeightChangeReason);
  return {
    passed: widthDelta === 0 && (heightDelta === 0 || allowedHeightChange),
    baseline, candidate, widthDelta, heightDelta, allowedHeightChange, expectedHeightChangeReason,
  };
}

function compareRouteSets(baseline, candidate) {
  const before = new Set(baseline.map(route => route.urlPath));
  const after = new Set(candidate.map(route => route.urlPath));
  return {
    added: [...after].filter(route => !before.has(route)).sort(),
    removed: [...before].filter(route => !after.has(route)).sort(),
    common: [...before].filter(route => after.has(route)).sort(),
  };
}

function needsFreshContextDiagnostic(urlPath, viewportId) {
  return urlPath === '/deepsea_lab/' && viewportId === 'mobile';
}

// 新規before/afterの画素差だけは独立レビューへ渡す。決定的エラーや未検証は失敗のまま。
function summarizePreservation(routeSets, results, viewportCount = VIEWPORTS.length) {
  const strictPixelFailures = results.filter(result => result.comparison?.passed === false).length;
  return {
    expectedComparisons: routeSets.common.length * viewportCount,
    processedTasks: results.length,
    completedComparisons: results.filter(result => result.comparison != null).length,
    failedComparisons: results.filter(result => result.errors.length || !result.comparison
      || result.comparison.sameDimensions === false || result.comparison.documentSize?.passed === false).length,
    strictPixelFailures,
    manualReviewRequired: strictPixelFailures > 0,
    routeSetChanged: Boolean(routeSets.added.length || routeSets.removed.length),
  };
}

function preservationStatus(summary) {
  if (summary.failedComparisons || summary.routeSetChanged
      || summary.completedComparisons !== summary.expectedComparisons) return 'failed';
  return summary.manualReviewRequired ? 'review_required' : 'passed';
}

function validateImage(image) {
  if (!Number.isSafeInteger(image.width) || !Number.isSafeInteger(image.height)
      || image.width < 1 || image.height < 1
      || image.data?.length !== image.width * image.height * 4) {
    throw new Error('RGBA画像の寸法・バッファ長が不正です');
  }
}

function comparePixels(baseline, candidate) {
  validateImage(baseline);
  validateImage(candidate);
  const sameDimensions = baseline.width === candidate.width && baseline.height === candidate.height;
  const width = Math.max(baseline.width, candidate.width);
  const height = Math.max(baseline.height, candidate.height);
  const diff = { width, height, data: Buffer.alloc(width * height * 4) };
  let changedPixels = 0;
  let rawDifferentPixels = 0;
  let maximumChannelDelta = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const beforeOffset = (y * baseline.width + x) * 4;
      const afterOffset = (y * candidate.width + x) * 4;
      const outputOffset = (y * width + x) * 4;
      const missing = x >= baseline.width || y >= baseline.height
        || x >= candidate.width || y >= candidate.height;
      let delta = missing ? 255 : 0;
      if (!missing) {
        for (let channel = 0; channel < 4; channel += 1) {
          delta = Math.max(delta, Math.abs(baseline.data[beforeOffset + channel] - candidate.data[afterOffset + channel]));
        }
      }
      maximumChannelDelta = Math.max(maximumChannelDelta, delta);
      if (delta > 0) rawDifferentPixels += 1;
      const changed = delta > CHANNEL_TOLERANCE;
      if (changed) changedPixels += 1;
      // 赤が閾値超過、薄い灰色が比較元。アンチエイリアス領域も除外しない。
      const gray = missing ? 255 : Math.round(180 + (baseline.data[beforeOffset]
        + baseline.data[beforeOffset + 1] + baseline.data[beforeOffset + 2]) / 3 * 75 / 255);
      diff.data[outputOffset] = changed ? 255 : gray;
      diff.data[outputOffset + 1] = changed ? 0 : gray;
      diff.data[outputOffset + 2] = changed ? 0 : gray;
      diff.data[outputOffset + 3] = 255;
    }
  }
  return {
    passed: sameDimensions && changedPixels === 0,
    sameDimensions,
    changedPixels,
    rawDifferentPixels,
    maximumChannelDelta,
    channelTolerance: CHANNEL_TOLERANCE,
    diff,
  };
}

function resolveServedFile(directory, pathname) {
  const root = fs.realpathSync(directory);
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  let target = path.resolve(root, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
  const inside = value => value.startsWith(`${root}${path.sep}`);
  if (target !== root && !inside(target)) return null;
  try {
    if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    target = fs.realpathSync(target);
    return inside(target) && fs.statSync(target).isFile() ? target : null;
  } catch { return null; }
}

// addInitScriptへそのまま渡すため、この関数は外側の変数を参照しない。
function installSeededRandom({ seed }) {
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Playwright 1.60の公開Clockは注入直後にresumeし、操作logを最初の時計参照まで
// 遅延再生する。load待ち中にnative timerが動くため、停止状態から同期的に導入する。
// 独自timer実装は作らず、lock済み依存の同じ時計を使う。配置/API変更時は明示的に失敗する。
function createClockBootstrap({ fixedTime, seed }) {
  if (!Number.isSafeInteger(fixedTime)) throw new Error('固定時計のepochが不正です');
  const bundle = fs.readFileSync(require.resolve('playwright-core/lib/coreBundle'), 'utf8');
  const line = bundle.split('\n').find(value => value.trimStart().startsWith('source = ')
    && value.includes('packages/injected/src/clock.ts'));
  if (!line) throw new Error('Playwrightのclock実装配置が変わりました。比較用bootstrapを再検証してください。');
  const source = vm.runInNewContext(line.trim().slice('source = '.length).replace(/;$/, ''), {}, { timeout: 1000 });
  return `(() => {
    (${installSeededRandom.toString()})({ seed: ${seed >>> 0} });
    (${blockServiceWorkerRegistration.toString()})();
    const module = { exports: {} };
    ${source}
    const { clock } = module.exports.install()(globalThis, { browserName: 'chromium' });
    clock.install(${fixedTime});
    Object.defineProperty(globalThis, '__pikalabVisualClock', { value: {
      async advanceTo(ticks) {
        const current = clock.performanceNow();
        if (!Number.isSafeInteger(ticks) || ticks < current) throw new Error('比較時計を過去へ戻せません');
        await clock.runFor(ticks - current);
      }
    } });
  })();`;
}

// serviceWorkers:'block'の注入はnavigator.serviceWorker getterを読み、sandbox内で
// SecurityErrorになる。prototypeで登録だけを停止し、iframeのsandboxを変更しない。
function blockServiceWorkerRegistration() {
  if (typeof ServiceWorkerContainer !== 'undefined') {
    ServiceWorkerContainer.prototype.register = async () => undefined;
  }
}

// networkidleはsrcdoc frameのlifecycleにも依存する。実HTTP要求を全contextで追跡し、
// 失敗/完了まで待つ。未完了assetがあればURL付きで失敗し、単なるsleepへ退化させない。
function createRequestTracker(context, ignoredRequest, { idleMs = 500, timeoutMs = 8000 } = {}) {
  const pending = new Set();
  const observers = new Set();
  const changed = () => { for (const observer of observers) observer(); };
  context.on('request', request => {
    if (!/^https?:/.test(request.url()) || ignoredRequest(request)) return;
    pending.add(request);
    changed();
  });
  const finished = request => { if (pending.delete(request)) changed(); };
  context.on('requestfinished', finished);
  context.on('requestfailed', finished);
  return {
    wait() {
      return new Promise((resolve, reject) => {
        let idleTimer;
        const cleanup = () => { clearTimeout(idleTimer); clearTimeout(deadline); observers.delete(observe); };
        const observe = () => {
          clearTimeout(idleTimer);
          if (!pending.size) idleTimer = setTimeout(() => { cleanup(); resolve(); }, idleMs);
        };
        const deadline = setTimeout(() => {
          const urls = [...pending].map(request => request.url());
          cleanup();
          reject(new Error(`asset要求が${timeoutMs}msで完了しませんでした: ${urls.join(', ')}`));
        }, timeoutMs);
        observers.add(observe);
        observe();
      });
    },
  };
}

module.exports = {
  BITMAP_EXCLUSIONS, CHANNEL_TOLERANCE, DOCUMENT_HEIGHT_BASE_SHA, DOCUMENT_HEIGHT_EXPECTATIONS, VIEWPORTS,
  blockServiceWorkerRegistration, compareDocumentSizes, comparePixels, compareRouteSets,
  createClockBootstrap, createRequestTracker, installSeededRandom, needsFreshContextDiagnostic, resolveServedFile,
  preservationStatus, summarizePreservation,
};

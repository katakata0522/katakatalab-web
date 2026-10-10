import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import core from './visual-preservation-core.cjs';
import publishedRoutes from './published-html-routes.cjs';

const require = createRequire(import.meta.url);
const { PNG } = require('playwright-core/lib/utilsBundle');
const { BITMAP_EXCLUSIONS, CHANNEL_TOLERANCE, DOCUMENT_HEIGHT_EXPECTATIONS, VIEWPORTS, compareDocumentSizes, comparePixels,
  compareRouteSets, createClockBootstrap, createRequestTracker, needsFreshContextDiagnostic, preservationStatus,
  resolveServedFile, summarizePreservation } = core;
const { collectPublishedHtmlRoutes } = publishedRoutes;
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(project, 'visual-guard-artifacts', 'preservation');
const FIXED_TIME = '2026-01-15T03:00:00.000Z';
const SEED = 0x50494b41;
const CAPTURE_TIMEOUT_MS = 25000;
const SUITE_TIMEOUT_MS = 240000;
const blockedHosts = ['googlesyndication.com', 'doubleclick.net', 'adtrafficquality.google', 'googletagmanager.com'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];
const externalResources = new Map();
const excludedRequests = new Set();
let externalBytes = 0;
let browser;
const servers = [];
let report;

function writeReport() {
  if (!report) return;
  report.results = results;
  report.externalResources = [...externalResources.entries()].map(([url, entry]) => ({ url, ...entry.metadata }));
  report.excludedRequests = [...excludedRequests].sort();
  report.summary = summarizePreservation(report.routeSets, results);
  report.manualReviewRequired = report.summary.manualReviewRequired;
  fs.writeFileSync(path.join(artifacts, 'reports', 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  // ローカルでのブラウザ制限を回避しない。この比較は許可されたCIだけで実行する。
  if (process.env.CI !== 'true') throw new Error('before/afterブラウザ比較はCI専用です。ローカルではnode --test scripts/visual-preservation.test.cjsを実行してください。');
  if (!process.argv[2]) throw new Error('使用法: node scripts/visual-preservation.mjs <baseline-dist> [candidate-dist]');
  const baselineDir = fs.realpathSync(path.resolve(process.argv[2]));
  const candidateDir = fs.realpathSync(path.resolve(process.argv[3] || path.join(project, 'dist')));
  if (baselineDir === candidateDir || baselineDir.startsWith(`${candidateDir}${path.sep}`)
      || candidateDir.startsWith(`${baselineDir}${path.sep}`)) {
    throw new Error('baselineとcandidateは独立したbuildディレクトリである必要があります');
  }
  const routeSets = compareRouteSets(collectPublishedHtmlRoutes(baselineDir), collectPublishedHtmlRoutes(candidateDir));
  if (!routeSets.common.length) throw new Error('共通の公開HTMLルートがありません');
  for (const group of ['before', 'after', 'diff']) {
    for (const viewport of VIEWPORTS) fs.mkdirSync(path.join(artifacts, group, viewport.id), { recursive: true });
  }
  fs.mkdirSync(path.join(artifacts, 'reports'), { recursive: true });
  report = {
    startedAt: new Date().toISOString(),
    baselineCommit: process.env.VISUAL_BASE_SHA || null,
    candidateCommit: process.env.VISUAL_CANDIDATE_SHA || null,
    baselineDir, candidateDir, routeSets, viewports: VIEWPORTS,
    settings: {
      seed: SEED, fixedTime: FIXED_TIME, timezone: 'Asia/Tokyo', locale: 'ja-JP', colorScheme: 'light',
      storage: '各ページは新しいcontext。storage/cookieなし。トップは初回画面。',
      scope: '公開HTMLの初期viewport。スクロール後・操作後・dark mode・ゲームプレイ全体の同一性は証明しない。',
      animations: 'CSS/Web AnimationsはPlaywright animations:disabled。caret:hidden。JS時計/RAFを決定的に進めて停止。',
      clock: 'lock済みPlaywrightの時計を単一init scriptで停止状態から導入。初期Date/performance/timeOriginと各frameの最終位相を検証。',
      serviceWorkers: '新規contextでServiceWorkerContainer.prototype.registerを停止。sandboxのorigin権限は変更しない。',
      repeatCapture: '時計を進めず同pageを再撮影し、DOM/時計の前後hashと画素差を記録。診断専用で比較合否・閾値を変更しない。',
      renderer: '既定Chromium。CI808で改善しなかった追加compositor flagsは撤回。',
      freshContextDiagnostic: 'Deepsea mobileのみ各版3contextを事前固定。成功までのretryはせず、同一版の描画差を診断証跡として残す。',
      reviewContract: '新規before/after比較の生の画素不一致だけはreview_required。strict結果を保持し、マージ前に独立レビューが必須。自動承認ではない。route・寸法・実行時/asset/時計/読込エラーと既存品質検査は引き続きblocking。',
      manualReviewInstructions: 'pikalab/scripts/visual-preservation-review.md',
      externalResources: '広告・追跡hostを除外。他のGETは同じURLの応答bytesを一度取得し両版へ再生。失敗は不合格。',
      channelTolerance: CHANNEL_TOLERANCE, allowedChangedPixels: 0,
      toleranceReason: 'RGBA各channelの最大2/255のみ丸め誤差として許容。差分ピクセル割合・AA領域の免除なし。',
      bitmapExclusions: BITMAP_EXCLUSIONS,
      documentHeightExpectations: DOCUMENT_HEIGHT_EXPECTATIONS,
      captureTimeoutMs: CAPTURE_TIMEOUT_MS, suiteTimeoutMs: SUITE_TIMEOUT_MS,
    },
    status: 'running', results: [],
  };
  writeReport();
  for (const directory of [baselineDir, candidateDir]) servers.push(await startServer(directory));
  const origins = servers.map(server => `http://127.0.0.1:${server.address().port}`);
  browser = await chromium.launch({ headless: true, timeout: 15000 });
  report.browser = { version: browser.version(), playwright: require('playwright/package.json').version };
  const tasks = routeSets.common.flatMap(urlPath => VIEWPORTS.map(viewport => ({ urlPath, viewport })));
  const deadline = Date.now() + SUITE_TIMEOUT_MS;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (tasks.length) {
      const task = tasks.shift();
      const result = { ...task, errors: [], baseline: null, candidate: null, comparison: null };
      if (Date.now() >= deadline) {
        result.errors.push('suiteの時間上限に達したため未比較。合格として扱わない。');
      } else {
        const name = `${task.urlPath.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'top'}-${digest(task.urlPath).slice(0, 8)}-${task.viewport.id}`;
        for (const [index, side] of ['baseline', 'candidate'].entries()) {
          try {
            result[side] = await capture(origins[index], task, `${index === 0 ? 'before' : 'after'}/${task.viewport.id}/${name}`);
            result.errors.push(...result[side].errors.map(error => `${side}: ${error}`));
          } catch (error) {
            result.errors.push(`${side}: ${String(error.message || error).slice(0, 700)}`);
          }
        }
        if (result.baseline?.screenshot && result.candidate?.screenshot) {
          const before = PNG.sync.read(fs.readFileSync(path.join(artifacts, result.baseline.screenshot)));
          const after = PNG.sync.read(fs.readFileSync(path.join(artifacts, result.candidate.screenshot)));
          const { diff, ...comparison } = comparePixels(before, after);
          comparison.diff = `diff/${task.viewport.id}/${name}.png`;
          fs.writeFileSync(path.join(artifacts, comparison.diff), PNG.sync.write(diff));
          result.comparison = comparison;
          if (!comparison.sameDimensions) result.errors.push('撮影画像の寸法が変化しました');
          if (JSON.stringify(result.baseline.excludedBitmapGeometry) !== JSON.stringify(result.candidate.excludedBitmapGeometry)) {
            result.errors.push('除外bitmapの位置・寸法・可視性が変化しました');
          }
          comparison.documentSize = compareDocumentSizes(task.urlPath, result.baseline.documentSize, result.candidate.documentSize, report.baselineCommit);
          if (!comparison.documentSize.passed) {
            result.errors.push(`documentのscroll寸法が変化しました: width ${comparison.documentSize.widthDelta}px / height ${comparison.documentSize.heightDelta}px`);
          }
        }
        if (needsFreshContextDiagnostic(task.urlPath, task.viewport.id)) {
          result.freshContext = { baseline: null, candidate: null, additional: {}, comparisons: {}, replacesStrictComparison: false };
          for (const sample of [1, 2]) {
            for (const [index, side] of ['baseline', 'candidate'].entries()) {
              const target = sample === 1 ? result.freshContext : result.freshContext.additional;
              target[side] = await capture(origins[index], task,
                `${index === 0 ? 'before' : 'after'}/${task.viewport.id}/${name}-fresh${sample}`);
              result.errors.push(...target[side].errors.map(error => `${side} fresh${sample}: ${error}`));
            }
          }
          for (const [label, before, after] of [
            ['baselineVsBaseline', result.baseline, result.freshContext.baseline],
            ['candidateVsCandidate', result.candidate, result.freshContext.candidate],
            ['freshBaselineVsCandidate', result.freshContext.baseline, result.freshContext.candidate],
            ['baselineVsBaseline2', result.baseline, result.freshContext.additional.baseline],
            ['candidateVsCandidate2', result.candidate, result.freshContext.additional.candidate],
          ]) {
            if (!before?.screenshot || !after?.screenshot) continue;
            const { diff, ...comparison } = comparePixels(
              PNG.sync.read(fs.readFileSync(path.join(artifacts, before.screenshot))),
              PNG.sync.read(fs.readFileSync(path.join(artifacts, after.screenshot))));
            comparison.diff = `diff/${task.viewport.id}/${name}-${label}.png`;
            fs.writeFileSync(path.join(artifacts, comparison.diff), PNG.sync.write(diff));
            result.freshContext.comparisons[label] = comparison;
            console.log(`[preservation diagnostic] ${task.urlPath} ${task.viewport.id} ${label}: ${comparison.changedPixels}px`);
          }
        }
        if (result.comparison && !result.comparison.passed) {
          result.comparison.manualReviewRequired = true;
          console.warn(`[preservation REVIEW_REQUIRED] ${task.urlPath} ${task.viewport.id}: strict pixel差分 ${result.comparison.changedPixels}px (channel許容${CHANNEL_TOLERANCE}/255)。マージ前の独立レビューが必須です。自動承認ではありません。`);
        }
      }
      results.push(result);
      writeReport();
      console.log(`[preservation ${result.errors.length ? 'FAIL' : result.comparison?.manualReviewRequired ? 'REVIEW_REQUIRED' : 'OK'} ${results.length}/${routeSets.common.length * VIEWPORTS.length}] ${task.urlPath} ${task.viewport.id}${result.errors.length ? `: ${result.errors.join('; ')}` : ''}`);
    }
  }));
  report.status = preservationStatus(report.summary);
  report.finishedAt = new Date().toISOString();
  writeReport();
  if (report.status === 'failed') {
    throw new Error(`before/after比較に失敗: ${report.summary.failedComparisons}件、route追加${routeSets.added.length}・削除${routeSets.removed.length}。report.jsonとbefore/after/diffを確認してください。例外は自動承認しません。`);
  }
  if (report.status === 'review_required') {
    console.warn(`[preservation] review_required: ${report.summary.strictPixelFailures}件の厳密画素不一致。決定的検査は完了しましたが、表示維持の合格ではありません。reportと画像をマージ前に独立レビューしてください。`);
  } else {
    console.log(`[preservation] ${routeSets.common.length} routes × ${VIEWPORTS.length} viewports passed`);
  }
}

async function capture(origin, task, name) {
  const context = await browser.newContext({
    viewport: { width: task.viewport.width, height: task.viewport.height },
    deviceScaleFactor: 1, locale: 'ja-JP', timezoneId: 'Asia/Tokyo', colorScheme: 'light',
  });
  let timeout;
  try {
    return await Promise.race([
      inspect(context, origin, task, name),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(`captureが${CAPTURE_TIMEOUT_MS}msで終了しませんでした`)), CAPTURE_TIMEOUT_MS); }),
    ]);
  } catch (error) {
    const failed = { errors: [String(error.message || error).slice(0, 700)], screenshot: null, diagnosticScreenshot: null };
    const page = context.pages()[0];
    if (page && !page.isClosed()) {
      const diagnostic = `${name}-failed.png`;
      try {
        await page.screenshot({ path: path.join(artifacts, diagnostic), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 3000 });
        failed.diagnosticScreenshot = diagnostic;
      } catch { /* JSONの失敗理由は必ず残す。診断画像の失敗で元の理由を置き換えない。 */ }
    }
    return failed;
  } finally {
    clearTimeout(timeout);
    await context.close();
  }
}

async function inspect(context, origin, task, name) {
  const result = { errors: [], excludedBitmapGeometry: [], screenshot: null, rawScreenshot: null };
  const ignoredRequest = request => {
    const url = new URL(request.url());
    return blockedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
      || ['ping', 'websocket'].includes(request.resourceType());
  };
  const requests = createRequestTracker(context, ignoredRequest);
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin || !['http:', 'https:'].includes(url.protocol)) return route.continue();
    if (ignoredRequest(request)) {
      excludedRequests.add(url.href);
      return route.abort();
    }
    if (request.method() !== 'GET') {
      result.errors.push(`許可しない外部method: ${request.method()} ${url.href}`);
      return route.abort();
    }
    let entry = externalResources.get(url.href);
    if (!entry) {
      entry = { metadata: { status: 'fetching' } };
      externalResources.set(url.href, entry);
      entry.response = (async () => {
        try {
          const response = await route.fetch({ timeout: 10000, maxRetries: 0 });
          if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
          const body = await response.body();
          externalBytes += body.length;
          if (externalBytes > 128 * 1024 * 1024) throw new Error('外部応答cacheが128MiB上限を超過');
          const headers = response.headers();
          for (const header of ['set-cookie', 'content-length', 'content-encoding', 'transfer-encoding']) delete headers[header];
          entry.metadata = { status: response.status(), sha256: digest(body), bytes: body.length };
          return { status: response.status(), headers, body };
        } catch (error) {
          entry.metadata = { status: 'failed', error: String(error.message || error).slice(0, 500) };
          return null;
        }
      })();
    }
    const response = await entry.response;
    if (!response) {
      result.errors.push(`外部asset取得失敗: ${url.href}: ${entry.metadata.error}`);
      return route.abort();
    }
    return route.fulfill(response);
  });
  await context.addInitScript({ content: createClockBootstrap({ fixedTime: Date.parse(FIXED_TIME), seed: SEED }) });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => result.errors.push(`pageerror: ${String(error.message).slice(0, 400)}`));
  page.on('response', response => {
    if (new URL(response.url()).origin === origin && response.status() >= 400) {
      result.errors.push(`local HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
    }
  });
  page.on('requestfailed', request => {
    if (!ignoredRequest(request)) result.errors.push(`asset request failed: ${request.url()}: ${request.failure()?.errorText}`);
  });
  const response = await page.goto(`${origin}${task.urlPath}`, { waitUntil: 'load', timeout: 12000 });
  if (response?.status() !== 200) result.errors.push(`document HTTP ${response?.status()}`);
  result.initialClock = await page.evaluate(() => ({
    date: Date.now(), performance: performance.now(), origin: performance.timeOrigin,
  }));
  if (result.initialClock.date !== Date.parse(FIXED_TIME) || result.initialClock.performance !== 0
      || result.initialClock.origin !== Date.parse(FIXED_TIME)) {
    result.errors.push(`初期時計/RAF位相が正規化されていません: ${JSON.stringify(result.initialClock)}`);
  }
  await settle(page, requests);
  await advanceClocks(page, 100, requests);
  const captureTicks = task.urlPath === '/space_lab/' ? 4100 : 1000;
  await advanceClocks(page, captureTicks, requests);
  result.finalClocks = await Promise.all(page.frames().map(async frame => ({
    url: frame.url(), ...await frame.evaluate(() => ({
      date: Date.now(), performance: performance.now(), origin: performance.timeOrigin,
    })),
  })));
  for (const clock of result.finalClocks) {
    if (clock.date !== Date.parse(FIXED_TIME) + captureTicks || clock.performance !== captureTicks
        || clock.origin !== Date.parse(FIXED_TIME)) {
      result.errors.push(`撮影時計/RAF位相が正規化されていません: ${JSON.stringify(clock)}`);
    }
  }
  if (context.serviceWorkers().length) result.errors.push('比較用contextにservice workerが登録されました');
  if (needsFreshContextDiagnostic(task.urlPath, task.viewport.id)) {
    result.radarDiagnostics = await page.locator('.radar-indicator, .radar-arrow, .radar-wave').evaluateAll(elements => elements.map(element => {
      const css = getComputedStyle(element);
      return {
        className: element.className, text: element.textContent, inlineStyle: element.getAttribute('style'),
        layout: { left: element.offsetLeft, top: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight },
        css: Object.fromEntries(['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'text-shadow',
          'opacity', 'filter', 'mix-blend-mode', 'backface-visibility', 'will-change'].map(key => [key, css.getPropertyValue(key)])),
      };
    }));
  }
  if (task.urlPath === '/space_lab/' && await page.locator('#loading-overlay').isVisible()) {
    result.errors.push('Space Labのloading overlayが完了していません');
  }
  const exclusions = BITMAP_EXCLUSIONS[task.urlPath] || [];
  for (const exclusion of exclusions) {
    const geometry = await page.locator(exclusion.selector).evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        display: css.display, visibility: css.visibility, opacity: css.opacity };
    }));
    if (geometry.length !== 1) result.errors.push(`bitmap除外対象は1つ必要: ${exclusion.selector} (${geometry.length})`);
    result.excludedBitmapGeometry.push({ ...exclusion, elements: geometry });
  }
  result.documentSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
  }));
  result.fonts = await page.evaluate(() => [...document.fonts].map(font => ({ family: font.family, weight: font.weight, status: font.status })));
  if (result.fonts.some(font => font.status === 'error')) result.errors.push('fontの読み込みが失敗しました');
  const screenshotOptions = { fullPage: false, animations: 'disabled', caret: 'hide', timeout: 7000 };
  if (exclusions.length) {
    result.rawScreenshot = `${name}-raw.png`;
    await page.screenshot({ ...screenshotOptions, path: path.join(artifacts, result.rawScreenshot) });
  }
  result.screenshot = `${name}.png`;
  const style = exclusions.map(({ selector }) => `${selector} { visibility: hidden !important; }`).join('\n');
  const stateBefore = await captureState(page);
  const screenshot = await page.screenshot({ ...screenshotOptions, style, path: path.join(artifacts, result.screenshot) });
  const stateBetween = await captureState(page);
  const repeatScreenshot = `${name}-repeat.png`;
  const repeat = await page.screenshot({ ...screenshotOptions, style, path: path.join(artifacts, repeatScreenshot) });
  const stateAfter = await captureState(page);
  const { diff: repeatDiff, ...repeatComparison } = comparePixels(PNG.sync.read(screenshot), PNG.sync.read(repeat));
  result.repeatCapture = {
    ...repeatComparison, screenshot: repeatScreenshot, sha256: digest(repeat),
    stateBefore, stateBetween, stateAfter,
    stateUnchanged: JSON.stringify(stateBefore) === JSON.stringify(stateBetween)
      && JSON.stringify(stateBetween) === JSON.stringify(stateAfter),
  };
  if (!repeatComparison.passed) {
    result.repeatCapture.diff = `${name}-repeat-diff.png`;
    fs.writeFileSync(path.join(artifacts, result.repeatCapture.diff), PNG.sync.write(repeatDiff));
  }
  result.sha256 = digest(screenshot);
  result.bytes = screenshot.length;
  return result;
}

async function captureState(page) {
  return Promise.all(page.frames().map(async frame => {
    const { html, ...state } = await frame.evaluate(() => ({
      html: document.documentElement.outerHTML, date: Date.now(),
      performance: performance.now(), origin: performance.timeOrigin,
    }));
    return { url: frame.url(), domSha256: digest(html), ...state };
  }));
}

async function advanceClocks(page, ticks, requests) {
  // parentのtimerが作った新frameも同じ絶対位相まで進める。際限ないframe生成は失敗する。
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const frames = page.frames();
    for (const frame of frames) {
      if (frame.isDetached()) continue;
      try {
        await frame.evaluate(value => globalThis.__pikalabVisualClock.advanceTo(value), ticks);
      } catch (error) {
        if (!frame.isDetached()) throw error;
      }
    }
    await settle(page, requests);
    const phases = await Promise.all(page.frames().map(frame => frame.evaluate(() => performance.now())));
    // 同じFrameオブジェクトのsrcdocが差し替わった場合も、新documentの0を見逃さない。
    if (phases.every(value => value === ticks)) return;
  }
  throw new Error('時計を進めている間にframe生成が収束しませんでした');
}

async function settle(page, requests) {
  await requests.wait();
  await Promise.all(page.frames().map(frame => frame.evaluate(async () => {
    await document.fonts.ready;
    const visible = element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    };
    await Promise.all([...document.images].filter(visible).map(async image => {
      if (!image.complete) await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', () => reject(new Error(`画像読込失敗: ${image.src}`)), { once: true });
      });
      if (image.currentSrc && image.naturalWidth === 0) throw new Error(`画像読込失敗: ${image.currentSrc}`);
      if (image.currentSrc && image.decode) await image.decode();
    }));
  })));
}

async function startServer(directory) {
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff',
    '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
  const server = http.createServer((request, response) => {
    const file = resolveServedFile(directory, new URL(request.url, 'http://127.0.0.1').pathname);
    if (!file) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server;
}

try {
  await main();
} catch (error) {
  if (report) {
    report.status = 'failed';
    report.fatalError = String(error.message || error);
    writeReport();
  }
  console.error(`[preservation] ${error.message || error}`);
  process.exitCode = 1;
} finally {
  try {
    await browser?.close();
  } catch (error) {
    if (report) {
      report.status = 'failed';
      report.cleanupError = String(error.message || error);
      writeReport();
    }
    console.error(`[preservation cleanup] ${error.message || error}`);
    process.exitCode = 1;
  } finally {
    await Promise.all(servers.map(server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); })));
  }
}

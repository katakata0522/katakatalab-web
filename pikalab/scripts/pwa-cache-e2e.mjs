import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import cacheTools from './finalize-service-worker.cjs';
import labCacheTools from './finalize-lab-service-workers.cjs';

const { contentRevision, readPrecacheManifest, resolvePrecacheFile } = cacheTools;
const { LAB_WORKERS, finalizeLabServiceWorkers, readLabWorker, resolveLabAsset } = labCacheTools;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const candidateWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const manifest = readPrecacheManifest(candidateWorker);
const files = new Map(manifest.entries.map(entry => [entry.url, fs.readFileSync(resolvePrecacheFile(root, entry.url))]));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
finalizeLabServiceWorkers(root, { checkOnly: true });
const localWorkers = LAB_WORKERS.map(worker => {
  const lab = path.posix.dirname(worker);
  const source = fs.readFileSync(path.join(root, worker), 'utf8');
  const definition = readLabWorker(source);
  const urls = [...new Set(definition.assets.map(asset => {
    const file = resolveLabAsset(root, lab, asset);
    const url = path.relative(root, file).split(path.sep).join('/');
    files.set(url, fs.readFileSync(file));
    return url;
  }))];
  files.set(worker, Buffer.from(source));
  return { worker, lab, source, urls, ...definition };
});

for (const entry of manifest.entries) {
  assert.equal(entry.revision, contentRevision(files.get(entry.url)), `${entry.url}: 最終配信バイトとrevisionが一致する`);
}

// 公開成果物のURLをそのまま使い、旧版には外観・動作を変えないコメントだけを足す。
const changedUrls = [
  'index.html',
  manifest.entries.find(entry => entry.url.endsWith('.js'))?.url,
  manifest.entries.find(entry => entry.url.endsWith('.css'))?.url,
];
assert.equal(new Set(changedUrls).size, 3, 'HTML・JS・CSSを使って実際の更新を検証する');
for (const url of changedUrls) assert.ok(files.has(url), `${url}: 検証対象は元のprecache内にある`);
const legacyFiles = new Map(files);
const allChangedUrls = new Set(changedUrls);
for (const { lab } of localWorkers) {
  for (const asset of ['index.html', 'script.js', 'style.css']) allChangedUrls.add(`${lab}/${asset}`);
}
for (const url of allChangedUrls) {
  assert.ok(files.has(url), `${url}: 旧版を再現する対象がある`);
  const comment = url.endsWith('.html') ? '\n<!-- pikalab-cache-previous-build -->' : '\n/* pikalab-cache-previous-build */';
  legacyFiles.set(url, Buffer.concat([files.get(url), Buffer.from(comment)]));
}
for (const worker of localWorkers) {
  const legacy = worker.source.slice(0, worker.nameStart) + worker.baseLiteral + worker.source.slice(worker.nameEnd);
  legacyFiles.set(worker.worker, Buffer.from(legacy));
}
const legacyEntries = manifest.entries.map(entry => ({ ...entry, revision: contentRevision(legacyFiles.get(entry.url)) }));
const legacyWorker = candidateWorker.slice(0, manifest.start) + JSON.stringify(legacyEntries) + candidateWorker.slice(manifest.end);
let serveCandidate = false;
const harnessPath = '/pikalab/__pwa_cache_test__.html';
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  try {
    const requestUrl = new URL(request.url, 'http://localhost');
    const pathname = requestUrl.pathname;
    // 本番Apacheのindex転送も含めて、Workboxと個別SWの保存を検証する。
    if (pathname.startsWith('/pikalab/') && pathname.endsWith('/index.html')) {
      response.writeHead(301, { Location: pathname.slice(0, -'index.html'.length) + requestUrl.search });
      response.end();
      return;
    }
    if (pathname === '/__pwa_update_probe__.html' || (pathname.startsWith('/pikalab/') && pathname.endsWith('/__pwa_cache_test__.html'))) {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end('<!doctype html><title>PikaLab cache test</title>');
      return;
    }
    if (!pathname.startsWith('/pikalab/')) throw new Error('outside test scope');
    let relative = decodeURIComponent(pathname.slice('/pikalab/'.length));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = resolvePrecacheFile(root, relative);
    const bytes = relative === 'sw.js'
      ? Buffer.from(serveCandidate ? candidateWorker : legacyWorker)
      : (serveCandidate ? files : legacyFiles).get(relative) ?? fs.readFileSync(file);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(relative)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Service-Worker-Allowed': '/pikalab/',
    });
    response.end(bytes);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});


async function verifyInheritedLaunch(browser, origin, lab) {
  serveCandidate = true;
  const context = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.route('https://fonts.googleapis.com/**', () => new Promise(() => {}));
    await page.goto(origin + '/pikalab/' + lab + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/pikalab/sw.js'));
    const title = await page.title();
    await page.evaluate(() => localStorage.setItem('pwa-inherited-audit', 'keep'));
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
    assert.equal(await page.title(), title);
    assert.equal(await page.evaluate(() => localStorage.getItem('pwa-inherited-audit')), 'keep');
    const response = await page.evaluate(async () => {
      const manifest = await fetch('./manifest.json');
      return { status: manifest.status, data: await manifest.json() };
    });
    assert.equal(response.status, 200);
    const start = new URL(response.data.start_url, origin + '/pikalab/' + lab + '/manifest.json').pathname;
    assert.ok(['/pikalab/' + lab + '/', '/pikalab/' + lab + '/index.html'].includes(start));
    if (lab === 'science_maker') {
      await page.locator('label[for="time-1day"]').click();
      await page.locator('label[for="type-experiment"]').click();
      await page.locator('#diagnose-btn').click();
      await page.waitForFunction(() => document.querySelector('#results-container').children.length > 0);
    } else {
      await page.waitForFunction(() => document.querySelector('#a11y-container').children.length > 0);
    }
    console.log('[PWA] ' + lab + ' direct parent registration, offline launch and manifest passed');
  } finally { await context.close(); }
}

async function assertBytes(page, expectedFiles, urls) {
  const actual = await page.evaluate(async paths => Promise.all(paths.map(async url => {
    const response = await fetch('/pikalab/' + url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const hash = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
    return { url, digest: [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('') };
  })), urls);
  for (const entry of actual) assert.equal(entry.digest, digest(expectedFiles.get(entry.url)), entry.url);
}

async function updateLocalWorker(page, scope) {
  await page.evaluate(async workerScope => {
    const registration = await navigator.serviceWorker.getRegistration(workerScope);
    if (!registration?.active) throw new Error('旧版のラボService Workerがありません');
    const previous = registration.active;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(new Error('ラボService Workerの更新が反映されません')); }, 30_000);
      const cleanup = () => { clearTimeout(timer); registration.removeEventListener('updatefound', onFound); };
      const watch = worker => {
        if (!worker || worker === previous) return;
        const check = () => {
          if (worker.state === 'installed') {
            // Focusの既存メッセージ契約で待機中の更新を適用する。
            worker.postMessage('skipWaiting');
            worker.postMessage({ type: 'SKIP_WAITING' });
          } else if (worker.state === 'activated') { cleanup(); resolve(); }
          else if (worker.state === 'redundant') { cleanup(); reject(new Error('ラボService Workerの更新に失敗しました')); }
        };
        worker.addEventListener('statechange', check);
        check();
      };
      const onFound = () => watch(registration.installing);
      registration.addEventListener('updatefound', onFound);
      registration.update().then(() => watch(registration.installing || registration.waiting)).catch(error => { cleanup(); reject(error); });
    });
  }, scope);
  // 通常の再読込後も新しい版が使われることを確認する。
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function clickMovingButton(page, selector) {
  const button = page.locator(selector);
  await button.waitFor({ state: 'visible' });
  assert.equal(await button.isEnabled(), true, `${selector}: 操作できる状態である`);
  // タイマーの親要素はanimate-floatで常に動く。静止を待たず、実際に届く位置を確認してマウス入力する。
  await button.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
  const bounds = await button.boundingBox();
  assert.ok(bounds && bounds.width > 0 && bounds.height > 0, `${selector}: 表示領域がある`);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  const point = await button.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, receivesPointer: hit === element || element.contains(hit), hit: hit?.id || hit?.tagName || null };
  });
  assert.equal(point.receivesPointer, true, `${selector}: 中央が他要素に覆われていない ${JSON.stringify(point)}`);
  await page.mouse.click(point.x, point.y);
}

async function captureFocusFailure(page, stage, error, failedLocalAssets) {
  const directory = path.resolve(root, '..', 'visual-guard-artifacts', 'pwa');
  fs.mkdirSync(directory, { recursive: true });
  const report = { stage, error: error.stack || String(error), failedLocalAssets };
  try {
    report.browser = await page.evaluate(async () => {
      const button = document.querySelector('#btn-main-action');
      const animatedAncestors = [];
      for (let element = button; element; element = element.parentElement) {
        const style = getComputedStyle(element);
        if (style.animationName !== 'none') animatedAncestors.push({ id: element.id, classes: element.className, animation: style.animation, transform: style.transform });
      }
      return {
        url: location.href,
        timer: document.querySelector('#timer-display')?.textContent,
        button: button?.getBoundingClientRect().toJSON(),
        animatedAncestors,
        controller: navigator.serviceWorker.controller?.scriptURL,
        caches: await caches.keys(),
      };
    });
    await page.screenshot({ path: path.join(directory, 'focus-offline-failure.png'), timeout: 5000 });
  } catch (captureError) {
    report.captureError = String(captureError);
  }
  fs.writeFileSync(path.join(directory, 'focus-offline-failure.json'), JSON.stringify(report, null, 2) + '\n');
  console.error(`[PWA] Focus offline failed at ${stage}; evidence: visual-guard-artifacts/pwa/`);
}

async function verifyFreshFocusOffline(browser, origin) {
  serveCandidate = true;
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  context.setDefaultTimeout(30_000);
  const page = await context.newPage();
  const failedLocalAssets = [];
  let stage = 'direct-install';
  try {
    console.log('[PWA] Focus direct install without root Service Worker');
    const scope = origin + '/pikalab/focus_studio/';
    await page.goto(scope, { waitUntil: 'domcontentloaded' });
    await page.locator('#timer-display').waitFor({ state: 'visible' });
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/focus_studio/sw-hardened.js'));
    const scopes = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(registration => registration.scope));
    assert.deepEqual(scopes, [scope], 'Focusへの直接アクセスだけでインストールし、ルートSWへ依存しない');
    page.on('requestfailed', request => {
      if (request.url().startsWith(origin + '/') && ['script', 'stylesheet', 'image', 'font'].includes(request.resourceType())) failedLocalAssets.push(request.url());
    });
    stage = 'offline-reload-and-styles';
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#timer-display').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#timer-display').innerText(), '25:00', '新規インストール直後もオフラインで初期タイマーが動作する');
    const localStyles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links
      .filter(link => new URL(link.href).origin === location.origin).map(link => ({ href: link.href, loaded: !!link.sheet })));
    assert.ok(localStyles.length > 0 && localStyles.every(style => style.loaded), '生成後のローカルCSSがすべてオフラインで読み込める');
    console.log('[PWA] Focus offline reload and emitted CSS passed');
    stage = 'offline-task-and-preset';
    await page.locator('#task-input').fill('PWA offline test');
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#task-input').inputValue(), 'PWA offline test', 'オフライン再読込でも入力が復元される');
    await page.locator('.timer-preset[data-mode="focus"][data-value="5"]').click();
    assert.equal(await page.locator('#timer-display').innerText(), '05:00', 'オフラインでプリセットを変更できる');
    console.log('[PWA] Focus offline task persistence and preset passed');
    stage = 'offline-timer-start';
    await clickMovingButton(page, '#btn-main-action');
    await page.waitForFunction(() => document.querySelector('#timer-display')?.textContent.trim() !== '05:00', null, { timeout: 5000 });
    stage = 'offline-timer-pause';
    await clickMovingButton(page, '#btn-main-action');
    const paused = await page.locator('#timer-display').innerText();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('#timer-display').innerText(), paused, 'オフラインでタイマーを一時停止できる');
    assert.deepEqual(failedLocalAssets, [], '必要なローカル資産をオフラインで失わない');
    console.log('[PWA] Focus offline timer mouse start/pause passed');
  } catch (error) {
    await captureFocusFailure(page, stage, error, failedLocalAssets);
    throw error;
  } finally {
    await context.close();
  }
}

async function verifyLocalWorker(browser, origin, worker) {
  serveCandidate = false;
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  context.setDefaultTimeout(30_000);
  try {
    const page = await context.newPage();
    const scope = `/pikalab/${worker.lab}/`;
    await page.goto(origin + scope + '__pwa_cache_test__.html');
    await page.evaluate(async ({ script, scope }) => {
      const unrelated = await caches.open('pikalab-unrelated-e2e');
      await unrelated.put('/pikalab/unrelated-sentinel', new Response('retained'));
      await navigator.serviceWorker.register(script, { scope, updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
    }, { script: '/pikalab/' + worker.worker, scope });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await assertBytes(page, legacyFiles, worker.urls);
    await context.setOffline(false);
    serveCandidate = true;
    await updateLocalWorker(page, scope);
    await context.setOffline(true);
    await assertBytes(page, files, worker.urls);
    const cacheNames = await page.evaluate(() => caches.keys());
    assert.deepEqual(cacheNames.filter(name => name.startsWith(worker.prefix)), [worker.cacheName], `${worker.worker}: 旧版だけを削除する`);
    assert.ok(cacheNames.includes('pikalab-unrelated-e2e'), `${worker.worker}: 他アプリのキャッシュを維持する`);
    const response = await page.goto(origin + scope, { waitUntil: 'domcontentloaded' });
    assert.ok(response?.ok() && response.fromServiceWorker(), `${worker.worker}: オフラインで入口HTMLを返す`);
    assert.equal(await response.text(), files.get(`${worker.lab}/index.html`).toString('utf8'), worker.worker);
  } finally {
    await context.close();
  }
}

let browser;
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  context.setDefaultTimeout(30_000);
  let page = await context.newPage();
  await page.goto(origin + harnessPath);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/pikalab/sw.js', { scope: '/pikalab/', updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await assertBytes(page, legacyFiles, changedUrls);
  await context.setOffline(false);

  // 複数画面が開いている間は旧版を維持し、最後の画面を閉じた後だけ切り替える。
  const secondPage = await context.newPage();
  await secondPage.goto(origin + harnessPath);
  await secondPage.waitForFunction(() => !!navigator.serviceWorker.controller);
  await secondPage.evaluate(async () => {
    window.pwaRegistration = await navigator.serviceWorker.getRegistration('/pikalab/');
  });
  const probe = await context.newPage();
  await probe.goto(origin + '/__pwa_update_probe__.html');
  serveCandidate = true;
  await page.evaluate(async () => {
    window.__previousPwaController = navigator.serviceWorker.controller;
    localStorage.setItem('pwa-update-session', 'keep');
    const registration = await navigator.serviceWorker.getRegistration('/pikalab/');
    if (!registration) throw new Error('旧版のService Workerがありません');
    await registration.update();
  });
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/pikalab/');
    return registration?.waiting?.state === 'installed';
  });
  assert.ok(await page.evaluate(() => navigator.serviceWorker.controller === window.__previousPwaController),
    '利用中に制御ワーカーを強制交換しない');
  await secondPage.waitForFunction(() => window.pwaRegistration.waiting?.state === 'installed');
  await context.setOffline(true);
  await assertBytes(page, legacyFiles, changedUrls);
  await page.close();
  await assertBytes(secondPage, legacyFiles, changedUrls);
  assert.ok(await secondPage.evaluate(() => !!window.pwaRegistration.waiting),
    '別画面が残る間は旧版を維持する');
  await secondPage.close();
  await probe.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/pikalab/');
    return registration?.active?.state === 'activated' && !registration.waiting;
  });
  await probe.close();
  page = await context.newPage();
  const launch = await page.goto(origin + '/pikalab/', { waitUntil: 'domcontentloaded' });
  assert.ok(launch?.ok() && launch.fromServiceWorker(), '閉じて開き直すと新しい版がオフライン起動する');
  assert.equal(await page.evaluate(() => localStorage.getItem('pwa-update-session')), 'keep');

  await context.setOffline(true);
  await assertBytes(page, files, manifest.entries.map(entry => entry.url));
  for (const url of ['index.html', 'color_lab/index.html', 'science_maker/index.html', 'space_lab/index.html']) {
    assert.ok(files.has(url), `${url}: 公開入口がprecacheに含まれる`);
    const response = await page.goto(origin + '/pikalab/' + url, { waitUntil: 'domcontentloaded' });
    assert.ok(response?.ok(), `${url}: オフラインで入口を表示する`);
    assert.equal(response.fromServiceWorker(), true, `${url}: Service Workerから応答する`);
    assert.equal(await response.text(), files.get(url).toString('utf8'), `${url}: トップへの置き換えや旧版への戻りがない`);
    if (url === 'science_maker/index.html') {
      await page.locator('label[for="time-1day"]').click();
      await page.locator('label[for="type-experiment"]').click();
      await page.locator('#diagnose-btn').click();
      await page.waitForFunction(() => document.querySelector('#results-container').children.length > 0);
    }
    if (url === 'space_lab/index.html') {
      await page.waitForFunction(() => document.querySelector('#a11y-container').children.length > 0);
    }
  }
  const keys = await page.evaluate(async () => {
    const names = (await caches.keys()).filter(name => name.includes('workbox-precache'));
    return (await Promise.all(names.map(async name => (await (await caches.open(name)).keys()).map(request => request.url)))).flat();
  });
  for (const url of changedUrls) {
    const expectedRevision = contentRevision(files.get(url));
    const matching = keys.map(key => new URL(key)).filter(key => key.pathname === '/pikalab/' + url);
    assert.equal(matching.length, 1, `${url}: 古いprecache項目を残さない`);
    assert.equal(matching[0].searchParams.get('__WB_REVISION__'), expectedRevision, url);
  }
  await context.close();
  console.log(`[PWA] Root session-safe upgrade and ${manifest.entries.length} offline asset bytes passed`);
  for (const worker of localWorkers) {
    await verifyLocalWorker(browser, origin, worker);
    console.log(`[PWA] ${worker.worker} warm upgrade and offline assets passed`);
  }
  await verifyFreshFocusOffline(browser, origin);
  for (const lab of ['science_maker', 'space_lab']) await verifyInheritedLaunch(browser, origin, lab);
  console.log(`[OK] PWA cache E2E: ルート${manifest.entries.length}件とFocus ${localWorkers.length}ワーカーの更新、新規Focusのオフライン操作を確認しました。`);
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

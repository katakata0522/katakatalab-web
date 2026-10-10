'use strict';

// 実際の成果物を配信して検査する。計測事業者への通信はスタブにし、本番へイベントを送らない。
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { isEducationPage } = require('../../scripts/education-no-tracking.cjs');
const root = path.resolve(__dirname, '../..');
const rootBuild = path.join(root, 'public-build');
const pikaBuild = path.join(root, 'pikalab/dist');
const checkPika = process.argv.includes('--pikalab-build');
const trackingUrl = url => /(?:^|\.)(?:google(?:tagmanager|-analytics|syndication|adservices|tagservices)|doubleclick|clarity|hotjar|segment|amplitude|plausible|umami)\.(?:com|net|ms|io|is)$|^connect\.facebook\.net$/i.test(new URL(url).hostname);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

async function main() {
  let legacy = false;
  let legacyPika = false;
  const legacyHtml = '<!doctype html><html><head><meta charset="utf-8"><title>旧キャッシュ</title><script src="/analytics.js"></script></head><body><h1>旧教育画面</h1></body></html>';
  const legacyAnalytics = "window.dataLayer=[];window.gtag=function(){dataLayer.push(arguments)};gtag('config','G-LEGACY');const s=document.createElement('script');s.src='https://www.googletagmanager.com/gtag/js?id=G-LEGACY';document.head.appendChild(s);";
  // 旧実装と同じく、教育HTMLと共通ローダーをキャッシュ優先で返す状況を再現する。
  const legacyWorker = `const C='smile-land-v-legacy-privacy-fixture';self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(C);await c.put('./',new Response(${JSON.stringify(legacyHtml)},{headers:{'Content-Type':'text/html'}}));await c.put('/analytics.js',new Response(${JSON.stringify(legacyAnalytics)},{headers:{'Content-Type':'application/javascript'}}));await self.skipWaiting()})()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{e.respondWith((async()=>{const c=await caches.open(C);return await c.match(e.request)||await fetch(e.request)})())});`;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    res.setHeader('Cache-Control', 'no-store');
    if (legacyPika && pathname === '/pikalab/sw.js') {
      // 同じ生成Workboxからguardの読み込みだけを外して、更新前のワーカーを同一URLで再現する。
      const current = fs.readFileSync(path.join(pikaBuild, 'sw.js'), 'utf8');
      const previous = current.replace(/importScripts\("education-sw-privacy\.js"\),/, '');
      assert.notEqual(previous, current);
      res.setHeader('Content-Type', 'application/javascript'); res.end(previous); return;
    }
    if (legacy && pathname === '/lab-tools/kids-smile-land/service-worker.js') {
      res.setHeader('Content-Type', 'application/javascript'); res.end(legacyWorker); return;
    }
    if (legacy && pathname === '/lab-tools/kids-smile-land/') {
      res.setHeader('Content-Type', 'text/html'); res.end(legacyHtml); return;
    }
    if (legacy && pathname === '/analytics.js') {
      res.setHeader('Content-Type', 'application/javascript'); res.end(legacyAnalytics); return;
    }
    const pika = pathname.startsWith('/pikalab/');
    const retired = /^(?:\/usagi-app\/|\/kirarin-play-park\/)/.test(pathname);
    const directory = pika ? pikaBuild : retired ? root : rootBuild;
    const relative = pika ? pathname.slice('/pikalab'.length) : pathname;
    let file = path.resolve(directory, '.' + relative);
    if (!file.startsWith(directory + path.sep) && file !== directory) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    if (isEducationPage(pathname)) {
      const area = pika ? 'pikalab' : pathname.startsWith('/usagi-app/') ? 'usagi-app' : pathname.startsWith('/kirarin-play-park/') ? 'kirarin-play-park' : 'lab-tools/kids-smile-land';
      // Apacheの親→子のCSP設定を再現し、子ディレクトリによる上書きも検出する。
      let policy = '';
      const areaRoot = pika ? pikaBuild : path.join(directory, area);
      let configDirectory = areaRoot;
      const folders = path.relative(areaRoot, path.dirname(file)).split(path.sep).filter(Boolean);
      for (const folder of ['', ...folders]) {
        if (folder) configDirectory = path.join(configDirectory, folder);
        const config = path.join(configDirectory, '.htaccess');
        if (!fs.existsSync(config)) continue;
        for (const directive of fs.readFileSync(config, 'utf8').matchAll(/^\s*Header always (set|unset|append) Content-Security-Policy(?: "([^"]+)")?/gm)) {
          if (directive[1] === 'unset') policy = '';
          else if (directive[1] === 'set') policy = directive[2];
          else policy = [policy, directive[2]].filter(Boolean).join(', ');
        }
      }
      if (policy) res.setHeader('Content-Security-Policy', policy.replaceAll('; upgrade-insecure-requests', ''));
    }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.EDUCATION_BROWSER_EXECUTABLE ? { executablePath: process.env.EDUCATION_BROWSER_EXECUTABLE } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext();
    const attempts = [];
    await context.route('**/*', async route => {
      if (trackingUrl(route.request().url())) { attempts.push(route.request().url()); await route.fulfill({ contentType: 'application/javascript', body: '' }); }
      else if (!route.request().url().startsWith(base)) await route.abort();
      else await route.continue();
    });
    const page = await context.newPage();
    let educationPages = ['/lab-tools/kids-smile-land/'];
    if (checkPika) {
      const collect = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? collect(file) : entry.name.endsWith('.html') ? ['/pikalab/' + path.relative(pikaBuild, file).split(path.sep).join('/')] : [];
      });
      educationPages.push(...collect(pikaBuild));
    }
    for (const pathname of educationPages) {
      const requests = [];
      const listener = request => { if (trackingUrl(request.url()) || new URL(request.url()).pathname === '/analytics.js') requests.push(request.url()); };
      context.on('request', listener);
      const response = await page.goto(base + pathname, { waitUntil: 'load' });
      assert.equal(response.status(), 200, pathname);
      assert.match(response.headers()['content-security-policy'], /connect-src 'self';/, pathname);
      await page.waitForTimeout(150);
      assert.deepEqual(requests, [], pathname);
      assert.equal(await page.evaluate(() => typeof window.dataLayer), 'undefined', pathname);
      context.off('request', listener);
    }
    // 通常ツールのGA4起動・操作イベントが維持されることも実行で確認する。
    await page.goto(base + '/discount-calc/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.KatakataAnalytics);
    await page.locator('#price').fill('1000');
    await page.locator('#customRate').fill('20');
    await page.locator('#btnCartCustom').click();
    assert.ok(await page.evaluate(() => dataLayer.some(args => args[0] === 'config')));
    assert.ok(await page.evaluate(() => dataLayer.some(args => args[0] === 'event' && args[1] === 'tool_start')));
    assert.ok(await page.evaluate(() => dataLayer.some(args => args[0] === 'event' && args[1] === 'tool_action' && args[2]?.action_id === 'add_custom_cart')));
    assert.ok(attempts.some(url => url.includes('id=G-FYFPS7L9X9')));
    await context.close();

    // 旧ワーカーの初回起動では漏れることを検出し、更新後は旧HTML・旧JSでも送信されない。
    legacy = true;
    const cached = await browser.newContext();
    const legacyAttempts = [];
    await cached.route('**/*', async route => {
      if (trackingUrl(route.request().url())) { legacyAttempts.push(route.request().url()); await route.fulfill({ contentType: 'application/javascript', body: '' }); }
      else if (!route.request().url().startsWith(base)) await route.abort();
      else await route.continue();
    });
    const oldPage = await cached.newPage();
    await oldPage.goto(base + '/lab-tools/kids-smile-land/', { waitUntil: 'load' });
    await oldPage.evaluate(async () => { await navigator.serviceWorker.register('./service-worker.js'); await navigator.serviceWorker.ready; });
    await oldPage.reload({ waitUntil: 'load' });
    assert.ok(legacyAttempts.length, '旧ワーカーによる漏れを再現できる');
    await oldPage.evaluate(async () => { const cache = await caches.open('unrelated-app-keep'); await cache.put('/sentinel', new Response('keep')); });
    legacy = false;
    await oldPage.evaluate(async () => { window.__legacyController = navigator.serviceWorker.controller; const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
    await oldPage.waitForFunction(() => navigator.serviceWorker.controller && navigator.serviceWorker.controller !== window.__legacyController);
    await oldPage.waitForFunction(async () => !(await caches.keys()).includes('smile-land-v-legacy-privacy-fixture'), { timeout: 15000 });
    legacyAttempts.length = 0;
    await oldPage.reload({ waitUntil: 'load' });
    await oldPage.waitForTimeout(150);
    assert.equal(await oldPage.evaluate(() => typeof window.dataLayer), 'undefined');
    assert.deepEqual(legacyAttempts, []);
    assert.ok(await oldPage.evaluate(async () => (await caches.keys()).includes('unrelated-app-keep')));
    // 更新後にも、外部に保存されていた旧HTMLと旧JSを意図的に復元して防御を確認する。
    const cacheName = fs.readFileSync(path.join(rootBuild, 'lab-tools/kids-smile-land/service-worker.js'), 'utf8').match(/const CACHE_NAME = ['"]([^'"]+)['"]/)[1];
    await oldPage.evaluate(async ({ js, cacheName }) => {
      const own = await caches.open(cacheName);
      await own.put('/analytics.js', new Response(js, { headers: { 'Content-Type': 'application/javascript' } }));
    }, { js: legacyAnalytics, cacheName });
    await cached.setOffline(true);
    await oldPage.reload({ waitUntil: 'load' });
    // 旧ページに含まれていたローダーも、更新済みワーカーの管理下ではキャッシュされた旧JSを実行できない。
    const blockedLegacy = oldPage.waitForResponse(response => new URL(response.url()).pathname === '/analytics.js');
    await oldPage.setContent(legacyHtml, { waitUntil: 'load' });
    const blockedResponse = await blockedLegacy;
    assert.equal(blockedResponse.fromServiceWorker(), true);
    assert.equal(await blockedResponse.text(), '');
    assert.equal(await oldPage.evaluate(() => typeof window.dataLayer), 'undefined');
    assert.deepEqual(legacyAttempts, []);
    assert.match(await oldPage.locator('h1').innerText(), /旧教育画面/);
    await cached.close();
    if (checkPika) {
      legacyPika = true;
      const pikaContext = await browser.newContext();
      const pikaAttempts = [];
      await pikaContext.route('**/*', async route => {
        if (trackingUrl(route.request().url())) { pikaAttempts.push(route.request().url()); await route.fulfill({ contentType: 'application/javascript', body: '' }); }
        else if (!route.request().url().startsWith(base)) await route.abort();
        else await route.continue();
      });
      // PikaLabは現行mainにもGA4を持たない。旧JSを意図的に戻し、Workboxの更新前後を比較する。
      let probe = await pikaContext.newPage();
      await probe.goto(base + '/pikalab/', { waitUntil: 'load' });
      await probe.evaluate(async () => { await navigator.serviceWorker.ready; });
      await probe.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      await probe.reload({ waitUntil: 'load' });
      assert.equal(await probe.evaluate(() => typeof window.dataLayer), 'undefined');
      await probe.evaluate(async js => {
        const cache = await caches.open('pikalab-static-resources-cache');
        await cache.put('/pikalab/analytics.js', new Response(js, { headers: { 'Content-Type': 'application/javascript' } }));
      }, legacyAnalytics);
      await pikaContext.setOffline(true);
      await probe.setContent(legacyHtml.replace('/analytics.js', '/pikalab/analytics.js'), { waitUntil: 'load' });
      assert.equal(await probe.evaluate(() => typeof window.dataLayer), 'object', '更新前Workboxでは旧JSが実行される');
      await pikaContext.setOffline(false);
      await probe.reload({ waitUntil: 'load' });
      legacyPika = false;
      await probe.evaluate(async () => { window.__previousWorkbox = navigator.serviceWorker.controller; const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
      await probe.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
      assert.equal(await probe.evaluate(() => navigator.serviceWorker.controller === window.__previousWorkbox), true, '利用中の画面を強制更新しない');
      // prompt方針どおり全教育タブを閉じてから、新ワーカーが有効になることを待つ。
      await probe.close();
      probe = await pikaContext.newPage();
      await probe.goto(base + '/discount-calc/', { waitUntil: 'load' });
      await probe.waitForFunction(async () => {
        const registration = await navigator.serviceWorker.getRegistration('/pikalab/');
        return registration && !registration.waiting && registration.active?.state === 'activated';
      });
      await probe.goto(base + '/pikalab/', { waitUntil: 'load' });
      await probe.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      pikaAttempts.length = 0;
      const precacheName = await probe.evaluate(async () => (await caches.keys()).find(name => name.startsWith('workbox-precache-') && name.includes('/pikalab/')));
      assert.ok(precacheName, '実際のWorkbox precacheを使う');
      await probe.evaluate(async ({ name, js }) => { const cache = await caches.open(name); await cache.put('/analytics.js', new Response(js, { headers: { 'Content-Type': 'application/javascript' } })); }, { name: precacheName, js: legacyAnalytics });
      await pikaContext.setOffline(true);
      await probe.reload({ waitUntil: 'load' });
      for (const loader of ['/analytics.js', '/pikalab/analytics.js']) {
        const blockedPika = probe.waitForResponse(response => new URL(response.url()).pathname === loader);
        await probe.setContent(legacyHtml.replace('/analytics.js', loader), { waitUntil: 'load' });
        const blockedPikaResponse = await blockedPika;
        assert.equal(blockedPikaResponse.fromServiceWorker(), true);
        assert.equal(await blockedPikaResponse.text(), '');
        assert.equal(await probe.evaluate(() => typeof window.dataLayer), 'undefined');
        assert.deepEqual(pikaAttempts, []);
      }
      await pikaContext.close();
    }
    console.log(JSON.stringify({ educationPages: educationPages.length, trackingAttempts: 0, ordinaryToolGA4: 'PASS', legacyBeforeUpdate: 'leak reproduced', updatedWorkerOfflineLegacyCache: 'PASS', ...(checkPika ? { pikaWorkboxSameUrlMigration: 'PASS' } : {}), unrelatedCache: 'preserved' }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

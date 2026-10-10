import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

// 本体の実ワーカーを独立したscopeへ置き、複数画面を閉じるまでの更新を検証する。
export async function verifyRootUpdate(browser, publicRoot) {
  const scope = '/audit-root/';
  const source = fs.readFileSync(path.join(publicRoot, 'sw.js'), 'utf8');
  const previous = source.replace(/const CACHE_NAME = [^;]+;/, "const CACHE_NAME = 'katakatalab-previous-e2e';")
    .replace('autoUpdate: false', 'autoUpdate: true');
  let candidate = false;
  const server = http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url, 'http://localhost');
      const pathname = requestUrl.pathname;
      response.setHeader('Cache-Control', 'no-store');
      // 本番Apacheと同じく、明示されたindex.htmlをディレクトリURLへ転送する。
      if (pathname.endsWith('/index.html')) {
        response.writeHead(301, { Location: pathname.slice(0, -'index.html'.length) + requestUrl.search }).end();
        return;
      }
      if (pathname === '/probe.html' || pathname === scope + 'session.html') {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><title>PWA update session</title>');
        return;
      }
      let relative = pathname === '/pwa-runtime.js' ? 'pwa-runtime.js' : pathname.slice(scope.length) || 'index.html';
      if (pathname !== '/pwa-runtime.js' && !pathname.startsWith(scope)) throw new Error('outside scope');
      if (relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(publicRoot, decodeURIComponent(relative));
      if (!file.startsWith(path.resolve(publicRoot) + path.sep)) throw new Error('outside root');
      let bytes = fs.readFileSync(file);
      if (relative === 'sw.js') bytes = Buffer.from(candidate ? source : previous);
      if (relative === 'index.html' && !candidate) bytes = Buffer.concat([bytes, Buffer.from('\n<!-- previous-shell -->')]);
      response.setHeader('Content-Type', relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : relative.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      response.end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  try {
    const page = await context.newPage();
    await page.goto(origin + scope + 'session.html');
    await page.evaluate(async scope => {
      await navigator.serviceWorker.register(scope + 'sw.js', { updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
    }, scope);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const second = await context.newPage();
    await second.goto(origin + scope + 'session.html');
    await second.waitForFunction(() => !!navigator.serviceWorker.controller);
    await second.evaluate(async scope => {
      window.pwaRegistration = await navigator.serviceWorker.getRegistration(scope);
    }, scope);
    const probe = await context.newPage();
    await probe.goto(origin + '/probe.html');
    candidate = true;
    await page.evaluate(async scope => {
      window.previousController = navigator.serviceWorker.controller;
      localStorage.setItem('pwa-update-preserved', 'keep');
      await (await navigator.serviceWorker.getRegistration(scope)).update();
    }, scope);
    await page.waitForFunction(async scope => (await navigator.serviceWorker.getRegistration(scope))?.waiting?.state === 'installed', scope);
    assert.ok(await page.evaluate(() => navigator.serviceWorker.controller === window.previousController));
    await second.waitForFunction(() => window.pwaRegistration.waiting?.state === 'installed');
    await context.setOffline(true);
    assert.ok((await page.evaluate(() => fetch('./index.html').then(response => response.text()))).includes('previous-shell'));
    await page.close();
    assert.ok((await second.evaluate(() => fetch('./index.html').then(response => response.text()))).includes('previous-shell'));
    const remaining = await second.evaluate(async scope => {
      const registration = window.pwaRegistration;
      return { waiting: registration.waiting?.state, active: registration.active?.state,
        controller: navigator.serviceWorker.controller?.state, caches: await caches.keys() };
    }, scope);
    assert.ok(remaining.waiting, '残った画面の更新状態: ' + JSON.stringify(remaining));
    await second.close();
    await probe.waitForFunction(async scope => {
      const registration = await navigator.serviceWorker.getRegistration(scope);
      return registration?.active?.state === 'activated' && !registration.waiting;
    }, scope);
    await probe.close();
    const reopened = await context.newPage();
    const launch = await reopened.goto(origin + scope + 'index.html', { waitUntil: 'domcontentloaded' });
    assert.ok(launch?.ok() && launch.fromServiceWorker());
    assert.equal((await launch.text()).includes('previous-shell'), false);
    assert.equal(await reopened.evaluate(() => localStorage.getItem('pwa-update-preserved')), 'keep');
    console.log(JSON.stringify({ rootPwaUpdate: 'PASS', twoOpenPages: 'PASS', offlineRestart: 'PASS', storagePreserved: 'PASS' }));
  } finally {
    await context.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

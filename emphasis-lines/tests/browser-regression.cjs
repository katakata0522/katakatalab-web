'use strict';

// 実行: node emphasis-lines/tests/browser-regression.cjs
// Playwrightが参照できる環境で実行する。ブラウザ指定はEMPHASIS_CHROMIUM_EXECUTABLE。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const JSZip = require('../../qrcode/vendor/jszip.min.js');

const repository = path.resolve(__dirname, '../..');
const root = path.resolve(process.env.EMPHASIS_PUBLIC_ROOT || repository);
const artifacts = process.env.EMPHASIS_BROWSER_ARTIFACTS || fs.mkdtempSync(path.join(os.tmpdir(), 'emphasis-browser-'));
fs.mkdirSync(artifacts, { recursive: true });
const html = fs.readFileSync(path.join(root, 'emphasis-lines/index.html'), 'utf8');
const version = html.match(/src="js\/app\.js\?v=([^\"]+)"/)[1];
const worker = fs.readFileSync(path.join(root, 'emphasis-lines/sw.js'), 'utf8');
const cacheName = worker.match(/const CACHE_NAME = (['"])(.*?)\1/)[2];
const zipBytes = fs.readFileSync(path.join(repository, 'qrcode/vendor/jszip.min.js'));
let previousPwa = false;

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  response.setHeader('Cache-Control', 'no-store');
  if (url.pathname.endsWith('/index.html')) {
    response.writeHead(301, { Location: url.pathname.slice(0, -10) + url.search }).end();
    return;
  }
  if (url.pathname === '/probe.html') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>PWA probe</title>');
    return;
  }
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { response.writeHead(404).end(); return; }
  let bytes = fs.readFileSync(file);
  if (process.env.EMPHASIS_BROWSER_DEBUG && url.pathname.includes('BatchManager')) console.log('SERVER MODULE', previousPwa, url.pathname);
  if (previousPwa && file === path.join(root, 'emphasis-lines/sw.js')) {
    bytes = Buffer.from(worker.replace(/const CACHE_NAME = [^;]+;/, "const CACHE_NAME = 'emphasis-lines-previous-e2e';"));
  }
  if (previousPwa && file === path.join(root, 'emphasis-lines/index.html')) {
    bytes = Buffer.concat([bytes, Buffer.from('\n<!-- previous-shell -->')]);
  }
  if (previousPwa && file === path.join(root, 'emphasis-lines/js/managers/BatchManager.js')) {
    bytes = Buffer.concat([bytes, Buffer.from('\n// previous-module\n')]);
  }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  response.end(bytes);
});

async function installAudit(page) {
  await page.evaluate(async v => {
    const base = '/emphasis-lines/js/';
    const get = file => import(base + file + '?v=' + v);
    const [{ store }, { LineRenderer }, { BatchManager }, { ImageService }, { ExportService }] = await Promise.all([
      get('state.js'), get('renderers/renderer.js'), get('managers/BatchManager.js'), get('services/ImageService.js'), get('services/ExportService.js'),
    ]);
    const line = document.querySelector('#lineCanvas');
    const bg = document.querySelector('#bgCanvas');
    window.audit = { store, line, bg, ImageService, ExportService, manager: new BatchManager(new LineRenderer(line, bg), line, bg) };
  }, version);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function snapshot(page) {
  return page.evaluate(() => {
    const { store, line, bg } = window.audit;
    const s = store.getState();
    return { mode: s.mode, width: s.imgWidth, height: s.imgHeight, type: s.type, params: s.params,
      center: [s.centerX, s.centerY], line: line.toDataURL(), bg: bg.toDataURL(), size: [line.width, line.height] };
  });
}

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function download(page, selector) {
  const [item] = await Promise.all([page.waitForEvent('download'), page.locator(selector).click()]);
  assert.equal(await item.failure(), null);
  return { name: item.suggestedFilename(), bytes: fs.readFileSync(await item.path()) };
}

async function checkPng(page, bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const result = await page.evaluate(async encoded => {
    const { store, line, bg } = window.audit;
    const s = store.getState();
    const image = new Image();
    image.src = 'data:image/png;base64,' + encoded;
    await image.decode();
    const actual = document.createElement('canvas'); actual.width = image.width; actual.height = image.height;
    actual.getContext('2d').drawImage(image, 0, 0);
    const expected = document.createElement('canvas'); expected.width = s.imgWidth; expected.height = s.imgHeight;
    const ctx = expected.getContext('2d');
    if (s.mode === 'composite') ctx.drawImage(bg, 0, 0);
    ctx.drawImage(line, 0, 0);
    const a = actual.getContext('2d').getImageData(0, 0, actual.width, actual.height).data;
    const b = ctx.getImageData(0, 0, expected.width, expected.height).data;
    let equal = a.length === b.length;
    for (let i = 0; equal && i < a.length; i++) equal = a[i] === b[i];
    return { size: [image.width, image.height], expectedSize: [s.imgWidth, s.imgHeight], equal };
  }, bytes.toString('base64'));
  assert.deepEqual(result.size, result.expectedSize);
  assert.ok(result.equal, '保存PNGとプレビューのピクセルが一致しません');
}

async function imageFile(page, width, height, color, ext = 'png') {
  const data = await page.evaluate(({ width, height, color, ext }) => {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, width, height);
    return c.toDataURL(ext === 'png' ? 'image/png' : 'image/jpeg');
  }, { width, height, color, ext });
  return { name: 'image.' + ext, mimeType: ext === 'png' ? 'image/png' : 'image/jpeg', buffer: Buffer.from(data.split(',')[1], 'base64') };
}

async function uploaded(page, file, width, height) {
  await page.locator('#fileInput').setInputFiles(file);
  await page.waitForFunction(({ width, height }) => {
    const a = window.audit; const s = a.store.getState();
    return s.image instanceof HTMLImageElement && s.imgWidth === width && s.imgHeight === height && document.querySelector('#loadingOverlay').classList.contains('hidden');
  }, { width, height });
  await settle(page);
}

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const options = { headless: true };
  if (process.env.EMPHASIS_CHROMIUM_EXECUTABLE) options.executablePath = process.env.EMPHASIS_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(options);
  let passed = 0; let failed = 0;
  async function run(name, work) {
    if (process.env.EMPHASIS_BROWSER_FILTER && !name.includes(process.env.EMPHASIS_BROWSER_FILTER)) return;
    try { await work(); passed++; console.log('PASS ' + name); }
    catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.stack); }
  }
  async function context(options = {}) {
    const ctx = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block', ...options });
    // SRI検査を有効に保ったまま、実CDNと一致する同版バイト列を配信する。
    await ctx.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin)) return route.continue();
      if (url.includes('cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')) return route.fulfill({
        body: zipBytes, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' },
      });
      return route.abort();
    });
    return ctx;
  }
  async function withPage(options, work, url = '/emphasis-lines/') {
    const ctx = await context(options);
    try {
      const page = await ctx.newPage(); const errors = [];
      page.setDefaultTimeout(10000);
      page.on('pageerror', e => errors.push(e.message));
      page.on('dialog', dialog => dialog.accept());
      await page.goto(origin + url); await installAudit(page);
      await work(page, ctx);
      assert.deepEqual(errors, [], '予期しないブラウザエラー');
    } finally { await ctx.close(); }
  }
  try {
    await run('画像なしPNG・透明PNG・SVGの保存内容', () => withPage({}, async page => {
      await checkPng(page, (await download(page, '#btnExport')).bytes);
      await page.locator('.mode-btn[data-mode="lines"]').click(); await settle(page);
      await checkPng(page, (await download(page, '#btnExport')).bytes);
      const svg = (await download(page, '#btnExportSVG')).bytes.toString('utf8');
      const parsed = await page.evaluate(xml => {
        const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
        return { error: !!doc.querySelector('parsererror'), width: doc.documentElement.getAttribute('width'),
          image: doc.querySelector('image').getAttribute('href'), expected: window.audit.line.toDataURL() };
      }, svg);
      assert.equal(parsed.error, false); assert.equal(parsed.width, '1080'); assert.equal(parsed.image, parsed.expected);
      // 描画予約より先に保存しても最新パラメータの線を保存する。
      const waiting = page.waitForEvent('download');
      await page.evaluate(() => { window.audit.store.updateParams({ color: '#ff0000' }); document.querySelector('#btnExport').click(); });
      const item = await waiting; await checkPng(page, fs.readFileSync(await item.path()));
    }));

    await run('PNG/JPEG入れ替え・元に戻す/やり直す・寸法/背景の一致', () => withPage({}, async page => {
      const first = await imageFile(page, 640, 360, '#ee7788');
      const second = await imageFile(page, 360, 640, '#1177dd', 'jpg');
      await uploaded(page, first, 640, 360); const before = await snapshot(page);
      await uploaded(page, second, 360, 640); await checkPng(page, (await download(page, '#btnExport')).bytes);
      await page.locator('#btnUndo').click(); await settle(page); assert.deepEqual(await snapshot(page), before);
      await page.locator('#btnRedo').click(); await settle(page); assert.deepEqual((await snapshot(page)).size, [360, 640]);
      await page.locator('.mode-btn[data-mode="lines"]').click(); await page.locator('#canvasPreset').selectOption('1280x720'); await settle(page);
      await page.locator('#btnUndo').click(); await settle(page); assert.deepEqual((await snapshot(page)).size, [360, 640]);
      assert.equal(await page.locator('#canvasPreset').inputValue(), '360x640', 'サイズ選択も復元後の出力寸法と一致する');
      await page.locator('.mode-btn[data-mode="composite"]').click(); await page.locator('#btnUndo').click(); await settle(page);
      assert.equal(await page.locator('#canvasSizeGroup').isVisible(), true);
      assert.equal(await page.evaluate(() => window.audit.bg.getContext('2d').getImageData(0, 0, 1, 1).data[3]), 0);
      await checkPng(page, (await download(page, '#btnExport')).bytes);
      await uploaded(page, await imageFile(page, 2048, 1024, '#aa7755'), 2048, 1024);
      await uploaded(page, await imageFile(page, 32, 32, '#7755aa'), 32, 32);
      await page.locator('#btnUndo').click(); await page.waitForTimeout(400);
      const fit = await page.locator('#lineCanvas').evaluate(el => {
        const rect = el.getBoundingClientRect(); const view = el.parentElement.parentElement;
        return rect.width <= view.clientWidth && rect.height <= view.clientHeight;
      });
      assert.equal(fit, true, '画像の履歴復元後にプレビューを画面へ収める');
    }));

    await run('異常ファイル・20MB超過・極端な比率・読み込み後の復帰', () => withPage({}, async page => {
      await uploaded(page, await imageFile(page, 640, 360, '#227744'), 640, 360); const before = await snapshot(page);
      for (const file of [
        { name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') },
        { name: 'empty.png', mimeType: 'image/png', buffer: Buffer.alloc(0) },
        { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG') },
      ]) {
        await page.locator('#fileInput').setInputFiles(file);
        await page.waitForFunction(() => document.querySelector('#imageUploadLabel .text-sm').textContent.includes('エラー'));
        await settle(page); assert.deepEqual(await snapshot(page), before);
        assert.equal(await page.locator('#loadingOverlay').isVisible(), false);
      }
      const result = await page.evaluate(async () => {
        const { ImageService } = window.audit;
        let oversized = false;
        try { await ImageService.loadImage(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })); }
        catch { oversized = true; }
        const c = document.createElement('canvas'); c.width = 4096; c.height = 1;
        const blob = await new Promise(r => c.toBlob(r));
        const image = await ImageService.loadImage(new File([blob], 'thin.png', { type: 'image/png' }));
        return { oversized, size: [image.width, image.height], resized: image.resized };
      });
      assert.deepEqual(result, { oversized: true, size: [2048, 1], resized: true });
      await uploaded(page, await imageFile(page, 720, 480, '#4499bb'), 720, 480);
      await checkPng(page, (await download(page, '#btnExport')).bytes);
    }));

    await run('実Canvas一括PNGとZIP・生成後の背景/線復帰', () => withPage({}, async page => {
      await uploaded(page, await imageFile(page, 640, 360, '#aa7799'), 640, 360); const before = await snapshot(page);
      const waiting = page.waitForEvent('download');
      await page.evaluate(async () => {
        const { manager, line } = window.audit;
        const render = manager.renderer.render, now = Date.now;
        window.audit.batchFrames = [];
        // speedを含む同じ入力を再現する。中心にも正当な線が描かれるため一点のalphaを仕様にしない。
        Date.now = () => 1500;
        manager.renderer.render = function (state) {
          const result = render.call(this, state);
          if (state.imgWidth === 3840 && state.imgHeight === 2160) {
            window.audit.batchFrames.push({ type: state.type, seed: state.seed, png: line.toDataURL() });
          }
          return result;
        };
        try { await manager.downloadAsZip({ count: 3, width: 3840, height: 2160 }); }
        finally { manager.renderer.render = render; Date.now = now; }
      });
      const item = await waiting; assert.equal(await item.failure(), null);
      const zip = await JSZip.loadAsync(fs.readFileSync(await item.path()));
      const names = Object.keys(zip.files).filter(name => name.endsWith('.png'));
      assert.equal(names.length, 3); const encodings = [];
      for (const name of names) {
        const bytes = await zip.file(name).async('nodebuffer');
        assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [3840, 2160]);
        encodings.push(bytes.toString('base64'));
      }
      assert.equal(new Set(encodings).size, 3, '一括PNGが重複しています');
      const frames = await page.evaluate(async encodings => {
        const pixels = async src => {
          const image = new Image(); image.src = src; await image.decode();
          const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
          c.getContext('2d').drawImage(image, 0, 0);
          return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        };
        const results = [];
        for (let n = 0; n < encodings.length; n++) {
          const frame = window.audit.batchFrames[n];
          const expected = await pixels(frame.png), actual = await pixels('data:image/png;base64,' + encodings[n]);
          let equal = actual.length === expected.length, transparent = 0, opaque = 0;
          for (let i = 0; i < actual.length; i++) {
            if (actual[i] !== expected[i]) equal = false;
            if (i % 4 === 3) { if (actual[i] === 0) transparent++; if (actual[i] === 255) opaque++; }
          }
          results.push({ type: frame.type, seed: frame.seed, equal, transparent, opaque });
        }
        return { count: window.audit.batchFrames.length, results };
      }, encodings);
      assert.equal(frames.count, 3); assert.equal(frames.results[0].type, 'speed');
      for (const frame of frames.results) {
        assert.ok(frame.equal, `ZIP PNGと生成時の線Canvasが一致: ${JSON.stringify(frame)}`);
        assert.ok(frame.transparent > 0 && frame.opaque > 0, `透明背景と実際の線の両方が必要: ${JSON.stringify(frame)}`);
      }
      assert.deepEqual(await snapshot(page), before);
      await checkPng(page, (await download(page, '#btnExport')).bytes);
    }));

    await run('toBlob/描画/ZIP失敗と二重起動・境界値からの復帰', () => withPage({}, async page => {
      const before = await snapshot(page);
      const results = await page.evaluate(async () => {
        const { manager, line } = window.audit; const out = [];
        const original = line.toBlob; line.toBlob = callback => callback(null);
        try { await manager.generate({ count: 2, width: 640, height: 360 }); } catch { out.push(!manager.isGenerating); }
        line.toBlob = original;
        manager.onProgress = () => { throw new Error('描画後の異常'); };
        try { await manager.generate({ count: 2, width: 640, height: 360 }); } catch { out.push(!manager.isGenerating); }
        manager.onProgress = null;
        for (const options of [{ count: 0 }, { count: 51 }, { count: 1, width: Infinity }, { count: 1, height: 4097 }]) {
          try { await manager.generate(options); out.push(false); } catch { out.push(!manager.isGenerating); }
        }
        let finish; line.toBlob = callback => { finish = callback; };
        const first = manager.generate({ count: 1, width: 640, height: 360 });
        try { await manager.generate({ count: 1 }); out.push(false); } catch { out.push(true); }
        finish(new Blob(['test'])); await first; line.toBlob = original;
        return out;
      });
      assert.equal(results.length, 7); assert.ok(results.every(Boolean));
      assert.deepEqual(await snapshot(page), before);
      // 単体PNG作成が失敗しても線と背景は消さず、その次の保存を受け付ける。
      await page.evaluate(() => { window.originalToBlob = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = callback => callback(null); document.querySelector('#btnExport').click(); });
      await settle(page); assert.deepEqual(await snapshot(page), before);
      await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
      await checkPng(page, (await download(page, '#btnExport')).bytes);
    }));

    for (const width of [360, 390, 1366]) {
      await run(width + 'pxの操作・保存・横あふれ', () => withPage({ viewport: { width, height: 850 }, hasTouch: width < 500, isMobile: width < 500 }, async page => {
        await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const box = await page.locator('#lineCanvas').boundingBox();
        if (width < 500) await page.touchscreen.tap(box.x + box.width * 0.35, box.y + box.height * 0.4);
        else await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.4);
        await settle(page); const moved = (await snapshot(page)).center;
        assert.ok(Math.abs(moved[0] - 0.35) < 0.02 && Math.abs(moved[1] - 0.4) < 0.02);
        await page.locator('#panelContent').evaluate(el => { el.scrollTop = el.scrollHeight; });
        await checkPng(page, (await download(page, '#btnExport')).bytes);
        assert.match((await download(page, '#btnExportSVG')).name, /\.svg$/);
        await page.screenshot({ path: path.join(artifacts, 'emphasis-' + width + '.png'), fullPage: true });
      }));
    }

    await run('ポインターキャンセル後に中心が勝手に移動しない', () => withPage({}, async page => {
      const b = await page.locator('#lineCanvas').boundingBox();
      await page.mouse.move(b.x + b.width * 0.4, b.y + b.height * 0.4); await page.mouse.down();
      await page.locator('#lineCanvas').dispatchEvent('pointercancel', { pointerId: 1 });
      const center = (await snapshot(page)).center;
      await page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.7); await page.mouse.up();
      assert.deepEqual((await snapshot(page)).center, center);
    }));

    await run('英語版の保存と画像制限表示', () => withPage({}, async page => {
      assert.match(await page.locator('#imageUploadLabel').textContent(), /20 MB/);
      await checkPng(page, (await download(page, '#btnExport')).bytes);
    }, '/emphasis-lines/en/'));

    await run('PWA旧版から更新・編集中画像保持・オフラインPNG/SVG', async () => {
      previousPwa = true;
      const ctx = await context({ serviceWorkers: 'allow' });
      try {
        const page = await ctx.newPage(); page.on('dialog', d => d.accept());
        await page.goto(origin + '/emphasis-lines/'); await installAudit(page);
        await page.waitForFunction(() => !!navigator.serviceWorker.controller);
        await page.evaluate(async () => { await caches.open('unrelated-app-preserved'); localStorage.setItem('emphasis-update-test', 'keep'); });
        await uploaded(page, await imageFile(page, 640, 360, '#446688'), 640, 360); const before = await snapshot(page);
        const other = await ctx.newPage(); await other.goto(origin + '/emphasis-lines/');
        previousPwa = false;
        await page.evaluate(async () => {
          window.previousController = navigator.serviceWorker.controller;
          await (await navigator.serviceWorker.getRegistration()).update();
        });
        await page.waitForFunction(() => navigator.serviceWorker.controller !== window.previousController && navigator.serviceWorker.controller?.state === 'activated');
        await page.waitForFunction(async target => {
          const keys = await caches.keys(); return keys.includes(target) && !keys.includes('emphasis-lines-previous-e2e');
        }, cacheName);
        assert.deepEqual(await snapshot(page), before);
        assert.equal(await page.evaluate(async () => (await caches.keys()).includes('unrelated-app-preserved')), true);
        await other.close();
        await page.reload(); await installAudit(page);
        if (process.env.EMPHASIS_BROWSER_DEBUG) console.log(await page.evaluate(async () => {
          const data = {};
          for (const key of await caches.keys()) {
            const cache = await caches.open(key);
            const module = await cache.match(new URL('./js/managers/BatchManager.js', location.href).href);
            data[key] = module ? (await module.text()).includes('previous-module') : null;
          }
          return { caches: data, controller: navigator.serviceWorker.controller?.state };
        }));
        assert.equal((await page.content()).includes('previous-shell'), false);
        assert.equal(await page.evaluate(async v => (await (await fetch('./js/managers/BatchManager.js?v=' + v)).text()).includes('previous-module'), version), false);
        await page.evaluate(() => document.fonts.ready);
        await ctx.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' }); await installAudit(page);
        assert.equal(await page.evaluate(() => localStorage.getItem('emphasis-update-test')), 'keep');
        await checkPng(page, (await download(page, '#btnExport')).bytes);
        assert.match((await download(page, '#btnExportSVG')).name, /\.svg$/);
        // JSZip未読込のオフライン起動では処理前に失敗し、プレビューを維持する。
        const current = await snapshot(page);
        await ctx.route('**/cdnjs.cloudflare.com/**', route => route.abort());
        const rejected = await page.evaluate(async () => { try { await window.audit.manager.downloadAsZip({ count: 1 }); return false; } catch { return !window.audit.manager.isGenerating; } });
        assert.equal(rejected, true); assert.deepEqual(await snapshot(page), current);
      } finally { previousPwa = false; await ctx.close(); }
    });
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify({ passed, failed, chromium: browser.version(), artifacts }));
  if (failed) process.exitCode = 1;
}

main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });

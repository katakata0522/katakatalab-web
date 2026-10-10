const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const enabled = process.env.RUN_PIKALAB_DEEPSEA_BROWSER === '1';
const root = path.resolve(__dirname, '../../dist');
const artifacts = path.resolve(__dirname, '../../visual-guard-artifacts/deepsea');

// 許可されたCIで生成物を検査する。通常のNodeテストでは起動しない。
test('Deep Seaの潜行・モーダル・ソナー・音声・HUDを実ブラウザで検証する', { skip: !enabled, timeout: 240000 }, async t => {
  const { chromium } = require('playwright');
  const server = http.createServer((req, res) => {
    try {
      let urlPath = new URL(req.url, 'http://localhost').pathname;
      assert.ok(urlPath.startsWith('/pikalab/'));
      let relative = decodeURIComponent(urlPath.slice('/pikalab/'.length));
      if (relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(root, relative);
      assert.ok(file.startsWith(root + path.sep));
      const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  t.after(async () => { await browser?.close(); await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); });
  browser = await chromium.launch({ headless: true });
  fs.mkdirSync(artifacts, { recursive: true });
  const results = [];
  for (const viewport of [1280, 800, 799, 641, 640, 390, 320].map(width => ({ width, height: width > 640 ? 900 : 844 }))) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.addInitScript(() => {
      window.__snowMessages = [];
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function(message, ...rest) {
        if (message?.type) window.__snowMessages.push(message.type);
        return post.call(this, message, ...rest);
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const url = `http://127.0.0.1:${server.address().port}/pikalab/deepsea_lab/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('#creatures-container [data-fact-id]').length >= 25);
    await page.locator('#scroll-container').evaluate(el => { el.style.scrollBehavior = 'auto'; });
    const initialGeometry = await page.evaluate(() => {
      const guide = document.querySelector('.ecology-guide').getBoundingClientRect();
      const marker = document.querySelector('.depth-marker[data-depth="650"]').getBoundingClientRect();
      const content = document.getElementById('deep-sea-content').getBoundingClientRect();
      return { guideLeft: guide.left, guideRight: guide.right, markerTop: marker.top, expectedMarkerTop: content.top + 650 };
    });
    assert.ok(initialGeometry.guideLeft >= 0 && initialGeometry.guideRight <= viewport.width, '説明は初期の表示幅に収まる');
    assert.ok(Math.abs(initialGeometry.markerTop - initialGeometry.expectedMarkerTop) < 1, '水深目盛りと生物の座標原点は同じ');
    const ecology = [];
    for (const night of [false, true]) {
      if (night) {
        await page.locator('#btn-time').click();
        await page.waitForTimeout(2200);
      }
      const geometry = await page.locator('#creatures-container [data-fact-id]').evaluateAll(nodes => nodes.filter(node => node.dataset.factId !== 'vent').map(node => {
        const r = node.getBoundingClientRect();
        const caption = node.querySelector('.ecology-caption')?.getBoundingClientRect();
        const y = caption ? Math.min(r.y, caption.y) : r.y;
        return { id: node.dataset.factId, x: r.x, y, w: r.width, h: r.bottom - y, depth: node.dataset.exhibitDepth, fluorescent: node.dataset.fluorescent };
      }));
      const collisions = [];
      for (let i=0; i<geometry.length; i++) for (let j=i+1; j<geometry.length; j++) {
        const a=geometry[i], b=geometry[j];
        const area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
        if (area>1) collisions.push({a:a.id,b:b.id,area});
      }
      assert.deepEqual(collisions, [], `${viewport.width}px ${night ? 'night' : 'day'}: exhibit image/label overlap`);
      assert.ok(geometry.every(node => !node.fluorescent));
      assert.equal(geometry.find(node => node.id === 'barreleye').depth, '700');
      assert.equal(geometry.find(node => node.id === 'cookiecutter_shark').depth, night ? '50' : '1500');
      assert.equal(geometry.find(node => node.id === 'viperfish').depth, night ? '650' : '800');
      const panChecks = [];
      const initialLeft = await page.locator('#scroll-container').evaluate(el => el.scrollLeft);
      const maxLeft = await page.locator('#scroll-container').evaluate(el => el.scrollWidth - el.clientWidth);
      for (const left of [0, maxLeft / 2, maxLeft]) {
        await page.locator('#scroll-container').evaluate((el, left) => { el.scrollLeft = left; }, left);
        const zoneOverlaps = await page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('.depth-label')).map(el => ({ depth: el.parentElement.dataset.depth, rect: el.getBoundingClientRect() }));
          const visibleParts = Array.from(document.querySelectorAll('#creatures-container img, #creatures-container .creature-label, #creatures-container .ecology-caption, #creatures-container .encounter-caption')).filter(el => Number(getComputedStyle(el).opacity) > 0).map(el => ({ id: el.closest('[data-fact-id]')?.dataset.factId || 'encounter', part: el.tagName === 'IMG' ? 'image' : el.className, rect: el.getBoundingClientRect() }));
          const overlaps = [];
          for (const label of labels) for (const part of visibleParts) {
            const a = label.rect, b = part.rect;
            const area = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            if (area > 1) overlaps.push({ depth: label.depth, id: part.id, part: part.part, area });
          }
          return overlaps;
        });
        assert.deepEqual(zoneOverlaps, [], `${viewport.width}px ${night ? 'night' : 'day'} pan${left}: fixed zone label overlap`);
        panChecks.push({ left, zoneOverlaps });
      }
      await page.locator('#scroll-container').evaluate((el, left) => { el.scrollLeft = left; }, initialLeft);
      ecology.push({ night, geometry, collisions, panChecks });
      if (night) await page.screenshot({ path: path.join(artifacts, `${viewport.width}-night-shallow.png`) });
    }
    await page.locator('#btn-time').click();
    await page.waitForTimeout(2200);
    await page.locator('#scroll-container').evaluate(el => { el.scrollTop = 950; });
    await settleView(page, 500);
    for (const id of ['whale', 'barreleye', 'viperfish', 'squid']) {
      await page.locator(`[data-fact-id="${id}"]`).evaluate(el => {
        const scroll = document.getElementById('scroll-container');
        const r = el.getBoundingClientRect();
        const viewport = scroll.getBoundingClientRect();
        const worldX = r.x - viewport.x + scroll.scrollLeft;
        scroll.scrollLeft = Math.max(0, Math.min(scroll.scrollWidth - scroll.clientWidth, worldX + r.width / 2 - scroll.clientWidth / 2));
      });
      const target = await page.locator(`[data-fact-id="${id}"] img`).boundingBox();
      assert.ok(target);
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
      await page.waitForTimeout(450);
      const overlaps = await page.locator('#creatures-container [data-fact-id]').evaluateAll(nodes => {
        const cards = nodes.filter(node => node.dataset.factId !== 'vent').map(node => ({ id: node.dataset.factId, r: node.getBoundingClientRect() }));
        const result = [];
        for (let i=0;i<cards.length;i++) for(let j=i+1;j<cards.length;j++) {
          const a=cards[i].r, b=cards[j].r;
          const area=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
          if(area>1) result.push({a:cards[i].id,b:cards[j].id,area});
        }
        return result;
      });
      assert.deepEqual(overlaps, [], `${viewport.width}px hover ${id}: exhibit overlap`);
    }
    await page.locator('#scroll-container').evaluate(el => { el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; });
    await page.screenshot({ path: path.join(artifacts, `${viewport.width}-encounter-hover.png`) });
    await page.mouse.move(0, 0);
    await page.locator('#scroll-container').evaluate(el => { el.scrollTop = 0; });
    await settleView(page, 0);
    await page.locator('#btn-light-type').click();
    assert.equal(await page.locator('#light-type-label').textContent(), 'いろライト（演出）');
    assert.equal(await page.locator('[data-fluorescent="true"]').count(), 0);
    await page.locator('#btn-light-type').click();
    if (viewport.width < 640) {
      const surface = await page.evaluate(() => {
        const hud = document.getElementById('hud-panel').getBoundingClientRect();
        const title = document.querySelector('#title-section h2').getBoundingClientRect();
        const nav = document.querySelector('nav').getBoundingClientRect();
        return { hudTop: hud.top, hudBottom: hud.bottom, titleTop: title.top, navBottom: nav.bottom };
      });
      assert.ok(surface.hudTop >= surface.navBottom && surface.hudBottom <= surface.titleTop, '最小化HUDはナビと開始タイトルを隠さない');
    }
    await page.screenshot({ path: path.join(artifacts, `${viewport.width}-surface.png`) });
    await page.locator('#scroll-container').evaluate(el => { el.scrollLeft = 0; });
    // 浮遊アニメーションは停止しない。見えている画像の中心を実際にクリックする。
    const clownfish = await page.locator('[data-fact-id="clownfish"] img').boundingBox();
    assert.ok(clownfish && clownfish.x >= 0 && clownfish.x + clownfish.width < viewport.width && clownfish.y >= 64 && clownfish.y + clownfish.height < viewport.height);
    await page.mouse.click(clownfish.x + clownfish.width / 2, clownfish.y + clownfish.height / 2);
    await page.waitForFunction(() => document.getElementById('deepsea-learning-note')?.textContent.includes('Amphiprion ocellaris'));
    assert.ok((await page.locator('#deepsea-learning-note').textContent()).includes('展示点'));
    assert.ok(await page.locator('#deepsea-learning-note a[href^="https://"]').count() > 0);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('sea-modal').classList.contains('hidden') && !document.querySelector('.flash-overlay'));
    await page.locator('#scroll-container').evaluate(el => { el.scrollTop = 1100; });
    await settleView(page, 650);
    await page.screenshot({ path: path.join(artifacts, `${viewport.width}-upper-ecology.png`) });
    await page.locator('#scroll-container').evaluate(el => { el.scrollTop = 2650; });
    await settleView(page, 2200);
    await page.screenshot({ path: path.join(artifacts, `${viewport.width}-seafloor-ecology.png`) });
    await page.locator('#scroll-container').evaluate(el => { el.scrollTop = 0; });
    await page.locator('#btn-album').click();
    await page.waitForFunction(() => document.getElementById('album-modal').contains(document.activeElement));
    assert.equal(await page.locator('nav').evaluate(el => el.inert), true);
    assert.equal(await page.locator('#scroll-container').evaluate(el => el.inert), true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('album-modal').classList.contains('hidden'));
    assert.equal(await page.locator('nav').evaluate(el => el.inert), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-album');
    await page.waitForFunction(() => window.__snowMessages.filter(type => type === 'PLAY' || type === 'PAUSE').at(-1) === 'PLAY');

    await page.locator('#scroll-container').evaluate(el => { el.style.scrollBehavior = 'auto'; el.scrollTop = 5450; });
    await page.waitForFunction(() => document.getElementById('depth-val').textContent === (5000).toLocaleString());
    if (await page.locator('#hud-container').evaluate(el => el.classList.contains('hud-minimized'))) await page.locator('#btn-hud-toggle').click();
    const expanded = await hudGeometry(page);
    assert.equal(expanded.intersection, 0, '展開したHUDで開閉ボタンが数字を隠さない');
    assert.ok(expanded.digits.x >= expanded.panel.x, '数字はパネルの内側');
    await page.screenshot({ path: path.join(artifacts, `${viewport.width}-depth-expanded.png`) });
    await page.locator('#btn-hud-toggle').click();
    const minimized = await hudGeometry(page, true);
    assert.equal(minimized.intersection, 0, '最小化HUDでも開閉ボタンが数字を隠さない');
    await page.screenshot({ path: path.join(artifacts, `${viewport.width}-depth-minimized.png`) });
    await page.locator('#scroll-container').evaluate(el => { el.scrollTop = 10450; });
    await page.waitForFunction(() => document.getElementById('depth-val-mini').textContent === (10000).toLocaleString());
    assert.equal((await hudGeometry(page, true)).intersection, 0);
    await page.locator('#btn-hud-toggle').click();
    const maximum = await hudGeometry(page);
    assert.equal(maximum.intersection, 0);
    assert.ok(maximum.digits.x >= maximum.panel.x);

    await page.locator('#scroll-container').evaluate(el => { el.scrollTop = 2450; });
    await page.waitForFunction(() => document.getElementById('depth-val').textContent === (2000).toLocaleString());
    // 空いている海を実際にクリックし、見える波紋の生成を確認する。
    const sea = await page.locator('#scroll-container').boundingBox();
    await page.mouse.click(sea.x + 8, sea.y + sea.height / 2);
    await page.waitForFunction(() => document.querySelector('#deep-sea-content .animate-sonar-wave'));
    assert.ok(await page.locator('#deep-sea-content .sonar-detected').count() > 0);
    await page.screenshot({ path: path.join(artifacts, `${viewport.width}-sonar.png`) });
    await page.locator('#btn-audio').click();
    assert.equal(await page.locator('#sound-icon').textContent(), 'volume_off');
    await page.locator('#btn-audio').click();
    assert.equal(await page.locator('#sound-icon').textContent(), 'volume_up');
    for (let i = 0; i < 6; i++) await page.locator('#btn-time').click();
    assert.ok((await page.locator('#time-label').textContent()).includes('ひる'));
    assert.deepEqual(errors, []);
    results.push({ viewport, ecology, expanded, minimized, snowMessages: await page.evaluate(() => window.__snowMessages), errors });
    await context.close();
  }
  fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify(results, null, 2));
});

async function hudGeometry(page, mini = false) {
  await page.waitForTimeout(350);
  return page.evaluate(mini => {
    const a = document.getElementById('btn-hud-toggle').getBoundingClientRect();
    const b = document.getElementById(mini ? 'depth-val-mini' : 'depth-val').getBoundingClientRect();
    const p = document.getElementById('hud-panel').getBoundingClientRect();
    const rect = r => ({ x: r.x, y: r.y, width: r.width, height: r.height });
    return { button: rect(a), digits: rect(b), panel: rect(p), intersection: Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) };
  }, mini);
}


async function settleView(page, depth) {
  await page.waitForFunction(depth => document.getElementById('depth-val').textContent === depth.toLocaleString(), depth);
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#creatures-container img')).filter(img => {
    const r = img.getBoundingClientRect();
    return r.bottom > 64 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }).every(img => img.complete && img.naturalWidth > 0));
}

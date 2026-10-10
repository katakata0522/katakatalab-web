const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

// CIでビルド後に明示実行する。通常のNodeテストではブラウザを起動しない。
// RUN_PIKALAB_TOP_BROWSER=1 node --test tests/top-browser.test.cjs
const enabled = process.env.RUN_PIKALAB_TOP_BROWSER === '1';
const root = path.resolve(__dirname, '../dist');
const storageKey = 'pikalab_profile_v1';
const catalog = require('../js/app-data.json').apps.filter(app => !app.isAmazonCard);
const alwaysVisible = new Set(['focus-timer', 'speed-reader']);

function expectedIds(category) {
    return catalog.filter(app => category === 'parents'
        ? app.categories.includes('parents')
        : alwaysVisible.has(app.id) || (!app.categories.includes('parents') && (category === 'middle' || app.categories.includes(category))))
        .map(app => app.id);
}

// pwa-cache-e2e.mjsと同じ公開プレフィックスで、生成済み成果物だけを配信する。
function createBuiltServer() {
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    return http.createServer((request, response) => {
        try {
            const pathname = new URL(request.url, 'http://localhost').pathname;
            if (!pathname.startsWith('/pikalab/')) throw new Error('outside test scope');
            let relative = decodeURIComponent(pathname.slice('/pikalab/'.length));
            if (!relative || relative.endsWith('/')) relative += 'index.html';
            const file = path.resolve(root, relative);
            if (!file.startsWith(root + path.sep)) throw new Error('outside build');
            const bytes = fs.readFileSync(file);
            response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            response.end(bytes);
        } catch {
            response.writeHead(404);
            response.end('Not found');
        }
    });
}

async function ready(page) {
    await page.waitForFunction(() => document.querySelectorAll('#apps-grid .app-card').length > 0);
}

async function entered(page) {
    await page.waitForFunction(() => document.getElementById('login-modal').style.display === 'none' && !document.getElementById('main-interface').inert);
}

async function openMenu(page) {
    await page.locator('#menu-toggle-btn').click();
    await page.waitForFunction(() => document.activeElement?.id === 'app-search');
}

async function closeMenu(page) {
    await page.locator('#app-search').press('Escape');
    await page.locator('#dropdown-menu').waitFor({ state: 'hidden' });
}

async function readProfile(page) {
    return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
}

async function launch(page, link, baseUrl) {
    const id = await link.getAttribute('data-launch-app');
    const href = await link.getAttribute('href');
    const before = (await readProfile(page)).playCounts[id] || 0;
    // アイコンを押しても委譲ハンドラが親リンクを解決する。
    const [popup] = await Promise.all([page.waitForEvent('popup'), link.locator('span').first().click()]);
    await popup.waitForURL(new URL(href, baseUrl).href);
    assert.equal(popup.url(), new URL(href, baseUrl).href);
    await popup.close();
    const saved = await readProfile(page);
    assert.equal(saved.playCounts[id], before + 1, '一回のクリックを一回だけ記録する');
    assert.equal(saved.recentApps[0].id, id);
    assert.ok(saved.badges.includes(id));
    await page.locator('#launcher-overlay').waitFor({ state: 'hidden' });
    return id;
}

test('ビルド済みTOPの入室・全カテゴリ・検索・設定復元・起動導線を検証する', { skip: !enabled, timeout: 120000 }, async t => {
    assert.ok(fs.existsSync(path.join(root, 'index.html')), '先にnpm run buildを実行してください');
    const { chromium } = require('playwright');
    const server = createBuiltServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    t.after(async () => {
        try {
            await browser?.close();
        } finally {
            await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
        }
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}/pikalab/`;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    // 新しいタブのリンク先だけを確認し、個々のLabの実行はこのテストの対象に含めない。
    await context.route('**/*', route => {
        const request = route.request();
        if (request.isNavigationRequest() && request.url().startsWith(baseUrl) && request.url() !== baseUrl) {
            return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>TOP navigation target</title>' });
        }
        return route.continue();
    });
    await context.addInitScript(key => {
        window.__profileWrites = 0;
        window.__audioStarts = 0;
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
            if (this === localStorage && name === key) window.__profileWrites++;
            return setItem.call(this, name, value);
        };
        // resumeが永遠に保留されるブラウザでも、入室は完了しなければならない。
        window.AudioContext = class {
            constructor() { this.state = 'suspended'; }
            createGain() { return { gain: { value: 0 }, connect() {} }; }
            resume() { window.__audioStarts++; return new Promise(() => {}); }
        };
    }, storageKey);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await ready(page);
    await page.locator('#user-name-input').fill('TOPテスト');
    // 遷移アニメーション前の同一ターン連打を確実に再現する。
    await page.locator('#enter-lab-btn').evaluate(button => { button.click(); button.click(); });
    await entered(page);
    assert.equal((await readProfile(page)).loginCount, 1);
    assert.equal((await readProfile(page)).name, 'TOPテスト');
    assert.equal(await page.evaluate(() => window.__profileWrites), 1);
    assert.equal(await page.evaluate(() => window.__audioStarts), 1);

    const cardText = await page.locator('#apps-grid .app-card').evaluateAll(cards => Object.fromEntries(cards.map(card => [card.dataset.appId, card.textContent.toLowerCase()])));
    for (const category of ['low', 'high', 'middle', 'parents']) {
        await page.locator(`#btn-${category}`).click();
        assert.equal(await page.locator(`#btn-${category}`).getAttribute('aria-pressed'), 'true');
        assert.deepEqual(await page.locator('#apps-grid .app-card:not(.hidden)').evaluateAll(cards => cards.map(card => card.dataset.appId)), expectedIds(category));
        await openMenu(page);
        for (const term of ['ラボ', 'PLAY_ARROW', 'zzzz-no-match']) {
            await page.locator('#app-search').fill(term);
            const expected = expectedIds(category).filter(id => cardText[id].includes(term.toLowerCase()));
            assert.deepEqual(await page.locator('#apps-grid .app-card:not(.hidden)').evaluateAll(cards => cards.map(card => card.dataset.appId)), expected);
            assert.equal(await page.locator('#search-empty').isVisible(), expected.length === 0);
        }
        await page.locator('#app-search-clear').click();
        assert.equal(await page.locator('#app-search').inputValue(), '');
        await closeMenu(page);
    }
    await page.locator('#btn-low').click();
    assert.equal(await page.locator('[data-app-id="focus-timer"]').isVisible(), true);

    await page.locator('header [data-action="open-settings"]:visible').click();
    await page.locator('#settings-modal').waitFor({ state: 'visible' });
    // フェード後の初期フォーカスがキー入力中に移動しないよう、ダイアログの準備を待つ。
    await page.waitForFunction(() => document.getElementById('settings-modal').contains(document.activeElement));
    await page.locator('#volume-slider').press('End');
    for (let i = 0; i < 8; i++) await page.locator('#volume-slider').press('ArrowLeft');
    await page.locator('#settings-sound-toggle').click();
    await page.locator('#text-large').click();
    await page.locator('#motion-toggle').click();
    const savedSettings = await readProfile(page);
    assert.equal(savedSettings.volumeDb, -8);
    assert.equal(savedSettings.isMuted, true);
    assert.equal(savedSettings.textSize, 'large');
    assert.equal(savedSettings.reduceMotion, true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page);
    await entered(page);
    assert.equal(await page.locator('body').evaluate(body => body.classList.contains('text-large') && body.classList.contains('reduce-motion')), true);
    assert.equal(await page.locator('#sound-icon').textContent(), 'volume_off');
    await page.locator('#main-sound-toggle').click();
    assert.equal((await readProfile(page)).isMuted, false);
    await page.locator('header [data-action="open-settings"]:visible').click();
    assert.equal(await page.locator('#volume-slider').inputValue(), '-8');
    await page.locator('#settings-modal [data-close-modal]').first().click();
    await page.locator('#settings-modal').waitFor({ state: 'hidden' });

    await openMenu(page);
    await page.locator('#dropdown-menu [data-action="open-record"]').click();
    await page.locator('#record-modal').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.getElementById('record-modal').contains(document.activeElement));
    assert.equal(await page.locator('#main-interface').evaluate(main => main.inert), true);
    assert.equal(await page.locator('footer').evaluate(footer => footer.closest('[inert]')?.id), 'main-interface');
    assert.ok(await page.locator('#badge-grid .badge-item').count() > 0);
    await page.keyboard.press('Escape');
    await page.locator('#record-modal').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#main-interface').evaluate(main => main.inert), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'menu-toggle-btn');
    await page.locator('#dropdown-menu').waitFor({ state: 'hidden' });

    const missionId = await launch(page, page.locator('#mission-section a[data-launch-app]'), baseUrl);
    assert.equal(await page.locator('#mission-section a[data-launch-app]').count(), 0);
    assert.ok((await readProfile(page)).lastMissionClearedDate);
    const cardId = await launch(page, page.locator('#apps-grid .app-card:not(.hidden) a[data-launch-app]').first(), baseUrl);
    await openMenu(page);
    assert.equal(await page.locator('#recent-list a[data-launch-app]').first().getAttribute('data-launch-app'), cardId, '再読み込みなしで直前の起動履歴を表示する');
    await launch(page, page.locator('#recent-list a[data-launch-app]').first(), baseUrl);
    await page.locator('#dropdown-menu').waitFor({ state: 'hidden' });
    assert.ok((await readProfile(page)).badges.includes(missionId));
    assert.deepEqual(errors, [], 'TOPの実行時例外がない');

    const blocked = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await blocked.addInitScript(() => {
        for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Storage denied', 'SecurityError'); };
        window.AudioContext = class { constructor() { throw new Error('Audio unavailable'); } };
    });
    const blockedPage = await blocked.newPage();
    const blockedErrors = [];
    blockedPage.on('pageerror', error => blockedErrors.push(error.message));
    await blockedPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await ready(blockedPage);
    await blockedPage.locator('#guest-enter-btn').click();
    await entered(blockedPage);
    await openMenu(blockedPage);
    await blockedPage.locator('#dropdown-menu [data-action="open-settings"]').click();
    await blockedPage.locator('#text-large').click();
    assert.equal(await blockedPage.locator('body').evaluate(body => body.classList.contains('text-large')), true);
    assert.deepEqual(blockedErrors, [], '保存・音声が拒否されても操作は継続できる');
    await blocked.close();
});


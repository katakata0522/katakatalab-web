import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const artifactDir = path.join(root, 'visual-guard-artifacts', 'manabi');
const PROFILE = 'wonder_school_profile_v2';
const VIEWPORTS = [
    { width: 320, height: 568 }, { width: 390, height: 844 },
    { width: 667, height: 375 }, { width: 1280, height: 800 }
];
const results = [];
const failures = [];
const servers = [];
let browser;
let candidateUrl;
let baselineUrl;

// Viteのpublic優先配信で、実際の配信物の欠落を隠さない。
async function serveDist(directory) {
    await access(path.join(directory, 'manabi_land/index.html'));
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
        '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
    const server = createServer(async (request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            let file = path.resolve(directory, `.${pathname}`);
            if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
            if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
            response.writeHead(200, { 'Content-Type': `${mime[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
            response.end(await readFile(file));
        } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(); }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    servers.push({ close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) });
    return `http://127.0.0.1:${server.address().port}/manabi_land/`;
}

// 配信後に同じ実ビルドを照合できるよう、入口から参照されるローカル資産だけを記録する。
async function writeAssetManifest() {
    const origin = 'http://manabi-build.invalid';
    const documentUrl = new URL('/manabi_land/index.html', origin);
    const queue = [{ url: documentUrl, from: null }];
    const files = new Map();
    while (queue.length) {
        const { url, from } = queue.shift();
        if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) continue;
        const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        if (files.has(relative)) {
            if (from && !files.get(relative).referencedBy.includes(from)) files.get(relative).referencedBy.push(from);
            continue;
        }
        const file = path.resolve(dist, relative);
        assert.ok(file.startsWith(dist + path.sep), 'ビルド外のファイルを参照しない');
        const content = await readFile(file);
        files.set(relative, { path: relative, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex'), referencedBy: from ? [from] : [] });
        const source = content.toString('utf8');
        const refs = [];
        if (file.endsWith('.html')) {
            for (const match of source.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) refs.push(new URL(match[1].replaceAll('&amp;', '&'), url));
        } else if (file.endsWith('.css')) {
            for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) refs.push(new URL(match[1], url));
            for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gi)) refs.push(new URL(match[1], url));
        } else if (relative === 'manabi_land/script.js') {
            // Toneローダーの相対URLはscriptの場所でなく、ドキュメントに対して解決される。
            for (const match of source.matchAll(/\.load\(\s*["']([^"']+)["']/g)) refs.push(new URL(match[1], documentUrl));
        }
        for (const ref of refs) if (ref.origin === origin && ref.pathname !== url.pathname) queue.push({ url: ref, from: relative });
    }
    await writeFile(path.join(artifactDir, 'asset-manifest.json'), `${JSON.stringify({
        entry: 'manabi_land/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path))
    }, null, 2)}\n`);
}

// 基準版は任意の完全なcheckout/pikalabまたはdistを指定できる。候補版は必ずdistを使う。
async function serveBaseline(input) {
    let directory = path.resolve(input);
    try { await access(path.join(directory, 'pikalab/manabi_land/index.html')); directory = path.join(directory, 'pikalab'); } catch {}
    await access(path.join(directory, 'manabi_land/index.html'));
    if (path.basename(directory) === 'dist') return serveDist(directory);
    const server = await createViteServer({ root: directory, configFile: false, logLevel: 'error',
        server: { host: '127.0.0.1', port: 0, strictPort: false } });
    await server.listen();
    servers.push(server);
    return `http://127.0.0.1:${server.httpServer.address().port}/manabi_land/`;
}

function deterministicEnvironment(options) {
    let seed = 0x45a10;
    window.__manabiSetSeed = value => { seed = value >>> 0; };
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
    if (options.profile !== undefined && !sessionStorage.getItem('manabi-e2e-seeded')) {
        localStorage.setItem('wonder_school_profile_v2', options.profile);
        sessionStorage.setItem('manabi-e2e-seeded', 'true');
    }
    if (options.blockStorage) {
        for (const method of ['getItem', 'setItem', 'removeItem']) {
            Storage.prototype[method] = () => { throw new DOMException('Storage disabled for test', 'SecurityError'); };
        }
    }
    window.__manabiAudioOptions = options.audio || {};
}

// 遅延・失敗はロード境界だけで制御し、製品のAudioManagerをそのまま動かす。
function mockAudioLoader() {
    const options = window.__manabiAudioOptions || {};
    const waiting = [];
    const log = window.__manabiAudioMock = { loads: 0, starts: 0, created: 0, disposed: 0, sounds: [],
        release() { options.holdLoad = false; waiting.splice(0).forEach(resolve => resolve()); } };
    class Node {
        constructor() { log.created++; this.volume = { value: 0 }; }
        toDestination() { return this; }
        dispose() { log.disposed++; }
        triggerAttackRelease(...args) { log.sounds.push(args); }
    }
    const context = { state: 'suspended', async suspend() { this.state = 'suspended'; }, async resume() { this.state = 'running'; } };
    window.Tone = { Synth: Node, PolySynth: Node, Destination: { mute: false, volume: { value: -20 } },
        context: { rawContext: context, get state() { return context.state; } }, now: () => 0,
        async start() { log.starts++; if (log.starts <= (options.failStarts || 0)) throw new Error('Expected Tone.start failure'); context.state = 'running'; } };
    window.PikaLabToneLoader = { async load() {
        log.loads++;
        if (options.holdLoad) await new Promise(resolve => waiting.push(resolve));
        if (log.loads <= (options.failLoads || 0)) throw new Error('Expected local Tone load failure');
        return window.Tone;
    } };
}

async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const context = await browser.newContext({ viewport, colorScheme: 'light', reducedMotion: 'reduce' });
    await context.addInitScript(deterministicEnvironment, options);
    await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    await context.route('https://fonts.gstatic.com/**', route => route.abort());
    if (!options.realAudio) await context.route('**/js/tone-loader.js*', route => route.fulfill({ contentType: 'application/javascript', body: `(${mockAudioLoader})();` }));
    if (!options.noCapture) {
        await context.route('**/manabi_land/script.js*', async route => {
            const response = await route.fetch();
            assert.equal(response.status(), 200, '実ビルドのゲームスクリプトを取得できる');
            const source = await response.text();
            // テスト専用参照を取得するだけで、ゲーム状態や製品コードを置き換えない。
            await route.fulfill({ response, body: `${source}\n;(() => {
                const init = ManabiLandApp.prototype.init;
                ManabiLandApp.prototype.init = function (...args) {
                    Object.defineProperty(window, '__manabiE2EApp', { value: this, configurable: true });
                    return init.apply(this, args);
                };
            })();` });
        });
    }
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    if (options.realAudio) page.on('console', message => {
        if (['error', 'warning'].includes(message.type()) && /オーディオ初期化に失敗|効果音を再生できません/.test(message.text())) errors.push(message.text());
    });
    if (!options.realAudio && !options.realTime) {
        await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
        await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    }
    return { context, page, errors, options };
}

async function ready(testCase, url = candidateUrl) {
    const { page, options } = testCase;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('nav-money').getAttribute('aria-selected') === 'true' && Number.parseInt(document.getElementById('target-price').textContent, 10) > 0);
    if (!options.noCapture) await page.waitForFunction(() => Boolean(window.__manabiE2EApp));
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; scroll-behavior: auto !important; } .fade-enter, #parents-modal[open], .tray-coin, .moji-hint, .star-blink, .star-confetti { animation: none !important; }' });
    await page.evaluate(() => document.fonts.ready);
    if (!options.realAudio && !options.realTime) await page.clock.runFor(120);
}

// ResizeObserverは偽時計のrunForでは同期されない。サイズ検証だけは実時間のContextで、
// ネイティブ通知と次の描画を待ってから測る。製品のobserverや位置更新は直接呼ばない。
async function resizeAndSettle(page, viewport) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise((resolve, reject) => {
        const face = document.getElementById('clock-face');
        let observer;
        const timeout = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`時計のネイティブリサイズ待機がタイムアウト: ${face.clientWidth}x${face.clientHeight}`));
        }, 5000);
        observer = new ResizeObserver(() => {
            observer.disconnect();
            requestAnimationFrame(() => requestAnimationFrame(() => {
                clearTimeout(timeout);
                resolve();
            }));
        });
        observer.observe(face);
    }));
}

async function screenshot(page, name) {
    await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled', timeout: 10_000 });
}

async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const started = Date.now();
    const record = { name, viewport, status: 'passed' };
    let current;
    try {
        current = await createCase(viewport, options);
        await ready(current);
        await work(current.page, record);
        assert.deepEqual(current.errors, [], '未処理のブラウザ例外がない');
        console.log(`[OK] Manabi Land: ${name}`);
    } catch (error) {
        record.status = 'failed';
        record.error = error.stack || String(error);
        failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Manabi Land: ${name}: ${error.message}`);
        if (current?.page) {
            try { await screenshot(current.page, `${name}-failure`); } catch (captureError) { record.screenshotError = captureError.message; }
        }
    } finally {
        record.durationMs = Date.now() - started;
        record.pageErrors = current?.errors || [];
        await current?.context.close();
        results.push(record);
        await writeFile(path.join(artifactDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
    }
}

async function selectedTab(page, name) {
    const tabs = await page.locator('[role="tab"]').evaluateAll(nodes => nodes.map(node => ({ id: node.id, selected: node.getAttribute('aria-selected'), tabIndex: node.tabIndex })));
    assert.deepEqual(tabs, ['money', 'clock', 'moji'].map(id => ({ id: `nav-${id}`, selected: String(id === name), tabIndex: id === name ? 0 : -1 })), '選択状態とロービングtabindexを同期する');
    assert.equal(await page.locator('.tab-content.active').getAttribute('id'), `tab-${name}`);
}

async function addAmount(page, amount) {
    assert.ok(Number.isInteger(amount) && amount >= 0, '金額は非負整数');
    for (const value of [100, 50, 10, 5, 1]) {
        while (amount >= value) { await page.locator(`.coin-btn[data-value="${value}"]`).click(); amount -= value; }
    }
}

async function answerMoney(page, change = false) {
    const target = change
        ? Number(await page.locator('#change-paid').textContent()) - Number(await page.locator('#change-item-price').textContent())
        : Number.parseInt(await page.locator('#target-price').textContent(), 10);
    await page.locator('#btn-money-reset').click();
    await addAmount(page, target);
    await page.locator('#btn-money-check').click();
    assert.equal(await page.locator('#hanamaru-overlay').evaluate(node => node.classList.contains('show')), true);
}

async function clockValue(page) {
    return page.evaluate(() => {
        const rotation = id => Number(document.getElementById(id).style.transform.match(/rotate\(([-\d.]+)deg\)/)[1]);
        const minute = Math.round(rotation('hand-minute') / 6) % 60;
        return { hour: Math.round((rotation('hand-hour') - minute * 0.5) / 30) % 12 || 12, minute };
    });
}

async function setClock(page, hour, minute) {
    let current = await clockValue(page);
    for (let i = 0; i < current.minute / 5; i++) await page.locator('[data-action="dec-m"]').click();
    current = await clockValue(page);
    for (let i = 0; i < (hour - current.hour + 12) % 12; i++) await page.locator('[data-action="inc-h"]').click();
    for (let i = 0; i < minute / 5; i++) await page.locator('[data-action="inc-m"]').click();
    assert.deepEqual(await clockValue(page), { hour, minute });
}

async function correctMoji(page) {
    const target = await page.locator('#target-char').textContent();
    return page.locator('.moji-cell').filter({ hasText: new RegExp(`^${target}$`) });
}

async function verifyMoji(page, count) {
    assert.equal(await page.locator('.moji-cell').count(), count);
    assert.equal(await (await correctMoji(page)).count(), 1, `${count}マスに正解が必ず1つだけある`);
    assert.equal(await page.locator('.moji-cell:not(button)').count(), 0, '文字マスはnative button');
    assert.equal(await page.locator('.moji-cell:not([aria-label])').count(), 0);
}

async function setHidden(page, hidden) {
    await page.evaluate(hidden => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
}

async function assertTimerPaused(page, label) {
    const before = await page.locator('#timer').textContent();
    await page.clock.runFor(2500);
    assert.equal(await page.locator('#timer').textContent(), before, label);
}

const STATES = ['money-pay', 'money-change', 'clock-read', 'clock-set', 'moji-easy', 'moji-normal', 'moji-hard', 'parents'];
async function chooseState(page, state) {
    await page.evaluate(() => window.__manabiSetSeed(0x51a70));
    if (state.startsWith('money')) {
        await page.locator('#nav-money').click();
        await page.locator(state.endsWith('change') ? '#mode-change' : '#mode-pay').click();
    } else if (state.startsWith('clock')) {
        await page.locator('#nav-clock').click();
        await page.evaluate(() => window.__manabiSetSeed(0x51a70));
        await page.locator(state.endsWith('set') ? '#mode-clock-set' : '#mode-clock-read').click();
    } else if (state.startsWith('moji')) {
        await page.locator('#nav-moji').click();
        await page.evaluate(() => window.__manabiSetSeed(0x51a70));
        await page.locator(`#lvl-${state.split('-')[1]}`).click();
    } else {
        await page.locator('#nav-money').click();
        await page.locator('[data-action="parents-modal-open"]').click();
    }
    await page.evaluate(() => { for (const node of document.querySelectorAll('.tab-content')) node.scrollTop = 0; });
    await page.clock.runFor(120);
}

async function geometry(page) {
    return page.evaluate(() => {
        const selectors = ['header', 'nav', 'main', '#star-card', '#sound-btn', '[data-action="parents-modal-open"]',
            '.tab-content.active', '.tab-content.active h2', '.tab-content.active .compact-card',
            '.tab-content.active button', '#clock-face', '#moji-container', '#parents-modal[open]'];
        const boxes = {};
        for (const selector of selectors) {
            document.querySelectorAll(selector).forEach((node, index) => {
                const rect = node.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const style = getComputedStyle(node);
                boxes[`${selector}:${index}`] = { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                    background: style.backgroundColor, color: style.color, fontSize: style.fontSize, borderRadius: style.borderRadius };
            });
        }
        const roots = [document.querySelector('header'), document.querySelector('nav'), document.querySelector('.tab-content.active'),
            ...(document.querySelector('#parents-modal').open ? [document.querySelector('#parents-modal')] : [])];
        const wording = roots.map(node => {
            const clone = node.cloneNode(true);
            // 出題順とタイマー値は製品の固定文言ではない。選択肢生成の修正で順番が変わることを許容する。
            for (const dynamic of clone.querySelectorAll('#target-price, #item-icon, #item-name, #change-item-icon, #change-item-price, #change-paid, #clock-opts, #clock-question, #timer, #target-char, .moji-cell')) dynamic.textContent = `[${dynamic.id || 'cell'}]`;
            return clone.textContent.replace('あわせね', 'あわせてね').replace(/\s+/g, ' ').trim();
        });
        return { boxes, wording, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth };
    });
}

function compareLayout(before, after, label) {
    assert.deepEqual(after.wording, before.wording, `${label}: 固定文言を維持する`);
    assert.deepEqual(Object.keys(after.boxes), Object.keys(before.boxes), `${label}: 表示構造を維持する`);
    for (const [selector, box] of Object.entries(before.boxes)) {
        for (const property of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(after.boxes[selector][property] - box[property]) <= 1.5,
            `${label}: ${selector}.${property} 基準=${box[property]} 候補=${after.boxes[selector][property]}`);
        for (const property of ['background', 'color', 'fontSize', 'borderRadius']) assert.equal(after.boxes[selector][property], box[property], `${label}: ${selector}.${property}`);
    }
}

async function layoutSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`layout-${viewport.width}x${viewport.height}`, async (page, record) => {
            const baseline = baselineUrl ? await createCase(viewport, { noCapture: true }) : null;
            record.baseline = Boolean(baseline);
            record.states = {};
            try {
                if (baseline) await ready(baseline, baselineUrl);
                for (const state of STATES) {
                    await chooseState(page, state);
                    const after = await geometry(page);
                    assert.ok(after.scrollWidth <= after.width + 1 && after.bodyWidth <= after.width + 1, `${state}: ページ全体に横はみ出しがない`);
                    await screenshot(page, `${viewport.width}x${viewport.height}-${state}-candidate`);
                    record.states[state] = { candidate: after };
                    if (baseline) {
                        await chooseState(baseline.page, state);
                        const before = await geometry(baseline.page);
                        await screenshot(baseline.page, `${viewport.width}x${viewport.height}-${state}-baseline`);
                        record.states[state].baseline = before;
                        compareLayout(before, after, `${viewport.width}x${viewport.height}/${state}`);
                    }
                    if (state.startsWith('moji')) await verifyMoji(page, { 'moji-easy': 9, 'moji-normal': 16, 'moji-hard': 25 }[state]);
                }
                if (baseline) assert.deepEqual(baseline.errors, [], '基準版が例外なく描画される');
            } finally { await baseline?.context.close(); }
        }, {}, viewport);

        const profile = '{"darkMode":true,"isMuted":false,"volumeDb":-20}';
        await runCase(`dark-layout-${viewport.width}x${viewport.height}`, async (page, record) => {
            const baseline = baselineUrl ? await createCase(viewport, { noCapture: true, profile }) : null;
            record.baseline = Boolean(baseline);
            try {
                assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-night')), true, '保存済みdarkModeを起動時に反映する');
                const after = await geometry(page);
                record.candidate = after;
                assert.ok(after.scrollWidth <= after.width + 1 && after.bodyWidth <= after.width + 1, '保存済みテーマでも横はみ出しがない');
                await screenshot(page, `${viewport.width}x${viewport.height}-dark-money-candidate`);
                if (baseline) {
                    await ready(baseline, baselineUrl);
                    assert.equal(await baseline.page.locator('body').evaluate(node => node.classList.contains('theme-night')), true);
                    const before = await geometry(baseline.page);
                    record.baselineGeometry = before;
                    await screenshot(baseline.page, `${viewport.width}x${viewport.height}-dark-money-baseline`);
                    compareLayout(before, after, `${viewport.width}x${viewport.height}/dark-money`);
                    assert.deepEqual(baseline.errors, [], '基準版の保存済みテーマが例外なく描画される');
                }
            } finally { await baseline?.context.close(); }
        }, { profile }, viewport);
    }
}

// DOMのclick()やforceを使わず、スクロール後の実際のヒット領域から操作する。
async function clickReachable(page, target, label, record) {
    const control = typeof target === 'string' ? page.locator(target) : target;
    const before = await control.evaluate(node => {
        const ancestors = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) ancestors.push({ top: parent.scrollTop, left: parent.scrollLeft });
        return ancestors;
    });
    await control.scrollIntoViewIfNeeded();
    const measured = await control.evaluate(node => {
        const rect = node.getBoundingClientRect();
        const clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
        const ancestors = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            const bounds = parent.getBoundingClientRect();
            const left = bounds.left + parent.clientLeft;
            const top = bounds.top + parent.clientTop;
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) {
                clip.left = Math.max(clip.left, left);
                clip.right = Math.min(clip.right, left + parent.clientWidth);
            }
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) {
                clip.top = Math.max(clip.top, top);
                clip.bottom = Math.min(clip.bottom, top + parent.clientHeight);
            }
            ancestors.push({ id: parent.id || parent.tagName, top: parent.scrollTop, left: parent.scrollLeft,
                overflowX: style.overflowX, overflowY: style.overflowY });
        }
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { box: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
            clip, centerHitsControl: hit === node || node.contains(hit), ancestors };
    });
    record.actions.push({ label, before, ...measured });
    const { box, clip } = measured;
    assert.ok(box.width > 0 && box.height > 0 && box.left >= clip.left - 1.5 && box.right <= clip.right + 1.5 &&
        box.top >= clip.top - 1.5 && box.bottom <= clip.bottom + 1.5, `${label}: 操作対象全体を表示できる ${JSON.stringify(measured)}`);
    assert.equal(measured.centerHitsControl, true, `${label}: 中心の実ヒット領域が他の要素に遮られていない`);
    measured.ancestors.forEach((parent, index) => {
        if (Math.abs(parent.top - before[index].top) > 1) assert.match(parent.overflowY, /^(auto|scroll)$/, `${label}: 縦スクロールはユーザーが操作できる領域内で行う (${parent.id})`);
        if (Math.abs(parent.left - before[index].left) > 1) assert.match(parent.overflowX, /^(auto|scroll)$/, `${label}: 横スクロールはユーザーが操作できる領域内で行う (${parent.id})`);
    });
    await control.click();
}

async function reachabilitySuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`reachability-${viewport.width}x${viewport.height}`, async (page, record) => {
            record.actions = [];
            const click = (target, label = target) => clickReachable(page, target, label, record);
            for (const value of [100, 50, 10, 5, 1]) await click(`.coin-btn[data-value="${value}"]`, `money-coin-${value}`);
            assert.equal(await page.locator('#current-money').textContent(), '166');
            await click('#btn-money-reset', 'money-reset');
            assert.equal(await page.locator('#current-money').textContent(), '0');

            await click('#nav-clock', 'clock-tab');
            const value = await clockValue(page);
            const answer = `${value.hour}じ${value.minute ? `${value.minute}ふん` : ''}`;
            const choices = await page.locator('#clock-opts button').allTextContents();
            const wrong = choices.findIndex(text => text.replace(/\s/g, '') !== answer);
            assert.ok(wrong >= 0);
            await click(page.locator('#clock-opts button').nth(wrong), 'clock-read-choice');
            assert.match(await page.locator('#maron-msg').textContent(), /ちがうよ/);
            await click('#mode-clock-set', 'clock-set-mode');
            const initial = await clockValue(page);
            await click('[data-action="inc-m"]', 'clock-set-increment');
            assert.deepEqual(await clockValue(page), { hour: initial.hour, minute: 5 });
            // 合わせる問題は0分または30分なので、5分は確実に不正解となる。
            await click('#clock-check-btn button', 'clock-set-check');
            assert.match(await page.locator('#maron-msg').textContent(), /ズレてる/);
            record.clockScrollTop = await page.locator('#tab-clock').evaluate(node => node.scrollTop);
            if (viewport.width === 667 && viewport.height === 375) {
                assert.ok(record.clockScrollTop > 0, '横長画面では時計の下部操作へ実際にスクロールする');
                await screenshot(page, 'reachability-667x375-clock-controls-scrolled');
            }

            await click('#nav-moji', 'moji-tab');
            await click('#lvl-hard', 'moji-hard-mode');
            await verifyMoji(page, 25);
            const target = await page.locator('#target-char').textContent();
            const wrongCells = page.locator('.moji-cell').filter({ hasNotText: new RegExp(`^${target}$`) });
            await click(wrongCells.first(), 'moji-first-wrong-cell');
            assert.equal(await wrongCells.first().evaluate(node => node.style.backgroundColor), 'rgb(254, 202, 202)');
            await click(wrongCells.last(), 'moji-last-wrong-cell');
            assert.equal(await wrongCells.last().evaluate(node => node.style.backgroundColor), 'rgb(254, 202, 202)');
            await click('#btn-moji-hint', 'moji-hint');
            assert.equal(await (await correctMoji(page)).evaluate(node => node.classList.contains('moji-hint')), true);
            await click('#btn-moji-next', 'moji-next');
            await verifyMoji(page, 25);
            assert.equal(await page.locator('.moji-hint').count(), 0);
            await click(await correctMoji(page), 'moji-correct-cell');
            assert.equal(await page.locator('.moji-cell:disabled').count(), 25);
            await page.clock.runFor(1500);

            const open = '[data-action="parents-modal-open"]';
            for (const method of ['top', 'bottom', 'escape']) {
                await click(open, `parents-open-${method}`);
                assert.equal(await page.locator('#parents-modal').evaluate(node => node.open), true);
                if (method === 'escape') await page.keyboard.press('Escape');
                else await click(method === 'top' ? page.locator('[data-action="parents-modal-close"]').first() : page.locator('[data-action="parents-modal-close"]').last(), `parents-close-${method}`);
                assert.equal(await page.locator('#parents-modal').evaluate(node => node.open), false);
                assert.equal(await page.locator(open).getAttribute('aria-expanded'), 'false');
                assert.equal(await page.locator(open).evaluate(node => node === document.activeElement), true);
            }
        }, {}, viewport);
    }
}

async function interactionSuite() {
    await runCase('money-undo-reset-wrong-correct-change', async page => {
        for (const value of [100, 50, 10, 5, 1]) await page.locator(`.coin-btn[data-value="${value}"]`).click();
        assert.equal(await page.locator('#current-money').textContent(), '166');
        assert.equal(await page.locator('#coin-tray .tray-coin').count(), 5);
        await page.locator('#btn-money-undo').click();
        assert.equal(await page.locator('#current-money').textContent(), '165');
        await page.locator('#btn-money-reset').click();
        await page.locator('#btn-money-undo').click();
        assert.equal(await page.locator('#current-money').textContent(), '0');
        assert.equal(await page.locator('#coin-tray .tray-coin').count(), 0);
        await page.locator('#btn-money-check').click();
        assert.match(await page.locator('#maron-msg').textContent(), /たりない/);
        await screenshot(page, 'money-too-little');
        const target = Number.parseInt(await page.locator('#target-price').textContent(), 10);
        await addAmount(page, target + 1);
        await page.locator('#btn-money-check').click();
        assert.match(await page.locator('#maron-msg').textContent(), /おおいよ/);
        await screenshot(page, 'money-too-much');
        await answerMoney(page);
        await screenshot(page, 'money-correct');
        const money = await page.locator('#current-money').textContent();
        await page.locator('.coin-btn[data-value="1"]').click();
        await page.locator('#mode-change').click();
        await page.locator('#nav-clock').click();
        assert.equal(await page.locator('#current-money').textContent(), money, '正解演出中の入力は無効');
        await selectedTab(page, 'money');
        await page.clock.runFor(1500);
        assert.equal(await page.locator('#current-money').textContent(), '0');
        await page.locator('#mode-change').click();
        assert.equal(await page.locator('#mode-change').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('#mode-pay').getAttribute('aria-pressed'), 'false');
        for (let round = 0; round < 3; round++) {
            assert.equal(await page.locator('#change-level-disp').textContent(), '1');
            assert.equal(Number(await page.locator('#change-item-price').textContent()) % 10, 0);
            await answerMoney(page, true);
            await page.clock.runFor(5000);
        }
        assert.equal(await page.locator('#change-level-disp').textContent(), '2');
        const price = Number(await page.locator('#change-item-price').textContent());
        const paid = Number(await page.locator('#change-paid').textContent());
        assert.ok(price >= 10 && price <= 89 && paid > price, '難易度2でも正のおつりを出題する');
        await screenshot(page, 'money-change-level-2');
        await page.locator('#mode-pay').click();
        assert.equal(await page.locator('#mode-pay').getAttribute('aria-pressed'), 'true');
    });

    await runCase('clock-read-set-boundaries', async page => {
        await page.locator('#nav-clock').click();
        const answer = await clockValue(page);
        const expected = `${answer.hour}じ${answer.minute ? `${answer.minute}ふん` : ''}`;
        const choices = await page.locator('#clock-opts button').allTextContents();
        assert.equal(new Set(choices.map(value => value.replace(/\s/g, ''))).size, 4, '時計の選択肢は4つで重複しない');
        const correct = choices.findIndex(value => value.replace(/\s/g, '') === expected);
        assert.ok(correct >= 0, '時計の針と正解候補が一致する');
        await page.locator('#clock-opts button').nth((correct + 1) % 4).click();
        assert.match(await page.locator('#maron-msg').textContent(), /ちがうよ/);
        await screenshot(page, 'clock-read-wrong');
        await page.locator('#clock-opts button').nth(correct).click();
        await screenshot(page, 'clock-read-correct');
        await page.clock.runFor(1500);
        await page.locator('#mode-clock-set').click();
        assert.equal(await page.locator('#mode-clock-set').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('#mode-clock-read').getAttribute('aria-pressed'), 'false');
        await setClock(page, 12, 0);
        await page.locator('[data-action="dec-m"]').click();
        assert.deepEqual(await clockValue(page), { hour: 11, minute: 55 });
        await page.locator('[data-action="inc-m"]').click();
        assert.deepEqual(await clockValue(page), { hour: 12, minute: 0 });
        await setClock(page, 12, 55);
        await page.locator('[data-action="inc-m"]').click();
        assert.deepEqual(await clockValue(page), { hour: 1, minute: 0 });
        await page.locator('[data-action="dec-h"]').click();
        assert.deepEqual(await clockValue(page), { hour: 12, minute: 0 });
        const question = await page.locator('#clock-question').textContent();
        const match = question.match(/(\d+)じ\s*(?:(\d+)ふん)?/);
        const targetHour = Number(match[1]);
        const targetMinute = Number(match[2] || 0);
        await setClock(page, targetHour % 12 + 1, targetMinute);
        await page.locator('#clock-check-btn button').click();
        assert.match(await page.locator('#maron-msg').textContent(), /ズレてる/);
        await screenshot(page, 'clock-set-wrong');
        await setClock(page, targetHour, targetMinute);
        await page.locator('#clock-check-btn button').click();
        assert.equal(await page.locator('#hanamaru-overlay').evaluate(node => node.classList.contains('show')), true);
        await screenshot(page, 'clock-set-correct');
        await page.clock.runFor(1500);
        for (let round = 0; round < 8; round++) {
            await page.locator('#mode-clock-read').click();
            assert.equal(new Set(await page.locator('#clock-opts button').allTextContents()).size, 4);
        }
    });

    await runCase('clock-resize-numerals', async (page, record) => {
        record.resizes = [];
        await page.locator('#nav-clock').click();
        for (const viewport of [VIEWPORTS[1], VIEWPORTS[2], VIEWPORTS[3], VIEWPORTS[0], VIEWPORTS[1]]) {
            await resizeAndSettle(page, viewport);
            const layout = await page.evaluate(() => {
                const face = document.getElementById('clock-face');
                const rect = face.getBoundingClientRect();
                return { width: face.clientWidth, height: face.clientHeight,
                    numbers: [...face.querySelectorAll('.clock-num')].map(node => {
                        const box = node.getBoundingClientRect();
                        return { value: Number(node.textContent), dx: box.x + box.width / 2 - (rect.x + rect.width / 2), dy: box.y + box.height / 2 - (rect.y + rect.height / 2) };
                    }) };
            });
            assert.equal(layout.numbers.length, 12, 'リサイズで数字を重複生成しない');
            const radius = Math.min(layout.width, layout.height) / 2 - 26;
            record.resizes.push({ viewport, ...layout, radius });
            for (const number of layout.numbers) {
                const angle = number.value * Math.PI / 6;
                assert.ok(Math.abs(number.dx - Math.sin(angle) * radius) < 2 && Math.abs(number.dy + Math.cos(angle) * radius) < 2,
                    `${viewport.width}x${viewport.height}: ${number.value}の数字が現在の文字盤サイズに追従する (face=${layout.width}x${layout.height}, radius=${radius}, dx=${number.dx}, dy=${number.dy})`);
            }
            await screenshot(page, `clock-resized-${viewport.width}x${viewport.height}`);
        }
    }, { realTime: true });

    await runCase('clock-pointer-interruptions', async page => {
        const interrupts = ['mode', 'tab', 'modal', 'hidden', 'pagehide', 'resize', 'lostpointercapture', 'pointercancel', 'pointerup'];
        for (const reason of interrupts) {
            await page.locator('#nav-clock').click();
            await page.locator('#mode-clock-set').click();
            await resizeAndSettle(page, page.viewportSize());
            await page.locator('#clock-touch').scrollIntoViewIfNeeded();
            const box = await page.locator('#clock-touch').boundingBox();
            await page.mouse.move(box.x + box.width * 0.83, box.y + box.height / 2);
            await page.mouse.down();
            assert.notEqual(await page.evaluate(() => window.__manabiE2EApp.clockGame.activePointerId), null);
            if (reason === 'mode') await page.locator('#mode-clock-read').press('Enter');
            if (reason === 'tab') await page.locator('#nav-money').press('Enter');
            if (reason === 'modal') await page.locator('[data-action="parents-modal-open"]').press('Enter');
            if (reason === 'hidden') await setHidden(page, true);
            if (reason === 'pagehide') await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
            if (reason === 'resize') await resizeAndSettle(page, VIEWPORTS[0]);
            if (reason === 'lostpointercapture' || reason === 'pointercancel') {
                await page.evaluate(type => {
                    const pointerId = window.__manabiE2EApp.clockGame.activePointerId;
                    const target = type === 'lostpointercapture' ? document.getElementById('clock-touch') : window;
                    target.dispatchEvent(new PointerEvent(type, { pointerId, bubbles: true }));
                }, reason);
            }
            if (reason === 'pointerup') await page.mouse.up();
            const clean = await page.evaluate(() => ({ pointer: window.__manabiE2EApp.clockGame.activePointerId, rect: window.__manabiE2EApp.clockGame.clockTouchRect }));
            assert.deepEqual(clean, { pointer: null, rect: null }, `${reason}: ドラッグ状態とキャッシュを解放する`);
            const stopped = await clockValue(page);
            await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.83);
            assert.deepEqual(await clockValue(page), stopped, `${reason}: 古いpointermoveは針を動かさない`);
            await page.mouse.up();
            if (reason === 'modal') await page.keyboard.press('Escape');
            if (reason === 'hidden') await setHidden(page, false);
            if (reason === 'pagehide') await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
            if (reason === 'resize') await resizeAndSettle(page, VIEWPORTS[1]);
        }
    }, { realTime: true });

    await runCase('moji-levels-hint-wrong-next', async page => {
        await page.locator('#nav-moji').click();
        for (const [level, count] of [['easy', 9], ['normal', 16], ['hard', 25]]) {
            await page.locator(`#lvl-${level}`).click();
            await verifyMoji(page, count);
            for (const name of ['easy', 'normal', 'hard']) assert.equal(await page.locator(`#lvl-${name}`).getAttribute('aria-pressed'), String(name === level));
            const target = await page.locator('#target-char').textContent();
            const wrong = page.locator('.moji-cell').filter({ hasNotText: new RegExp(`^${target}$`) }).first();
            await wrong.click();
            assert.equal(await wrong.evaluate(node => node.style.backgroundColor), 'rgb(254, 202, 202)');
            await screenshot(page, `moji-${level}-wrong`);
            await page.clock.runFor(200);
            assert.equal(await wrong.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
            await page.locator('#btn-moji-hint').click();
            assert.equal(await (await correctMoji(page)).evaluate(node => node.classList.contains('moji-hint')), true);
            await screenshot(page, `moji-${level}-hint`);
            await wrong.click();
            await wrong.evaluate(node => { window.__manabiOldWrongCell = node; });
            await page.locator('#btn-moji-next').click();
            await verifyMoji(page, count);
            assert.equal(await page.locator('.moji-hint').count(), 0, '次問に古いヒントを持ち越さない');
            assert.equal(await page.locator('#timer').textContent(), '0.0');
            await page.clock.runFor(2200);
            assert.deepEqual(await page.evaluate(() => ({ connected: window.__manabiOldWrongCell.isConnected,
                color: window.__manabiOldWrongCell.style.backgroundColor })), { connected: false, color: 'rgb(254, 202, 202)' }, '次問で破棄したマスへの不正解タイマーを解除する');
            assert.equal(await page.locator('.moji-hint').count(), 0);
            await verifyMoji(page, count);
        }
        await page.locator('#btn-moji-hint').click();
        await page.clock.runFor(5000);
        assert.equal(await page.locator('.moji-hint').count(), 1, 'ヒントは既存仕様どおり次問まで表示する');
        await (await correctMoji(page)).focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.moji-cell:disabled').count(), 25);
        await screenshot(page, 'moji-correct');
        await page.clock.runFor(1500);
        assert.equal(await page.locator('.moji-cell:disabled').count(), 0);
    });

    await runCase('moji-paused-tab-modal-hidden', async page => {
        await page.locator('#nav-moji').click();
        await page.clock.runFor(800);
        assert.ok(Number(await page.locator('#timer').textContent()) >= 0.8);
        await page.locator('#nav-money').click();
        await assertTimerPaused(page, '別のゲーム中は計測しない');
        await page.locator('#nav-moji').click();
        const before = Number(await page.locator('#timer').textContent());
        await page.clock.runFor(300);
        assert.ok(Number(await page.locator('#timer').textContent()) >= before + 0.2);
        await page.locator('[data-action="parents-modal-open"]').click();
        await assertTimerPaused(page, '保護者説明を読む時間は計測しない');
        await setHidden(page, true);
        await setHidden(page, false);
        await assertTimerPaused(page, 'モーダル表示中の復帰でもタイマーを再開しない');
        await page.keyboard.press('Escape');
        await page.clock.runFor(300);
        assert.ok(Number(await page.locator('#timer').textContent()) > before);
        await setHidden(page, true);
        await assertTimerPaused(page, '非表示中は計測しない');
        await page.locator('[data-action="parents-modal-open"]').evaluate(node => node.click());
        await page.locator('[data-action="parents-modal-close"]').first().evaluate(node => node.click());
        await assertTimerPaused(page, '非表示中のモーダル終了で再開しない');
        await setHidden(page, false);
        const resumed = Number(await page.locator('#timer').textContent());
        await page.clock.runFor(500);
        assert.ok(Number(await page.locator('#timer').textContent()) >= resumed + 0.4);
    });

    await runCase('moji-three-stars-feedback-lock', async page => {
        await page.locator('#nav-moji').click();
        for (let round = 1; round <= 3; round++) {
            await (await correctMoji(page)).click();
            assert.equal(await page.locator('.moji-cell:disabled').count(), 9);
            assert.equal(await page.locator('#star-card .text-yellow-400').count(), round);
            await page.locator('#nav-money').click();
            await selectedTab(page, 'moji');
            await page.clock.runFor(1500);
            if (round < 3) assert.equal(await page.evaluate(() => window.__manabiE2EApp.isLocked), false);
        }
        assert.equal(await page.evaluate(() => window.__manabiE2EApp.isLocked), true, '3つ目は次問生成後も演出終了までロックする');
        await page.clock.runFor(300);
        assert.equal(await page.locator('.star-blink').count(), 3);
        assert.equal(await page.locator('.star-confetti').count(), 40);
        await screenshot(page, 'three-stars-celebration');
        const grid = await page.locator('#moji-container').innerHTML();
        await page.locator('#btn-moji-next').click();
        await page.locator('#lvl-hard').click();
        await (await correctMoji(page)).click();
        await page.locator('#nav-clock').click();
        assert.equal(await page.locator('#moji-container').innerHTML(), grid);
        await selectedTab(page, 'moji');
        await setHidden(page, true);
        await setHidden(page, false);
        await page.clock.runFor(2999);
        assert.equal(await page.evaluate(() => window.__manabiE2EApp.isLocked), true);
        assert.equal(await page.locator('#timer').textContent(), '0.0', 'ファンファーレ中は次問のタイムを加算しない');
        await page.clock.runFor(1);
        assert.equal(await page.evaluate(() => window.__manabiE2EApp.isLocked), false);
        assert.equal(await page.locator('.star-blink').count(), 0);
        assert.equal(await page.locator('#star-card .text-yellow-400').count(), 0);
        await page.clock.runFor(300);
        assert.equal(await page.locator('#timer').textContent(), '0.3');
        await page.locator('#nav-money').click();
        await selectedTab(page, 'money');
    });

    await runCase('parents-repeated-close-escape-backdrop', async page => {
        const open = page.locator('[data-action="parents-modal-open"]');
        const dialog = page.locator('#parents-modal');
        assert.equal(await dialog.evaluate(node => node.parentElement === document.body), true);
        for (const close of ['top', 'bottom', 'escape', 'backdrop', 'top', 'escape']) {
            await open.click();
            assert.equal(await dialog.evaluate(node => node.open), true);
            assert.equal(await dialog.isVisible(), true);
            assert.equal(await open.getAttribute('aria-expanded'), 'true');
            assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true, 'フォーカスはダイアログ内に入る');
            if (close === 'top') await page.locator('[data-action="parents-modal-close"]').first().click();
            if (close === 'bottom') await page.locator('[data-action="parents-modal-close"]').last().click();
            if (close === 'escape') await page.keyboard.press('Escape');
            if (close === 'backdrop') {
                const box = await dialog.boundingBox();
                assert.ok(box.x > 1 || box.y > 1, 'backdropのクリック領域がある');
                await page.mouse.click(box.x > 1 ? box.x / 2 : 1, box.y > 1 ? box.y / 2 : 1);
            }
            await page.waitForFunction(() => !document.getElementById('parents-modal').open);
            assert.equal(await open.getAttribute('aria-expanded'), 'false', `${close}: aria-expandedを戻す`);
            assert.equal(await open.evaluate(node => node === document.activeElement), true, `${close}: 起動ボタンへフォーカスを戻す`);
        }
    }, {}, VIEWPORTS[3]);

    await runCase('keyboard-tabs-roving-and-native-buttons', async page => {
        await selectedTab(page, 'money');
        await page.locator('#nav-money').focus();
        for (const [key, name] of [['ArrowRight', 'clock'], ['ArrowRight', 'moji'], ['ArrowRight', 'money'], ['ArrowLeft', 'moji'], ['Home', 'money'], ['End', 'moji']]) {
            await page.keyboard.press(key);
            await selectedTab(page, name);
            assert.equal(await page.locator(`#nav-${name}`).evaluate(node => node === document.activeElement), true);
        }
        await page.keyboard.press('Home');
        await page.locator('.coin-btn[data-value="10"]').focus();
        await page.keyboard.press('Space');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#current-money').textContent(), '20', 'nativeボタンをSpace/Enterで1回ずつ操作する');
    });
}

async function storageAndAudioSuite() {
    for (const [name, profile] of [['malformed', '{not-json'], ['null', 'null'], ['array', '[]'], ['invalid-volume', '{"volumeDb":"loud","isMuted":false}']]) {
        await runCase(`storage-${name}`, async page => {
            await page.locator('.coin-btn[data-value="10"]').click();
            assert.equal(await page.locator('#current-money').textContent(), '10');
            await page.locator('#sound-btn').click();
            assert.equal(await page.locator('#sound-btn').getAttribute('aria-pressed'), 'true');
            await page.locator('#nav-moji').click();
            await verifyMoji(page, 9);
            assert.equal(await page.evaluate(() => Number.isFinite(Tone.Destination.volume.value)), true);
        }, { profile });
    }
    await runCase('storage-blocked', async page => {
        await page.locator('#sound-btn').click();
        await page.locator('.coin-btn[data-value="100"]').click();
        assert.equal(await page.locator('#current-money').textContent(), '100');
        await page.locator('#nav-moji').click();
        await (await correctMoji(page)).click();
        await page.clock.runFor(1500);
        await verifyMoji(page, 9);
    }, { blockStorage: true });

    await runCase('mute-persists-preserves-profile', async page => {
        await page.locator('#sound-btn').click();
        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE);
        assert.equal(stored.isMuted, true);
        assert.equal(stored.darkMode, false);
        assert.equal(stored.volumeDb, -17);
        assert.equal(stored.unrelated, 'keep');
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => window.__manabiE2EApp);
        assert.equal(await page.locator('#sound-btn').getAttribute('aria-pressed'), 'true');
        await page.locator('#sound-btn').click();
        assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).isMuted, PROFILE), false);
    }, { profile: '{"isMuted":false,"volumeDb":-17,"darkMode":false,"unrelated":"keep"}' });

    await runCase('audio-concurrent-init', async page => {
        await page.evaluate(() => {
            for (const value of [100, 10, 1]) document.querySelector(`.coin-btn[data-value="${value}"]`).click();
        });
        assert.equal(await page.locator('#current-money').textContent(), '111', '音声ロード待ちでもゲーム入力は即座に反映する');
        assert.deepEqual(await page.evaluate(() => ({ loads: window.__manabiAudioMock.loads, created: window.__manabiAudioMock.created })), { loads: 1, created: 0 });
        await page.evaluate(() => window.__manabiAudioMock.release());
        await page.waitForFunction(() => window.__manabiE2EApp.audio.isAudioInit);
        assert.deepEqual(await page.evaluate(() => ({ loads: window.__manabiAudioMock.loads, starts: window.__manabiAudioMock.starts, created: window.__manabiAudioMock.created })), { loads: 1, starts: 1, created: 4 }, '同時要求を1つの初期化にまとめ、シンセを重複生成しない');
        await page.locator('.coin-btn[data-value="5"]').click();
        assert.equal(await page.evaluate(() => window.__manabiAudioMock.created), 4);
    }, { audio: { holdLoad: true } });

    for (const interrupt of ['mute', 'modal', 'hidden', 'tab']) {
        await runCase(`audio-delayed-cancel-${interrupt}`, async page => {
            await page.locator('.coin-btn[data-value="10"]').click();
            assert.equal(await page.evaluate(() => window.__manabiAudioMock.loads), 1);
            if (interrupt === 'mute') await page.locator('#sound-btn').click();
            if (interrupt === 'modal') await page.locator('[data-action="parents-modal-open"]').click();
            if (interrupt === 'hidden') await setHidden(page, true);
            if (interrupt === 'tab') await page.locator('#nav-moji').click();
            await page.evaluate(() => window.__manabiAudioMock.release());
            await page.waitForFunction(() => window.__manabiE2EApp.audio.isAudioInit);
            assert.equal(await page.evaluate(() => window.__manabiAudioMock.sounds.some(args => args[0] === 'B5')), false,
                `${interrupt}: 中断前のコイン音をロード後に再生しない`);
            if (interrupt !== 'tab') assert.equal(await page.evaluate(() => window.__manabiAudioMock.sounds.length), 0);
        }, { audio: { holdLoad: true } });
    }

    for (const failure of ['load', 'start']) {
        await runCase(`audio-retry-${failure}`, async page => {
            await page.locator('.coin-btn[data-value="10"]').click();
            await page.evaluate(() => new Promise(resolve => queueMicrotask(resolve)));
            assert.equal(await page.locator('#current-money').textContent(), '10');
            assert.equal(await page.evaluate(() => window.__manabiE2EApp.audio.isAudioInit), false);
            await page.locator('.coin-btn[data-value="1"]').click();
            await page.waitForFunction(() => window.__manabiE2EApp.audio.isAudioInit);
            assert.equal(await page.locator('#current-money').textContent(), '11');
            assert.equal(await page.evaluate(() => window.__manabiAudioMock.created), 4);
            assert.equal(await page.evaluate(() => window.__manabiAudioMock.loads), 2);
        }, { audio: failure === 'load' ? { failLoads: 1 } : { failStarts: 1 } });
    }

    await runCase('real-local-tone-smoke', async (page, record) => {
        const localRequests = [];
        page.on('response', response => { if (/tone-(?:14\.8\.49)\.js/.test(response.url())) localRequests.push({ url: response.url(), status: response.status() }); });
        await page.locator('.coin-btn[data-value="10"]').click();
        await page.waitForFunction(() => window.__manabiE2EApp.audio.isAudioInit);
        assert.equal(await page.evaluate(() => Tone.context.state), 'running');
        assert.equal(localRequests.length, 1, '同梱Toneを1回ロードする');
        assert.equal(localRequests[0].status, 200);
        assert.equal(new URL(localRequests[0].url).origin, new URL(candidateUrl).origin, '外部CDNではなく配信物のToneを利用する');
        await page.evaluate(() => {
            window.__manabiWaveform = new Tone.Waveform(1024);
            Tone.Destination.connect(window.__manabiWaveform);
        });
        const peak = await page.evaluate(async () => {
            document.querySelector('.coin-btn[data-value="1"]').click();
            let peak = 0;
            const until = performance.now() + 600;
            while (performance.now() < until) {
                for (const value of window.__manabiWaveform.getValue()) peak = Math.max(peak, Math.abs(value));
                await new Promise(resolve => setTimeout(resolve, 5));
            }
            return peak;
        });
        assert.ok(Number.isFinite(peak) && peak > 0.00001, `実音声の波形を確認する: ${peak}`);
        await page.locator('#sound-btn').click();
        assert.equal(await page.evaluate(() => Tone.Destination.mute), true);
        await page.locator('#sound-btn').click();
        assert.equal(await page.evaluate(() => Tone.Destination.mute), false);
        await setHidden(page, true);
        await page.waitForFunction(() => Tone.context.state === 'suspended');
        await setHidden(page, false);
        await page.locator('.coin-btn[data-value="5"]').click();
        await page.waitForFunction(() => Tone.context.state === 'running');
        await page.locator('#nav-clock').click();
        await page.locator('#mode-clock-set').click();
        await page.locator('[data-action="inc-m"]').click();
        await page.locator('#nav-moji').click();
        await page.locator('#btn-moji-hint').click();
        await (await correctMoji(page)).click();
        await page.waitForFunction(() => !window.__manabiE2EApp.isLocked);
        record.audio = { peak, localRequests, resumed: true };
        await screenshot(page, 'real-local-tone-runtime');
        await page.evaluate(() => window.__manabiWaveform.dispose());
    }, { realAudio: true }, VIEWPORTS[3]);
}

try {
    await mkdir(artifactDir, { recursive: true });
    await writeAssetManifest();
    candidateUrl = await serveDist(dist);
    if (process.env.MANABI_BASELINE_ROOT) baselineUrl = await serveBaseline(process.env.MANABI_BASELINE_ROOT);
    else console.log('[INFO] MANABI_BASELINE_ROOT未指定: 基準版比較は省略し、候補版の全検証と4画面幅の画像を保存します。');
    browser = await chromium.launch({ headless: true });
    await layoutSuite();
    await reachabilitySuite();
    await interactionSuite();
    await storageAndAudioSuite();
    if (failures.length) throw new AggregateError(failures, `Manabi Land E2E: ${failures.length}/${results.length}件失敗。${artifactDir}/results.jsonを参照`);
    console.log(`[OK] Manabi Land実ビルドE2E: ${results.length}件成功。画像と計測値: ${artifactDir}`);
} finally {
    await browser?.close();
    for (const server of servers.reverse()) await server.close();
}

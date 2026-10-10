import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

// 基準・候補とも npm run build の出力を渡す。Viteやpublicの代替配信は使わない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const artifactDir = path.join(root, 'visual-guard-artifacts', 'speed-reader');
const HISTORY = 'pikalab_speed_reader_history';
const COMPREHENSION = 'pikalab_speed_reader_comprehension_v1';
const RESULT = '#speed-reader-comprehension-modal';
const VIEWPORTS = [
    { width: 320, height: 740 }, { width: 390, height: 844 },
    { width: 667, height: 375 }, { width: 1280, height: 900 }
];
const WORDS = Array.from({ length: 40 }, (_, index) => `word${String(index).padStart(2, '0')}`);
const servers = [];
const results = [];
const failures = [];
let browser;
let candidateUrl;
let baselineUrl;

async function serveDist(input) {
    const directory = path.resolve(input);
    await access(path.join(directory, 'speed_reader/index.html'));
    // 生ソースを基準版として受け付けると、ビルド時注入スクリプトを比較できない。
    assert.ok((await stat(path.join(directory, 'assets'))).isDirectory(), `${directory} は実ビルドの出力であること`);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
        '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
    const server = createServer(async (request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            let file = path.resolve(directory, `.${pathname}`);
            if (file !== directory && !file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
            if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
            const content = await readFile(file);
            response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            response.end(content);
        } catch (error) {
            response.writeHead(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500).end();
        }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}/speed_reader/`;
}

// HTMLから到達する実ファイルをハッシュ化し、後段で配信版との照合にも使えるようにする。
async function writeAssetManifest(directory, name) {
    const origin = 'http://speed-reader-build.invalid';
    const pending = [new URL('/speed_reader/index.html', origin)];
    const files = new Map();
    while (pending.length) {
        const url = pending.shift();
        if (url.origin !== origin) continue;
        const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        if (files.has(relative)) continue;
        const file = path.resolve(directory, relative);
        assert.ok(file.startsWith(directory + path.sep), '配信ルート外を読まない');
        const content = await readFile(file);
        files.set(relative, { path: relative, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') });
        const source = content.toString('utf8');
        const references = [];
        if (file.endsWith('.html')) {
            for (const match of source.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) references.push(match[1].replaceAll('&amp;', '&'));
        } else if (file.endsWith('.css')) {
            for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) references.push(match[1]);
            for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gi)) references.push(match[1]);
        } else if (/\.m?js$/.test(file)) {
            for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?["']([^"']+)["']/g)) references.push(match[1]);
            for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) references.push(match[1]);
        }
        for (const reference of references) {
            if (/^(?:data:|#)/.test(reference)) continue;
            const next = new URL(reference, url);
            if (next.origin === origin) pending.push(next);
        }
    }
    await writeFile(path.join(artifactDir, `${name}-asset-manifest.json`), `${JSON.stringify({
        entry: 'speed_reader/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path))
    }, null, 2)}\n`);
}

function installEnvironment(options) {
    let seed = 0x51eed;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
    if (!sessionStorage.getItem('speed-reader-e2e-seeded')) {
        for (const [key, value] of Object.entries(options.storage || {})) localStorage.setItem(key, value);
        sessionStorage.setItem('speed-reader-e2e-seeded', '1');
    }
    if (options.denyStorage) {
        for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Test storage is denied', 'SecurityError'); };
    } else if (options.quotaExceeded) {
        Storage.prototype.setItem = () => { throw new DOMException('Test storage quota is full', 'QuotaExceededError'); };
    }
}

// FileReader境界だけで遅延と失敗を再現する。アプリのインスタンス・メソッドは露出も差し替えもしない。
function installFileReaderBoundary() {
    const NativeReader = window.FileReader;
    const boundary = window.__speedReaderFileBoundary = { reads: [], queued: [], deliveries: 0 };
    class BoundaryReader extends NativeReader {
        constructor() {
            super();
            this._onload = null;
            this._fileName = '';
            super.addEventListener('load', event => {
                const callback = this._onload;
                const result = this.result;
                if (!callback) return;
                boundary.queued.push(this._fileName);
                const deliver = () => {
                    boundary.deliveries++;
                    // 既にキューに載った完了通知はabort後でも届く、という最悪順序を固定する。
                    callback.call(this, { type: event.type, target: { result } });
                };
                if (this._fileName.startsWith('slow-')) setTimeout(deliver, 5000);
                else deliver();
            });
        }
        get onload() { return this._onload; }
        set onload(callback) { this._onload = callback; }
        readAsText(file, encoding) {
            this._fileName = file.name;
            boundary.reads.push(file.name);
            if (file.name.startsWith('broken-')) {
                setTimeout(() => this.dispatchEvent(new ProgressEvent('error')), 50);
                return;
            }
            super.readAsText(file, encoding);
        }
    }
    window.FileReader = BoundaryReader;
}

async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const context = await browser.newContext({ viewport, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce',
        locale: 'ja-JP', timezoneId: 'UTC', serviceWorkers: 'block' });
    await context.addInitScript(installEnvironment, options);
    if (options.fileBoundary) await context.addInitScript(installFileReaderBoundary);
    // 外部フォントの可否を比較に混ぜない。製品のローカル資産は必ず実配信から取得する。
    await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    await context.route('https://fonts.gstatic.com/**', route => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    const requestFailures = [];
    const alerts = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('response', response => {
        if (response.url().startsWith('http://127.0.0.1:') && response.status() >= 400) requestFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    page.on('requestfailed', request => {
        if (request.url().startsWith('http://127.0.0.1:')) requestFailures.push(`${request.failure()?.errorText} ${new URL(request.url()).pathname}`);
    });
    page.on('dialog', async dialog => { alerts.push(dialog.message()); await dialog.dismiss(); });
    await page.clock.install({ time: new Date('2026-01-08T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-08T12:00:01Z'));
    return { context, page, errors, requestFailures, alerts, options };
}

async function waitFor(check, message, timeout = 5000) {
    const deadline = Date.now() + timeout;
    do {
        if (await check()) return;
        await delay(20);
    } while (Date.now() < deadline);
    assert.fail(message);
}

async function ready(current, url = candidateUrl) {
    const response = await current.page.goto(url, { waitUntil: 'load' });
    assert.equal(response.status(), 200, '実ビルドの入口が正常に配信される');
    await waitFor(() => current.page.locator('#lib-cat-junior .lib-card').count().then(count => count > 0), 'ライブラリが起動する');
    await current.page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }' });
    await current.page.evaluate(() => document.fonts.ready);
    await current.page.clock.runFor(120);
    assert.equal(await current.page.locator('#tab-library').getAttribute('aria-selected'), 'true');
}

async function screenshot(page, name) {
    await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled', timeout: 10_000 });
}

async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const record = { name, viewport, status: 'passed' };
    const started = Date.now();
    let current;
    try {
        current = await createCase(viewport, options);
        await ready(current);
        await work(current.page, record, current);
        assert.deepEqual(current.errors, [], '未処理のブラウザ例外がない');
        assert.deepEqual(current.requestFailures, [], 'ローカル配信資産の失敗がない');
        if (!options.allowAlerts) assert.deepEqual(current.alerts, [], '予期しない警告がない');
        console.log(`[OK] Speed Reader: ${name}`);
    } catch (error) {
        record.status = 'failed';
        record.error = error.stack || String(error);
        failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Speed Reader: ${name}: ${error.message}`);
        if (current?.page) {
            try { await screenshot(current.page, `${name}-failure`); } catch (captureError) { record.screenshotError = captureError.message; }
        }
    } finally {
        record.durationMs = Date.now() - started;
        record.pageErrors = current?.errors || [];
        record.requestFailures = current?.requestFailures || [];
        record.alerts = current?.alerts || [];
        await current?.context.close();
        results.push(record);
        await writeFile(path.join(artifactDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
    }
}

const readerText = page => page.locator('#reader-display').textContent();
const progress = page => page.locator('[role="progressbar"]').getAttribute('aria-valuenow').then(Number);
const isPlaying = page => page.locator('#main-play-btn .material-symbols-rounded').textContent().then(text => text === 'pause');
async function assertNoResult(page) { assert.equal(await page.locator(`${RESULT}[open]`).count(), 0, '古い完了通知を開かない'); }
async function custom(page, text = WORDS.join(' ')) {
    await page.locator('#tab-input').click();
    await page.locator('#custom-text').fill(text);
    await page.locator('[data-action="prepare-custom"]').click();
    assert.equal(await page.locator('#source-badge').textContent(), '自由入力');
}
async function setSpeed(page, speed = 1000) {
    await page.locator('#tab-settings').click();
    await page.locator('#wpm-slider').focus();
    if (speed === 1000) await page.keyboard.press('End');
    else {
        await page.keyboard.press('Home');
        for (let value = 50; value < speed; value += 10) await page.keyboard.press('ArrowRight');
    }
    assert.equal(await page.locator('#wpm-slider').inputValue(), String(speed));
    assert.equal(await page.locator('#wpm-display').textContent(), String(speed));
    assert.equal((await page.locator('#wpm-badge').textContent()).trim(), `WPM: ${speed}`);
}
async function loadMomotaro(page) {
    await page.locator('#tab-library').click();
    await page.locator('#cat-btn-low-elem').click();
    await page.locator('[data-action="load-library"][data-param="momotaro"]').click();
    assert.equal(await page.locator('#source-badge').textContent(), 'ももたろう');
}
async function complete(page, duration = 30_000) {
    await page.locator('#main-play-btn').click();
    await page.clock.runFor(duration);
    assert.equal(await page.locator(`${RESULT}[open]`).count(), 1, '読了時に結果を一つだけ開く');
    assert.equal(await isPlaying(page), false);
}
async function history(page, key = HISTORY) {
    return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key);
}
async function stationary(page, milliseconds = 5000) {
    const before = { text: await readerText(page), progress: await progress(page) };
    await page.clock.runFor(milliseconds);
    assert.deepEqual({ text: await readerText(page), progress: await progress(page) }, before, '中断後に古いタイマーが進まない');
    assert.equal(await isPlaying(page), false);
    await assertNoResult(page);
}
async function bodyKeyboard(page, key) {
    await page.locator('h1').click();
    await page.keyboard.press(key);
}

async function layoutSnapshot(page) {
    await page.evaluate(() => { window.scrollTo(0, 0); for (const el of document.querySelectorAll('[role="tablist"]')) el.scrollLeft = 0; });
    await page.mouse.move(1, 1);
    await page.clock.runFor(60);
    return page.evaluate(() => {
        const round = value => Math.round(value * 100) / 100;
        const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
        const key = element => {
            if (element.id) return `#${element.id}`;
            if (element === document.body) return 'body';
            const peers = [...element.parentElement.children].filter(peer => peer.tagName === element.tagName);
            return `${key(element.parentElement)}>${element.tagName.toLowerCase()}:nth-of-type(${peers.indexOf(element) + 1})`;
        };
        const properties = ['display', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
            'color', 'backgroundColor', 'borderTopColor', 'borderTopWidth', 'borderRadius', 'paddingTop', 'paddingRight',
            'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap',
            'gridTemplateColumns', 'flexDirection', 'alignItems', 'justifyContent', 'textAlign', 'boxShadow', 'overflowX', 'overflowY'];
        const nodes = [...document.querySelectorAll('body, body *')].flatMap(element => {
            if (['SCRIPT', 'STYLE', 'LINK', 'META'].includes(element.tagName)) return [];
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none') return [];
            return [{ key: key(element), text: normalize([...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ')),
                box: { x: round(rect.x + scrollX), y: round(rect.y + scrollY), width: round(rect.width), height: round(rect.height) },
                style: Object.fromEntries(properties.map(property => [property, style[property]])),
                semantics: { role: element.getAttribute('role'), label: element.getAttribute('aria-label'),
                    selected: element.getAttribute('aria-selected'), checked: element.getAttribute('aria-checked'), hidden: element.hidden || false },
                value: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.value : null }];
        });
        return { viewport: { width: innerWidth, height: innerHeight }, width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight, text: normalize(document.body.innerText), nodes };
    });
}

function compareLayout(actual, expected, name) {
    assert.equal(actual.text, expected.text, `${name}: 表示文言を維持する`);
    assert.equal(actual.width, expected.width, `${name}: ページ幅を維持する`);
    assert.ok(Math.abs(actual.height - expected.height) <= 1, `${name}: ページ高を維持する`);
    assert.deepEqual(actual.nodes.map(node => node.key), expected.nodes.map(node => node.key), `${name}: 表示要素を維持する`);
    for (let index = 0; index < actual.nodes.length; index++) {
        const received = actual.nodes[index];
        const previous = expected.nodes[index];
        assert.deepEqual(received.style, previous.style, `${name}: ${received.key} の計算済みスタイル`);
        assert.deepEqual(received.semantics, previous.semantics, `${name}: ${received.key} の操作上の意味`);
        assert.equal(received.text, previous.text, `${name}: ${received.key} の文言`);
        assert.equal(received.value, previous.value, `${name}: ${received.key} の入力値`);
        for (const property of ['x', 'y', 'width', 'height']) {
            assert.ok(Math.abs(received.box[property] - previous.box[property]) <= 1,
                `${name}: ${received.key} ${property}: ${previous.box[property]} → ${received.box[property]}`);
        }
    }
}

async function layoutSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`layout-${viewport.width}x${viewport.height}`, async (page, record) => {
            const baseline = baselineUrl ? await createCase(viewport) : null;
            try {
                if (baseline) await ready(baseline, baselineUrl);
                record.baselineComparison = baseline ? 'compared' : 'skipped: SPEED_READER_BASELINE_ROOT is unset';
                record.states = [];
                for (const state of ['library', 'input', 'settings', 'parents']) {
                    for (const target of [page, baseline?.page].filter(Boolean)) {
                        if (state === 'parents') {
                            await target.locator('#tab-library').click();
                            await target.locator('#parents-modal-open-btn').click();
                        } else await target.locator(`#tab-${state}`).click();
                        await target.clock.runFor(100);
                    }
                    const label = `${viewport.width}x${viewport.height}-${state}`;
                    const actual = await layoutSnapshot(page);
                    const expected = baseline ? await layoutSnapshot(baseline.page) : null;
                    await writeFile(path.join(artifactDir, `${label}-geometry.json`), `${JSON.stringify({ candidate: actual, baseline: expected }, null, 2)}\n`);
                    await screenshot(page, `${label}-candidate`);
                    if (baseline) {
                        await screenshot(baseline.page, `${label}-baseline`);
                        compareLayout(actual, expected, label);
                    }
                    record.states.push({ state, measuredElements: actual.nodes.length, comparedElements: baseline ? actual.nodes.length : 0 });
                }
                if (baseline) {
                    assert.deepEqual(baseline.errors, [], '基準版の起動エラーがない');
                    assert.deepEqual(baseline.requestFailures, [], '基準版の配信欠落がない');
                }
            } finally { await baseline?.context.close(); }
        }, {}, viewport);
    }
}

// forceやDOMのclick()を使わず、ユーザーがスクロール可能な経路から実際に押せることを測る。
async function clickReachable(page, target, label, record) {
    const control = typeof target === 'string' ? page.locator(target) : target;
    const before = await control.evaluate(node => {
        const ancestors = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) ancestors.push({ top: parent.scrollTop, left: parent.scrollLeft });
        return ancestors;
    });
    await control.scrollIntoViewIfNeeded();
    const viewportBox = await control.evaluate(node => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height, viewportHeight: innerHeight };
    });
    let viewportCorrection = null;
    if (viewportBox.height > 0 && viewportBox.height <= viewportBox.viewportHeight &&
        (viewportBox.top < 0 || viewportBox.bottom > viewportBox.viewportHeight)) {
        // ネイティブのスクロールが端で止まった場合だけ、本文脇から実ホイールで画面中央へ寄せる。
        // 要素内部やoverflow:hiddenの祖先を直接スクロールせず、最終の包含判定も緩めない。
        const deltaY = (viewportBox.top + viewportBox.bottom - viewportBox.viewportHeight) / 2;
        await page.mouse.move(1, viewportBox.viewportHeight / 2);
        await page.mouse.wheel(0, deltaY);
        let previous = null;
        let stableSamples = 0;
        await waitFor(async () => {
            const box = await control.evaluate(node => {
                const rect = node.getBoundingClientRect();
                return { top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight };
            });
            const contained = box.top >= 0 && box.bottom <= box.viewportHeight;
            const stable = previous && Math.abs(box.top - previous.top) <= 0.25 && Math.abs(box.bottom - previous.bottom) <= 0.25;
            stableSamples = contained && stable ? stableSamples + 1 : 0;
            previous = box;
            return stableSamples >= 3;
        }, `${label}: 実ホイール後に操作対象全体が画面内で安定する`, 3000);
        viewportCorrection = { input: 'mouse.wheel at document side margin', deltaY, before: viewportBox, after: previous };
    }
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
                documentScroller: parent === document.scrollingElement, overflowX: style.overflowX, overflowY: style.overflowY });
        }
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const box = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        const transform = getComputedStyle(node).transform;
        // 既存デザインの選択中メインタブだけは2px上へ浮く。装飾枠と可読なラベルを分けて検証する。
        const decoratedMainTab = node.matches('.tab-btn.tab-active') && transform === 'matrix(1, 0, 0, 1, 0, -2)';
        const labelBoxes = [];
        if (decoratedMainTab) {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
                const text = walker.currentNode;
                // アイコンフォントの代替文字列はラベルではない。利用者向けの日本語テキストは全て測る。
                if (!text.textContent.trim() || text.parentElement.closest('.material-symbols-rounded, [aria-hidden="true"]')) continue;
                const range = document.createRange();
                range.selectNodeContents(text);
                for (const bounds of range.getClientRects()) labelBoxes.push({ left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom });
            }
        }
        return { box, logicalBox: decoratedMainTab ? { ...box, top: box.top + 2, bottom: box.bottom + 2 } : box,
            decorativeClip: decoratedMainTab ? { note: '既存の選択中メインタブのtranslateY(-2px)による装飾枠のみ',
                transform, topClippedPx: Math.max(0, clip.top - box.top) } : null,
            labelBoxes, clip, centerHitsControl: hit === node || node.contains(hit), ancestors };
    });
    record.actions.push({ label, before, viewportCorrection, ...measured });
    const { logicalBox: box, clip } = measured;
    assert.ok(box.width > 0 && box.height > 0 && box.left >= clip.left - 1.5 && box.right <= clip.right + 1.5 &&
        box.top >= clip.top - 1.5 && box.bottom <= clip.bottom + 1.5, `${label}: 操作対象全体を表示できる ${JSON.stringify(measured)}`);
    if (measured.decorativeClip) {
        assert.ok(measured.decorativeClip.topClippedPx <= 2.01, `${label}: 許容する装飾枠の切れは既存の2pxだけ`);
        assert.ok(measured.labelBoxes.length > 0, `${label}: 選択中メインタブの表示ラベルを測定できる`);
        for (const text of measured.labelBoxes) assert.ok(text.left >= clip.left - 1.5 && text.right <= clip.right + 1.5 &&
            text.top >= clip.top - 1.5 && text.bottom <= clip.bottom + 1.5, `${label}: 実位置のラベル文字は切れていない ${JSON.stringify(text)}`);
    }
    assert.equal(measured.centerHitsControl, true, `${label}: 中心のヒット領域が他の要素に遮られていない`);
    measured.ancestors.forEach((parent, index) => {
        if (parent.documentScroller) return;
        if (Math.abs(parent.top - before[index].top) > 1) assert.match(parent.overflowY, /^(auto|scroll)$/, `${label}: ユーザーが縦スクロールできる領域内で移動する (${parent.id})`);
        if (Math.abs(parent.left - before[index].left) > 1) assert.match(parent.overflowX, /^(auto|scroll)$/, `${label}: ユーザーが横スクロールできる領域内で移動する (${parent.id})`);
    });
    await control.click();
}

async function reachabilitySuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`control-reachability-${viewport.width}x${viewport.height}`, async (page, record) => {
            record.actions = [];
            const click = (target, label = target) => clickReachable(page, target, label, record);
            await click('#tab-library', 'tab-library');
            for (const category of ['low-elem', 'high-elem', 'junior', 'high']) {
                await click(`#cat-btn-${category}`, `category-${category}`);
                const cards = page.locator(`#lib-cat-${category} .lib-card`);
                for (let index = 0; index < await cards.count(); index++) {
                    const card = cards.nth(index);
                    const title = await card.locator('h3').textContent();
                    const key = await card.getAttribute('data-param');
                    await click(card, `library-${key}`);
                    assert.equal(await page.locator('#source-badge').textContent(), title);
                }
            }
            await click('#tab-input', 'tab-input');
            const [chooser] = await Promise.all([
                page.waitForEvent('filechooser'),
                click('#file-select-btn', 'file-picker')
            ]);
            await chooser.setFiles({ name: 'reachable.txt', mimeType: 'text/plain', buffer: Buffer.from('imported content') });
            await waitFor(async () => await readerText(page) === 'imported', '表示したファイル選択ボタンから読み込める');
            await click('#custom-text', 'custom-text');
            await page.locator('#custom-text').fill('clear this input');
            await click('[data-action="clear-custom"]', 'clear-custom');
            assert.equal(await page.locator('#custom-text').inputValue(), '');
            await click('#custom-text', 'custom-text-refill');
            await page.locator('#custom-text').fill(WORDS.join(' '));
            await click('[data-action="prepare-custom"]', 'prepare-custom');
            assert.equal(await readerText(page), WORDS[0]);
            await click('[data-action="step-forward"]', 'step-forward');
            assert.equal(await readerText(page), WORDS[10]);
            await click('[data-action="step-back"]', 'step-back');
            assert.equal(await readerText(page), WORDS[0]);
            await click('#main-play-btn', 'play-start');
            await page.clock.runFor(300);
            await click('#main-play-btn', 'play-pause');
            await click('[data-action="reset"]', 'reset');
            assert.equal(await readerText(page), WORDS[0]);
            await click('#tab-settings', 'tab-settings');
            await click('#wpm-slider', 'wpm-slider');
            await page.keyboard.press('End');
            assert.equal(await page.locator('#wpm-display').textContent(), '1000');
            for (const size of [1, 2, 3, 1]) {
                await click(`[data-action="set-chunk"][data-param="${size}"]`, `chunk-${size}`);
                assert.equal(await page.locator('#chunk-badge').textContent(), `${size}単語`);
            }
            for (const size of ['normal', 'large', 'xlarge', 'normal']) {
                await click(`[data-action="set-fontsize"][data-param="${size}"]`, `font-${size}`);
                assert.equal(await page.locator(`[data-action="set-fontsize"][data-param="${size}"]`).getAttribute('aria-checked'), 'true');
            }
            await screenshot(page, `reachable-settings-${viewport.width}x${viewport.height}`);
            for (const close of ['top', 'bottom', 'escape']) {
                await click('#parents-modal-open-btn', `parents-open-${close}`);
                await page.clock.runFor(60);
                if (close === 'escape') await page.keyboard.press('Escape');
                else await click(page.locator('#parents-modal [data-action="close-modal"]').nth(close === 'top' ? 0 : 1), `parents-close-${close}`);
                await page.clock.runFor(20);
                assert.equal(await page.locator('#parents-modal').getAttribute('open'), null);
                assert.equal(await page.locator('#parents-modal-open-btn').getAttribute('aria-expanded'), 'false');
            }
            await click('#tab-input', 'tab-input-short');
            await click('#custom-text', 'custom-text-short');
            await page.locator('#custom-text').fill('alpha beta gamma');
            await click('[data-action="prepare-custom"]', 'prepare-custom-short');
            await click('#main-play-btn', 'play-custom-short');
            await page.clock.runFor(2000);
            assert.equal(await page.locator(`${RESULT}[open]`).count(), 1);
            await click(page.locator(RESULT).getByRole('button', { name: '結果を閉じる', exact: true }), 'self-check-close');
            await page.clock.runFor(20);
            await click('#tab-library', 'tab-library-quiz');
            await click('#cat-btn-low-elem', 'category-quiz');
            await click('[data-action="load-library"][data-param="momotaro"]', 'library-quiz');
            await click('#tab-settings', 'tab-settings-quiz');
            await click('#wpm-slider', 'wpm-slider-quiz');
            await page.keyboard.press('End');
            await click('#main-play-btn', 'play-library-quiz');
            await page.clock.runFor(30_000);
            for (const [index, answer] of ['川', '大きなもも', '家に持ち帰る'].entries()) {
                await click(page.locator(RESULT).getByRole('button', { name: answer, exact: true }), `quiz-answer-${index + 1}`);
                await click(page.locator(RESULT).getByRole('button', { name: index === 2 ? '結果を見る' : '次の問題 →', exact: true }), `quiz-next-${index + 1}`);
            }
            await screenshot(page, `reachable-quiz-result-${viewport.width}x${viewport.height}`);
            if (viewport.width === 667 && viewport.height === 375) {
                const dialog = page.locator(RESULT);
                const measureResult = () => dialog.evaluate(node => {
                    const rect = element => {
                        const bounds = element.getBoundingClientRect();
                        return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom };
                    };
                    return { box: rect(node), scrollTop: node.scrollTop, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight,
                        overflowY: getComputedStyle(node).overflowY, title: rect(node.querySelector('h2')), close: rect(node.querySelector('button:last-child')) };
                });
                const initial = await measureResult();
                record.resultScroll = { initial, overflowing: initial.scrollHeight > initial.clientHeight + 1 };
                const fullyVisible = (box, bounds) => box.left >= bounds.left - 1.5 && box.right <= bounds.right + 1.5 &&
                    box.top >= bounds.top - 1.5 && box.bottom <= bounds.bottom + 1.5;
                if (record.resultScroll.overflowing) {
                    assert.match(initial.overflowY, /^(auto|scroll)$/, '横長画面の長い結果をユーザーが縦スクロールできる');
                    await page.mouse.move((initial.box.left + initial.box.right) / 2, (initial.box.top + initial.box.bottom) / 2);
                    await page.mouse.wheel(0, -Math.max(500, initial.scrollHeight * 2));
                    await waitFor(() => dialog.evaluate(node => node.scrollTop <= 1), '実ホイールで結果の先頭へ戻れる');
                }
                record.resultScroll.top = await measureResult();
                assert.ok(fullyVisible(record.resultScroll.top.title, record.resultScroll.top.box), '結果のタイトルを全体表示できる');
                await screenshot(page, 'reachable-result-667x375-wheel-top');
                if (record.resultScroll.overflowing) {
                    await page.mouse.wheel(0, Math.max(500, initial.scrollHeight * 2));
                    await waitFor(() => dialog.evaluate(node => node.scrollTop + node.clientHeight >= node.scrollHeight - 1), '実ホイールで結果の末尾へ進める');
                }
                record.resultScroll.bottom = await measureResult();
                assert.ok(fullyVisible(record.resultScroll.bottom.close, record.resultScroll.bottom.box), '結果を閉じるボタンを全体表示できる');
                await screenshot(page, 'reachable-result-667x375-wheel-bottom');
            }
            await click(page.locator(RESULT).getByRole('button', { name: '結果を閉じる', exact: true }), 'quiz-result-close');
            await page.clock.runFor(20);
            await assertNoResult(page);
            record.uniqueActionCount = new Set(record.actions.map(action => action.label)).size;
            assert.ok(record.uniqueActionCount >= 32, '各画面幅で32以上の異なる操作対象を実クリックする');
        }, {}, viewport);
    }
}

async function navigationSuite() {
    await runCase('tabs-categories-and-radio-keyboard', async page => {
        await custom(page);
        const first = await readerText(page);
        await page.locator('#tab-input').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#tab-settings').getAttribute('aria-selected'), 'true');
        assert.equal(await page.locator('#tab-settings').evaluate(element => element === document.activeElement), true);
        await page.keyboard.press('Home');
        assert.equal(await page.locator('#tab-library').getAttribute('aria-selected'), 'true');
        for (const category of ['low-elem', 'high-elem', 'junior', 'high']) {
            await page.locator(`#cat-btn-${category}`).click();
            assert.equal(await page.locator(`#lib-cat-${category}`).getAttribute('aria-hidden'), 'false');
            assert.equal(await page.locator('.cat-btn[aria-selected="true"]').count(), 1);
            assert.equal(await page.locator('.cat-btn[tabindex="0"]').count(), 1);
        }
        await page.locator('#cat-btn-high').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#cat-btn-low-elem').getAttribute('aria-selected'), 'true');
        assert.equal(await readerText(page), first, 'タブの矢印キーが読書のステップに漏れない');
        await page.locator('#tab-settings').click();
        await page.locator('[data-action="set-chunk"][data-param="1"]').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#chunk-badge').textContent(), '2単語');
        assert.equal(await page.locator('.chunk-btn[aria-checked="true"]').count(), 1);
        assert.equal(await page.locator('.chunk-btn[tabindex="0"]').count(), 1);
        await page.locator('[data-action="set-fontsize"][data-param="normal"]').focus();
        await page.keyboard.press('ArrowLeft');
        assert.equal(await page.locator('body').evaluate(element => element.classList.contains('text-size-xl')), true);
        assert.equal(await page.locator('.fontsize-btn[tabindex="0"]').count(), 1);
        await page.locator('#tab-input').click();
        await page.locator('#custom-text').fill('typing text');
        const unchanged = await readerText(page);
        await page.locator('#custom-text').press('Space');
        await page.locator('#custom-text').press('r');
        assert.equal(await readerText(page), unchanged, 'テキスト入力がショートカットを起動しない');
        assert.equal(await isPlaying(page), false);
        assert.equal(await page.locator('.tab-btn[aria-selected="true"]').count(), 1);
        assert.equal(await page.locator('.tab-btn[tabindex="0"]').count(), 1);
        await screenshot(page, 'keyboard-tabs-and-input');
    });

    await runCase('keyboard-modifiers-and-native-space', async page => {
        await custom(page);
        await bodyKeyboard(page, 'ArrowRight');
        assert.equal(await readerText(page), WORDS[10]);
        // ブラウザ自体の再読み込みだけを止め、製品のkeydownハンドラーはその前にそのまま動かす。
        await page.evaluate(() => document.addEventListener('keydown', event => {
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyR') event.preventDefault();
        }));
        for (const key of ['Control+ArrowRight', 'Meta+ArrowLeft', 'Control+r', 'Meta+r']) {
            await bodyKeyboard(page, key);
            assert.equal(await readerText(page), WORDS[10], `${key} で読書状態を変更しない`);
        }
        await bodyKeyboard(page, 'r');
        assert.equal(await readerText(page), WORDS[0]);
        await page.locator('#main-play-btn').focus();
        await page.keyboard.press('Space');
        assert.equal(await isPlaying(page), true, 'ボタンのSpaceはネイティブclickで一度だけ開始する');
        await page.clock.runFor(300);
        await page.keyboard.press('Space');
        assert.equal(await readerText(page), WORDS[0], 'カウントダウンの数字を残さない');
        await stationary(page);
    });

    await runCase('trusted-touch-swipes', async (page, record, current) => {
        await custom(page);
        const area = page.getByRole('region', { name: '瞬読表示エリア', exact: true });
        await area.scrollIntoViewIfNeeded();
        const bounds = await area.boundingBox();
        const session = await current.context.newCDPSession(page);
        const swipe = async (from, to) => {
            const y = bounds.y + bounds.height * 0.6;
            await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] });
            for (let part = 1; part <= 4; part++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + (to - from) * part / 4, y }] });
            await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        };
        try {
            await swipe(bounds.x + bounds.width * 0.8, bounds.x + bounds.width * 0.2);
            assert.equal(await readerText(page), WORDS[10]);
            await swipe(bounds.x + bounds.width * 0.2, bounds.x + bounds.width * 0.8);
            assert.equal(await readerText(page), WORDS[0]);
            await page.locator('#main-play-btn').click();
            await page.clock.runFor(300);
            await swipe(bounds.x + bounds.width * 0.8, bounds.x + bounds.width * 0.2);
            assert.equal(await readerText(page), WORDS[10]);
            await stationary(page);
        } finally { await session.detach(); }
        record.input = 'Chromium Input.dispatchTouchEvent による実タッチイベント';
    });
}

async function lifecycleSuite() {
    await runCase('unprepared-placeholder-cannot-create-attempt', async page => {
        await page.locator('#main-play-btn').click();
        await page.clock.runFor(5000);
        assert.equal(await readerText(page), 'Ready?');
        assert.equal(await isPlaying(page), false);
        await assertNoResult(page);
        assert.equal((await history(page))?.readCount || 0, 0);
        await page.locator('#tab-settings').click();
        await page.locator('[data-action="set-chunk"][data-param="3"]').click();
        await page.locator('#main-play-btn').click();
        await page.clock.runFor(5000);
        assert.equal((await history(page))?.readCount || 0, 0, '未読込の設定変更でも架空の読了を作らない');
        await assertNoResult(page);
    });

    await runCase('countdown-repeated-interruptions', async page => {
        await custom(page);
        for (const interruption of ['pause', 'reset', 'tab', 'step']) {
            await page.locator('[data-action="reset"]').click();
            await page.locator('#main-play-btn').click();
            await page.clock.runFor(300);
            assert.equal(await readerText(page), '2');
            if (interruption === 'pause') await page.locator('#main-play-btn').click();
            if (interruption === 'reset') await page.locator('[data-action="reset"]').click();
            if (interruption === 'tab') await page.locator('#tab-settings').click();
            if (interruption === 'step') await page.locator('[data-action="step-forward"]').click();
            assert.equal(await readerText(page), interruption === 'step' ? WORDS[10] : WORDS[0]);
            await stationary(page);
        }
        for (let repeat = 0; repeat < 4; repeat++) {
            await page.locator('[data-action="reset"]').click();
            await page.locator('#main-play-btn').click();
            await page.locator('#main-play-btn').click();
        }
        await stationary(page);
        await page.locator('[data-action="reset"]').click();
        await page.locator('#main-play-btn').click();
        await page.clock.runFor(1200);
        assert.equal(await readerText(page), WORDS[0]);
        await page.clock.runFor(240);
        assert.equal(await readerText(page), WORDS[1], 'タイマーが重複せず一語だけ進む');
        await page.locator('#main-play-btn').click();
        await stationary(page);
        await screenshot(page, 'countdown-interrupted-and-recovered');
    });

    await runCase('parents-modal-pauses-and-restores-focus', async page => {
        await custom(page);
        for (const elapsed of [300, 1680]) {
            await page.locator('[data-action="reset"]').click();
            await page.locator('#main-play-btn').click();
            await page.clock.runFor(elapsed);
            await page.locator('#parents-modal-open-btn').click();
            await page.clock.runFor(60);
            assert.equal(await page.locator('#parents-modal').getAttribute('open'), '');
            assert.equal(await page.locator('#parents-modal-open-btn').getAttribute('aria-expanded'), 'true');
            assert.equal(await isPlaying(page), false);
            assert.doesNotMatch(await readerText(page), /^(?:[123]|GO!)$/);
            const word = await readerText(page);
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('r');
            await page.clock.runFor(5000);
            assert.equal(await readerText(page), word, 'モーダル中は読書が進まない');
            assert.equal(await page.evaluate(() => document.getElementById('parents-modal').contains(document.activeElement)), true);
            await page.keyboard.press('Escape');
            await page.clock.runFor(20);
            assert.equal(await page.locator('#parents-modal').getAttribute('open'), null);
            assert.equal(await page.locator('#parents-modal-open-btn').getAttribute('aria-expanded'), 'false');
            assert.equal(await page.locator('#parents-modal-open-btn').evaluate(element => element === document.activeElement), true);
            await stationary(page);
        }
        await page.locator('#parents-modal-open-btn').click();
        await page.clock.runFor(60);
        const closeButtons = page.locator('#parents-modal [data-action="close-modal"]');
        await closeButtons.last().focus();
        await page.keyboard.press('Tab');
        assert.equal(await closeButtons.first().evaluate(element => element === document.activeElement), true);
        await page.keyboard.press('Shift+Tab');
        assert.equal(await closeButtons.last().evaluate(element => element === document.activeElement), true);
        await closeButtons.last().click();
        await page.clock.runFor(20);
        await page.locator('#parents-modal-open-btn').click();
        await page.clock.runFor(60);
        await page.mouse.click(1, 1);
        await page.clock.runFor(20);
        assert.equal(await page.locator('#parents-modal').getAttribute('open'), null, '背景クリックで閉じる');
        await stationary(page);
    });

    await runCase('pending-completion-is-cancelled', async page => {
        for (const action of ['reset', 'tab', 'modal', 'new-text']) {
            await custom(page, 'alpha beta');
            await setSpeed(page, 1000);
            await page.locator('#main-play-btn').click();
            await page.clock.runFor(1320);
            assert.equal(await isPlaying(page), false);
            await assertNoResult(page);
            if (action === 'reset') await page.locator('[data-action="reset"]').click();
            if (action === 'tab') await page.locator('#tab-input').click();
            if (action === 'new-text') await custom(page, 'newer content');
            if (action === 'modal') await page.locator('#parents-modal-open-btn').click();
            await page.clock.runFor(1000);
            await assertNoResult(page);
            assert.equal((await history(page))?.readCount || 0, 0, '取り消した完了を保存しない');
            if (action === 'modal') { await page.keyboard.press('Escape'); await page.clock.runFor(20); }
        }
    });

    await runCase('settings-rechunk-and-live-speed', async page => {
        await custom(page);
        await page.locator('[data-action="step-forward"]').click();
        await page.locator('#tab-settings').click();
        const before = await progress(page);
        await page.locator('[data-action="set-chunk"][data-param="2"]').click();
        assert.ok(Math.abs(await progress(page) - before) <= 5, 'チャンク変更時に進捗を維持する');
        assert.match(await readerText(page), /word10 word11/);
        await page.locator('#main-play-btn').click();
        await page.clock.runFor(240);
        assert.match(await readerText(page), /word12 word13/);
        await page.locator('#wpm-slider').focus();
        await page.keyboard.press('End');
        assert.equal(await page.locator('#wpm-display').textContent(), '1000');
        await page.clock.runFor(60);
        assert.match(await readerText(page), /word14 word15/, '再設定後も重複したループを残さない');
        await page.locator('[data-action="set-chunk"][data-param="3"]').click();
        await stationary(page);
    });
}

async function answerQuiz(page, correct = true) {
    const answers = correct ? ['川', '大きなもも', '家に持ち帰る'] : ['山', '大きなおむすび', 'その場で食べる'];
    for (let index = 0; index < answers.length; index++) {
        const answer = page.locator(RESULT).getByRole('button', { name: answers[index], exact: true });
        await answer.click();
        assert.equal(await answer.isDisabled(), true, '答えの連打を無効にする');
        assert.equal(await page.locator(`${RESULT} [role="status"] button`).count(), 1, '次へを一つだけ作る');
        assert.match(await page.locator(`${RESULT} [role="status"]`).textContent(), correct ? /せいかい/ : /おしい/);
        await page.locator(RESULT).getByRole('button', { name: index === 2 ? '結果を見る' : '次の問題 →', exact: true }).click();
    }
    assert.match(await page.locator(RESULT).textContent(), correct ? /3\/3/ : /0\/3/);
}

async function readerVisibility(page) {
    return page.locator('#reader-display').evaluate(display => {
        const area = display.parentElement.getBoundingClientRect();
        const walker = document.createTreeWalker(display, NodeFilter.SHOW_TEXT);
        const boxes = [];
        let text = '';
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent.trim()) continue;
            const ruby = Boolean(node.parentElement.closest('rt'));
            if (!ruby) text += node.textContent;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) boxes.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, ruby,
                clipped: rect.left < area.left - 1 || rect.right > area.right + 1 || rect.top < area.top - 1 || rect.bottom > area.bottom + 1 });
        }
        return { text, clipped: boxes.some(box => box.clipped), boxes,
            area: { x: area.x, y: area.y, width: area.width, height: area.height },
            fontSize: getComputedStyle(display).fontSize };
    });
}

async function libraryProgressionSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`library-melos-progression-${viewport.width}x${viewport.height}`, async (page, record) => {
            await page.locator('[data-action="load-library"][data-param="melos"]').click();
            assert.equal(await page.locator('#source-badge').textContent(), '走れメロス');
            const first = await readerVisibility(page);
            assert.ok(first.text.length <= 24, 'ルビ処理で一段落全体を一語に結合しない');
            assert.ok(await progress(page) < 10, 'ライブラリ本文を複数の読書単位に分ける');
            await page.locator('#main-play-btn').click();
            await page.clock.runFor(1200);
            const seen = [await readerText(page)];
            for (let step = 0; step < 5; step++) { await page.clock.runFor(240); seen.push(await readerText(page)); }
            assert.ok(new Set(seen).size >= 3, '実再生で複数の語へ進む');
            await assertNoResult(page);
            await page.locator('#main-play-btn').click();
            await screenshot(page, `melos-normal-reading-${viewport.width}x${viewport.height}`);
            record.readability = [{ setting: 'normal-1', ...await readerVisibility(page) }];
            await page.locator('#tab-settings').click();
            await page.locator('[data-action="set-chunk"][data-param="3"]').click();
            await page.locator('[data-action="set-fontsize"][data-param="xlarge"]').click();
            await page.locator('[data-action="reset"]').click();
            for (let step = 0; step < 4; step++) {
                await page.locator('#reader-display').scrollIntoViewIfNeeded();
                const measurement = await readerVisibility(page);
                record.readability.push({ setting: 'xlarge-3', step, ...measurement });
                await screenshot(page, `melos-xlarge3-${viewport.width}x${viewport.height}-step${step}`);
                await page.locator('[data-action="step-forward"]').click();
            }
            // CIで実際に確認した320px・特大3語の切れを、本文と読み仮名の両方で再発防止する。
            record.clippingObserved = record.readability.some(item => item.clipped);
            assert.equal(record.clippingObserved, false, `${viewport.width}x${viewport.height}: 本文と読み仮名の全グリフが表示枠内に収まる ${JSON.stringify(record.readability.filter(item => item.clipped))}`);
        }, {}, viewport);
    }
}

async function completionSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`custom-completion-${viewport.width}x${viewport.height}`, async page => {
            await custom(page, 'alpha beta gamma');
            await setSpeed(page, 1000);
            for (const [iteration, close] of ['escape', 'button', 'backdrop'].entries()) {
                await complete(page, 2000);
                assert.match(await page.locator(RESULT).textContent(), /内容まで追えた/);
                assert.equal(await page.locator(`${RESULT} [role="status"]`).count(), 0, '自由入力に内蔵クイズを出さない');
                const count = iteration + 1;
                assert.equal((await history(page)).readCount, count);
                assert.equal((await history(page)).customCount, count);
                assert.equal((await history(page)).totalWords, count * 3);
                await page.clock.runFor(5000);
                assert.equal((await history(page)).readCount, count, '完了処理を二重に保存しない');
                await screenshot(page, `custom-result-${viewport.width}x${viewport.height}-${close}`);
                if (close === 'escape') await page.keyboard.press('Escape');
                else if (close === 'button') await page.locator(RESULT).getByRole('button', { name: '結果を閉じる', exact: true }).click();
                else await page.mouse.click(1, 1);
                await page.clock.runFor(20);
                await assertNoResult(page);
                assert.equal(await readerText(page), 'alpha', '閉じる経路によらず先頭へ戻る');
                assert.equal(await page.locator('#main-play-btn').evaluate(element => element === document.activeElement), true);
                await stationary(page);
            }
            await page.reload({ waitUntil: 'load' });
            await page.locator('#tab-settings').click();
            assert.equal(await page.locator('#report-read-count').textContent(), '3冊', '再読込で読書履歴を復元する');
            assert.equal(await page.locator('#report-total-words').textContent(), '9');
        }, {}, viewport);
    }

    await runCase('library-quiz-correct-wrong-repeat-and-cancel', async page => {
        await loadMomotaro(page);
        const firstWord = await readerText(page);
        await setSpeed(page, 1000);
        await complete(page);
        assert.match(await page.locator(RESULT).textContent(), /1 of 3/);
        assert.equal(await history(page, COMPREHENSION), null, '解答前の内容チェックを記録しない');
        await screenshot(page, 'library-quiz-question');
        await page.keyboard.press('Escape');
        await page.clock.runFor(20);
        assert.equal(await readerText(page), firstWord);
        await assertNoResult(page);
        assert.equal(await history(page, COMPREHENSION), null, 'クイズの途中終了を成績にしない');
        for (const correct of [true, false]) {
            await complete(page);
            await answerQuiz(page, correct);
            const attempts = await history(page, COMPREHENSION);
            assert.equal(attempts.length, correct ? 1 : 2);
            assert.equal(attempts.at(-1).score, correct ? 3 : 0);
            assert.equal(attempts.at(-1).total, 3);
            assert.ok(Number.isFinite(attempts.at(-1).wpm) && attempts.at(-1).wpm > 0);
            await page.clock.runFor(1000);
            assert.equal((await history(page, COMPREHENSION)).length, attempts.length);
            await screenshot(page, correct ? 'library-quiz-perfect-result' : 'library-quiz-retry-result');
            await page.locator(RESULT).getByRole('button', { name: '結果を閉じる', exact: true }).click();
            await page.clock.runFor(20);
            assert.equal(await readerText(page), firstWord);
        }
        assert.equal((await history(page)).readCount, 3);
        assert.equal((await history(page)).categoryCounts['low-elem'], 3);
        await page.locator('#tab-settings').click();
        assert.equal(await page.locator('#report-read-count').textContent(), '3冊');
        await screenshot(page, 'completed-library-report');
    });

    await runCase('empty-custom-keeps-loaded-library-identity', async (page, record, current) => {
        await loadMomotaro(page);
        const firstWord = await readerText(page);
        await page.locator('#tab-input').click();
        await page.locator('#custom-text').fill('   \n  ');
        await page.locator('[data-action="prepare-custom"]').click();
        await waitFor(() => current.alerts.length === 1, '空の入力を通知する');
        assert.equal(await page.locator('#source-badge').textContent(), 'ももたろう');
        assert.equal(await readerText(page), firstWord);
        await setSpeed(page, 1000);
        await complete(page);
        assert.match(await page.locator(RESULT).textContent(), /ももたろう/);
        assert.equal((await history(page)).categoryCounts['low-elem'], 1);
        assert.equal((await history(page)).customCount, 0, '拒否した自由入力へ分類を変更しない');
    }, { allowAlerts: true });
}

async function fileSuite() {
    await runCase('file-import-real-valid-invalid-and-repeat', async (page, record, current) => {
        await page.locator('#tab-input').click();
        const file = { name: 'reading.txt', mimeType: 'text/plain', buffer: Buffer.from('imported first second', 'utf8') };
        await page.locator('#custom-file-input').setInputFiles(file);
        await waitFor(async () => await readerText(page) === 'imported', '実FileReaderでテキストを読み込む');
        assert.equal(await page.locator('#custom-text').inputValue(), 'imported first second');
        await page.locator('[data-action="clear-custom"]').click();
        await page.locator('#custom-file-input').setInputFiles(file);
        await waitFor(async () => await page.locator('#custom-text').inputValue() === 'imported first second', '同じファイルを再選択できる');
        for (const invalid of [
            { name: 'reading.pdf', mimeType: 'application/pdf', buffer: Buffer.from('wrong format') },
            { name: 'too-large.txt', mimeType: 'text/plain', buffer: Buffer.alloc(1024 * 1024 + 1, 'a') }
        ]) {
            const count = current.alerts.length;
            await page.locator('#custom-file-input').setInputFiles(invalid);
            await waitFor(() => current.alerts.length === count + 1, '不正ファイルを通知する');
            assert.equal(await readerText(page), 'imported');
            assert.equal(await page.locator('#custom-text').inputValue(), 'imported first second');
        }
        assert.match(current.alerts.join('\n'), /テキストファイル/);
        assert.match(current.alerts.join('\n'), /1MB/);
        await screenshot(page, 'file-import-valid-state');
    }, { allowAlerts: true });

    await runCase('file-import-read-error-recovers', async (page, record, current) => {
        await custom(page, 'safe content');
        await page.locator('#custom-file-input').setInputFiles({ name: 'broken-read.txt', mimeType: 'text/plain', buffer: Buffer.from('unreadable') });
        await page.clock.runFor(100);
        await waitFor(() => current.alerts.length === 1, '読み込み失敗を通知する');
        assert.match(current.alerts[0], /読み込みに失敗/);
        assert.equal(await readerText(page), 'safe');
        await page.locator('#custom-file-input').setInputFiles({ name: 'recovered.txt', mimeType: 'text/plain', buffer: Buffer.from('recovered content') });
        await waitFor(async () => await readerText(page) === 'recovered', '失敗後の次の読み込みが成功する');
    }, { fileBoundary: true, allowAlerts: true });

    for (const newerAction of ['file', 'edit', 'clear', 'prepare', 'library']) {
        await runCase(`file-import-stale-${newerAction}`, async page => {
            await custom(page, 'original content');
            await page.locator('#custom-file-input').setInputFiles({ name: 'slow-old.txt', mimeType: 'text/plain', buffer: Buffer.from('stale overwrite') });
            // native FileReaderの完了を待ってからユーザー操作し、遅れたonloadだけを後で配達する。
            await waitFor(() => page.evaluate(() => window.__speedReaderFileBoundary.queued.includes('slow-old.txt')), '遅延完了通知をキューに載せる');
            if (newerAction === 'file') {
                await page.locator('#custom-file-input').setInputFiles({ name: 'newer.txt', mimeType: 'text/plain', buffer: Buffer.from('newer content') });
                await waitFor(async () => await readerText(page) === 'newer', '新しいファイルを先に読み込む');
            }
            if (newerAction === 'edit' || newerAction === 'prepare') await page.locator('#custom-text').fill('user edited content');
            if (newerAction === 'prepare') await page.locator('[data-action="prepare-custom"]').click();
            if (newerAction === 'clear') await page.locator('[data-action="clear-custom"]').click();
            if (newerAction === 'library') await loadMomotaro(page);
            const expected = { text: await page.locator('#custom-text').inputValue(), reader: await readerText(page), source: await page.locator('#source-badge').textContent() };
            await page.clock.runFor(6000);
            assert.deepEqual({ text: await page.locator('#custom-text').inputValue(), reader: await readerText(page), source: await page.locator('#source-badge').textContent() }, expected,
                '遅れたファイル完了が新しいユーザー操作を上書きしない');
            await assertNoResult(page);
        }, { fileBoundary: true });
    }
}

async function storageSuite() {
    const malformed = [
        { label: 'invalid-json', value: '{broken' },
        { label: 'null', value: 'null' },
        { label: 'array', value: '[1,2,3]' },
        { label: 'invalid-fields', value: JSON.stringify({ readCount: -5, maxWpm: 'Infinity', totalWords: {}, totalDuration: -100,
            categoryCounts: [], dailyHistory: { invalid: 'oops' }, unlockedBadges: ['unknown', {}, null] }) }
    ];
    for (const { label, value } of malformed) {
        await runCase(`storage-${label}`, async page => {
            await page.locator('#tab-settings').click();
            assert.equal(await page.locator('#report-read-count').textContent(), '0冊');
            assert.equal(await page.locator('#report-total-words').textContent(), '0');
            assert.equal(await page.locator('#report-max-wpm').textContent(), '0');
            assert.doesNotMatch(await page.locator('#content-settings').textContent(), /NaN|Infinity|undefined|\[object Object\]/);
            await custom(page, 'alpha beta gamma');
            await setSpeed(page, 1000);
            await complete(page, 2000);
            assert.equal((await history(page)).readCount, 1);
            await page.keyboard.press('Escape');
            await page.clock.runFor(20);
            await loadMomotaro(page);
            await setSpeed(page, 1000);
            await complete(page);
            await answerQuiz(page);
            const attempts = await history(page, COMPREHENSION);
            assert.equal(attempts.length, 1);
            assert.equal(attempts[0].score, 3);
        }, { storage: { [HISTORY]: value, [COMPREHENSION]: value } });
    }
    for (const failure of ['denyStorage', 'quotaExceeded']) {
        await runCase(`storage-${failure}`, async page => {
            await custom(page, 'alpha beta gamma');
            await setSpeed(page, 1000);
            await complete(page, 2000);
            await page.keyboard.press('Escape');
            await page.clock.runFor(20);
            await page.locator('#tab-settings').click();
            assert.equal(await page.locator('#report-read-count').textContent(), '1冊', '保存失敗中もメモリ内レポートを更新する');
            await loadMomotaro(page);
            await setSpeed(page, 1000);
            await complete(page);
            await answerQuiz(page);
            await page.locator(RESULT).getByRole('button', { name: '結果を閉じる', exact: true }).click();
            await page.clock.runFor(20);
            await page.locator('#tab-settings').click();
            assert.equal(await page.locator('#report-read-count').textContent(), '2冊');
            await screenshot(page, `report-${failure}`);
        }, { [failure]: true });
    }

    await runCase('custom-text-is-inert-and-ruby-renders', async page => {
        const literal = '<img/src=x/onerror=alert(1)>';
        await custom(page, literal);
        assert.equal(await page.locator('#reader-display img, #reader-display script').count(), 0);
        assert.equal(await readerText(page), literal);
        await custom(page, '山{やま} 川{かわ} 海{うみ}');
        assert.equal(await page.locator('#reader-display ruby').count(), 1);
        assert.equal(await page.locator('#reader-display rt').textContent(), 'やま');
        await screenshot(page, 'ruby-and-safe-text');
    });
}

try {
    await mkdir(artifactDir, { recursive: true });
    candidateUrl = await serveDist(dist);
    await writeAssetManifest(dist, 'candidate');
    if (process.env.SPEED_READER_BASELINE_ROOT) {
        const baselineDist = path.resolve(process.env.SPEED_READER_BASELINE_ROOT);
        assert.notEqual(dist, baselineDist, '候補と基準に同じdistを指定しない');
        baselineUrl = await serveDist(baselineDist);
        await writeAssetManifest(baselineDist, 'baseline');
    } else {
        console.log('[INFO] SPEED_READER_BASELINE_ROOT未指定: 基準版比較は明示的に省略します。候補版の全検証・4画面幅の計測と画像は保存します。');
    }
    browser = await chromium.launch({ headless: true });
    await layoutSuite();
    await reachabilitySuite();
    await navigationSuite();
    await lifecycleSuite();
    await libraryProgressionSuite();
    await completionSuite();
    await fileSuite();
    await storageSuite();
    if (failures.length) throw new AggregateError(failures, `Speed Reader実ビルドE2E: ${failures.length}/${results.length}件失敗。${artifactDir}/results.jsonを参照`);
    console.log(`[OK] Speed Reader実ビルドE2E: ${results.length}件成功。画像・基準比較・資産ハッシュ: ${artifactDir}`);
} finally {
    await browser?.close();
    for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

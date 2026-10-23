import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 実ビルドを無加工配信する。内部アプリ関数/状態は参照・置換せず、操作とブラウザ境界だけを検証する。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const baselineDist = process.env.BOOK_REPORT_BASELINE_ROOT ? path.resolve(process.env.BOOK_REPORT_BASELINE_ROOT) : null;
const productionUrl = process.env.BOOK_REPORT_PRODUCTION_URL || null;
const artifactDir = path.resolve(process.env.BOOK_REPORT_ARTIFACT_DIR || path.join(root, 'visual-guard-artifacts', 'book-report'));
const fontMode = process.env.BOOK_REPORT_FONT_MODE || 'browser';
const VIEWPORTS = [{ width: 320, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];
const PREFIX = 'bookReportQuestData_slot_', ACTIVE = 'bookReportQuestActiveSlot', PROFILE = 'wonder_school_profile_v2';
const FIELDS = { title: ['book-title', 80, 1], author: ['book-author', 60, 1], synopsisPartA: ['synopsis-part-a', 40, 1], synopsisPartB: ['synopsis-part-b', 60, 1], synopsisPartC: ['synopsis-part-c', 40, 1], motivationDetail: ['motivation-detail', 140, 2], sceneDesc: ['scene-desc', 300, 3], sceneMyself: ['scene-myself', 300, 3], conclusionChange: ['conclusion-change', 300, 4], draftText: ['draft-textarea', 5000, 0] };
const servers = [], manifests = new Map(), results = [], failures = [], imagePairs = [];
const runTool = promisify(execFile), points = value => Array.from(value), sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJSON = (name, value) => writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const form = (overrides = {}) => ({ genre: 'story', title: '  星を読む本𠮷😀  ', author: '  森の作者𠮷  ', synopsisPartA: '小さな探検家が', synopsisPartB: '星の動きを調べ', synopsisPartC: '友だちに伝えた', motivation: 'interest', motivationDetail: '  星座に興味があったから  ', sceneDesc: '  暗い空に明るい星を見つけた場面𠮷😀  ', sceneFeeling: 'びっくりした', sceneMyself: '  私も空を見上げて新しいことを調べたい  ', conclusionChange: '  わからないことを自分で調べたい  ', selectedOpening: 'opening-b', draftText: '  練習のはじめ𠮷😀\n\n　自分の言葉で、か\u3099と書く。\n  終わり  ', ...overrides });
const stored = (data = form(), step = 1, extra = {}) => JSON.stringify({ formData: data, currentStep: step, savedAt: '2026-01-02T12:00:00.000Z', ...extra });
const seeds = (data = form(), step = 4, slot = 1) => ({ [ACTIVE]: String(slot), [PREFIX + slot]: stored(data, step) });
const shareURL = (base, data) => { const url = new URL(base); url.searchParams.set('data', Buffer.from(JSON.stringify(data), 'utf8').toString('base64url')); return url.href; };
const decodeShare = value => JSON.parse(Buffer.from(new URL(value).searchParams.get('data'), 'base64url').toString('utf8'));
const savedRaw = (page, slot = 1) => page.evaluate(key => localStorage.getItem(key), PREFIX + slot);
const saved = async (page, slot = 1) => JSON.parse(await savedRaw(page, slot));
let browser, candidateUrl, baselineUrl;

async function serveDist(directory) {
    const entry = await readFile(path.join(directory, 'book_report/index.html'), 'utf8');
    assert.ok((await stat(path.join(directory, 'assets'))).isDirectory(), 'Actual Vite dist/assets is required');
    assert.match(entry, /(?:\.\.\/|\/)assets\/[^"']+\.css/, 'Source HTML is not an actual Vite build');
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
    const server = createServer(async (request, response) => {
        try {
            let file = path.resolve(directory, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
            if (file !== directory && !file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
            if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
            response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(await readFile(file));
        } catch (error) { response.writeHead(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500).end(); }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); servers.push(server);
    return `http://127.0.0.1:${server.address().port}/book_report/`;
}
async function manifestAssets(directory, name) {
    const origin = 'https://book-build.invalid', pending = ['/book_report/index.html', '/book_report/script.js', '/book_report/script-core.js', '/book_report/summer-support.js'].map(value => new URL(value, origin)), files = new Map();
    while (pending.length) {
        const url = pending.shift(), relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        if (url.origin !== origin || files.has(relative)) continue;
        const file = path.resolve(directory, relative); assert.ok(file.startsWith(directory + path.sep), 'Asset reference stays inside build root');
        const bytes = await readFile(file), source = bytes.toString('utf8'), references = []; files.set(relative, { path: relative, bytes: bytes.length, sha256: sha256(bytes) });
        if (file.endsWith('.html')) for (const match of source.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) references.push(match[1].replaceAll('&amp;', '&'));
        if (file.endsWith('.css')) {
            for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) references.push(match[1]);
            for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gi)) references.push(match[1]);
        }
        if (/\.m?js$/.test(file)) {
            for (const match of source.matchAll(/\b(?:import|export)\s*(?:[^;'"\n]*?\bfrom\s*)?["']([^"']+)["']/g)) references.push(match[1]);
            for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) references.push(match[1]);
        }
        for (const reference of references) { if (/^(?:data:|#)/.test(reference)) continue; const next = new URL(reference, url); if (next.origin === origin) pending.push(next); }
    }
    assert.ok([...files.keys()].some(file => file.startsWith('assets/')), 'Linked actual build assets are hashed');
    const manifest = { entry: 'book_report/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
    manifests.set(name, { directory, manifest }); await writeJSON(`${name}-asset-manifest.json`, manifest);
}
async function verifyAssets(name) {
    const { directory, manifest } = manifests.get(name);
    for (const entry of manifest.files) { const bytes = await readFile(path.join(directory, entry.path)); assert.equal(bytes.length, entry.bytes); assert.equal(sha256(bytes), entry.sha256, `${name} asset must remain unmodified: ${entry.path}`); }
    return { name, files: manifest.files.length, manifestSHA256: sha256(JSON.stringify(manifest)) };
}

// 保存・クリップボード・OS印刷の境界だけを観測する。本番・nativeケースでは適用しない。
function browserEnvironment(options) {
    const observation = window.__bookE2EBoundary = { writes: [], removals: [], clipboard: [], fallbackCopies: 0, prints: [], toasts: [], storageFaults: { write: Boolean(options.writeFail), writeKey: null, removeKey: null } };
    if (options.observeToasts) {
        // load/font待ちの間に消える通知も、実際にDOMへ表示された時点で記録する。
        const seen = new WeakSet();
        new MutationObserver(() => {
            for (const toast of document.querySelectorAll('#toast-container .toast[role="alert"]')) {
                if (!seen.has(toast) && toast.isConnected && getComputedStyle(toast).display !== 'none') {
                    seen.add(toast); observation.toasts.push({ text: toast.textContent, time: performance.now() });
                }
            }
        }).observe(document, { childList: true, subtree: true });
    }
    const originalSet = Storage.prototype.setItem, originalRemove = Storage.prototype.removeItem;
    if (options.observeStorage || options.writeFail) Storage.prototype.setItem = function (key, value) {
        observation.writes.push({ key, value, time: performance.now() });
        if ((observation.storageFaults.write && key.startsWith('bookReport')) || observation.storageFaults.writeKey === key) throw new DOMException('Storage full', 'QuotaExceededError');
        return originalSet.call(this, key, value);
    };
    if (options.observeStorage || options.writeFail) Storage.prototype.removeItem = function (key) {
        const failed = observation.storageFaults.removeKey === key; observation.removals.push({ key, failed, time: performance.now() });
        if (failed) throw new DOMException('Storage removal denied', 'SecurityError');
        return originalRemove.call(this, key);
    };
    if (options.denyStorage) for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
    if (options.clipboard) {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => {
            observation.clipboard.push(value);
            if (options.clipboard !== 'success') throw new DOMException('Clipboard denied', 'NotAllowedError');
        } } });
        document.execCommand = command => { if (command === 'copy') observation.fallbackCopies++; return options.clipboard === 'fallback-success'; };
    }
    if (options.observePrint) window.print = () => observation.prints.push({ draft: document.querySelector('#print-draft-view')?.textContent, active: localStorage.getItem('bookReportQuestActiveSlot'), slots: [1, 2, 3].map(slot => localStorage.getItem(`bookReportQuestData_slot_${slot}`)) });
}
async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const target = options.url || candidateUrl;
    assert.ok(!options.native || !['storage', 'observeStorage', 'writeFail', 'denyStorage', 'clipboard', 'observePrint', 'observeToasts'].some(key => options[key]), 'Native cases forbid browser-boundary fixtures');
    const context = await browser.newContext({ viewport, locale: 'ja-JP', timezoneId: 'UTC', colorScheme: 'light', reducedMotion: options.motion || 'reduce', hasTouch: viewport.width < 768, isMobile: viewport.width < 768, serviceWorkers: options.native ? 'allow' : 'block', acceptDownloads: true,
        ...(options.storage ? { storageState: { cookies: [], origins: [{ origin: new URL(target).origin, localStorage: Object.entries(options.storage).map(([name, value]) => ({ name, value })) }] } } : {}) });
    if (['observeStorage', 'writeFail', 'denyStorage', 'clipboard', 'observePrint', 'observeToasts'].some(key => options[key])) await context.addInitScript(browserEnvironment, options);
    const current = { context, options, errors: [], requestFailures: [], externalFailures: [], consoleErrors: [], consoleWarnings: [], dialogs: [], dialogPlan: [...(options.dialogPlan || [])], fontTransfers: [] };
    if (!options.native && fontMode === 'api') await context.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, async route => {
        const response = await context.request.fetch(route.request(), { timeout: 30_000 }), bytes = await response.body();
        current.fontTransfers.push({ url: route.request().url(), status: response.status(), bytes: bytes.length, sha256: sha256(bytes) }); await route.fulfill({ response, body: bytes });
    });
    current.observe = page => {
        page.setDefaultTimeout(15_000); page.on('pageerror', error => current.errors.push(error.stack || error.message));
        page.on('console', message => { if (message.type() === 'error') current.consoleErrors.push(message.text()); if (message.type() === 'warning') current.consoleWarnings.push(message.text()); });
        const failure = (url, label) => (new URL(url).origin === new URL(target).origin ? current.requestFailures : current.externalFailures).push(label);
        page.on('response', response => { if (response.status() >= 400) failure(response.url(), `${response.status()} ${response.url()}`); });
        page.on('requestfailed', request => failure(request.url(), `${request.failure()?.errorText} ${request.url()}`));
        page.on('dialog', async dialog => {
            const plan = current.dialogPlan.shift(); current.dialogs.push({ type: dialog.type(), message: dialog.message(), expected: Boolean(plan), action: plan?.accept ? 'accept' : 'dismiss' });
            if (plan?.accept) await dialog.accept(); else await dialog.dismiss();
        });
    };
    current.page = await context.newPage(); current.observe(current.page); return current;
}
async function settle(page, milliseconds = 650) { await page.waitForTimeout(milliseconds); }
async function ready(current, url = current.options.url || candidateUrl, { reload = false, page = current.page } = {}) {
    const response = reload ? await page.reload({ waitUntil: 'load' }) : await page.goto(url, { waitUntil: 'load' }); assert.equal(response.status(), 200);
    await page.locator('#book-grade-support').waitFor({ state: 'attached' }); await page.evaluate(() => document.fonts.ready); await settle(page);
}
async function screenshot(page, name) { await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0); return page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' }); }
async function eventually(read, expected, label, timeout = 10_000) {
    let actual; const end = Date.now() + timeout;
    do { actual = await read(); if (Object.is(actual, expected)) return actual; await new Promise(resolve => setTimeout(resolve, 40)); } while (Date.now() < end);
    assert.equal(actual, expected, label);
}
async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const record = { name, viewport, status: 'passed', fixtures: { ...options, storage: options.storage ? Object.keys(options.storage) : undefined } }, start = Date.now(); let current;
    try {
        current = await createCase(viewport, options); if (!options.beforeReady) await ready(current);
        await work(current.page, record, current);
        assert.deepEqual(current.errors, [], 'No unhandled browser exceptions'); assert.deepEqual(current.requestFailures, [], 'All same-origin assets load');
        assert.deepEqual(current.dialogs.filter(dialog => !dialog.expected), [], 'No unplanned native dialogs'); assert.equal(current.dialogPlan.length, 0, 'All planned confirmations actually opened');
        const unexpected = current.consoleErrors.filter(message => !(options.expectedConsole || []).some(pattern => pattern.test(message)) && !/Failed to load resource: net::ERR_/.test(message));
        assert.deepEqual(unexpected, [], 'No unexpected console errors'); console.log(`[OK] Book Report: ${name}`);
    } catch (error) {
        record.status = 'failed'; record.error = error.stack || String(error); failures.push(new Error(`${name}: ${error.message}`, { cause: error })); console.error(`[FAIL] Book Report: ${name}: ${error.message}`);
        try { if (current?.page) { await screenshot(current.page, `${name}-failure`); record.failureMetrics = await layoutMetrics(current.page); await writeFile(path.join(artifactDir, `${name}-failure.html`), await current.page.content()); } } catch (captureError) { record.captureError = captureError.message; }
    } finally {
        Object.assign(record, { durationMs: Date.now() - start, pageErrors: current?.errors || [], requestFailures: current?.requestFailures || [], externalFailures: current?.externalFailures || [], consoleErrors: current?.consoleErrors || [], consoleWarnings: current?.consoleWarnings || [], dialogs: current?.dialogs || [], fontTransfers: current?.fontTransfers || [] });
        await current?.context.close(); results.push(record); await writeJSON('results.json', results);
    }
}
async function focusIs(page, selector) { assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true, `Keyboard focus returns to ${selector}`); }
async function noOverflow(page, record) {
    const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    (record.widthChecks ||= []).push(size); assert.ok(size.document <= size.viewport + 1 && size.body <= size.viewport + 1, `No horizontal overflow: ${JSON.stringify(size)}`);
}
async function layoutMetrics(page) {
    return page.evaluate(() => {
        const round = value => Math.round(value * 100) / 100;
        const selectors = ['header', 'header h1', 'header h1 + p', 'main', '#progress-container', '#wizard-form', '#step-1', '#slot-tabs', '.slot-tab', '#genre-chips', '#book-grade-support', '#book-grade-rule-note', '#book-title', '#book-author', '#synopsis-title', '#synopsis-part-a', '#synopsis-part-b', '#synopsis-part-c', '#step-1 .btn-next'];
        return { title: document.title, viewport: { width: innerWidth, height: innerHeight }, overflow: { document: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth },
            anchors: selectors.flatMap(selector => [...document.querySelectorAll(selector)].map((node, index) => { const rect = node.getBoundingClientRect(), style = getComputedStyle(node); return { key: `${selector}:${index}`, text: (node.innerText || '').trim().replace(/\s+/g, ' '), box: Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, round(rect[key])])), style: Object.fromEntries(['display', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'gap', 'color', 'backgroundColor', 'backgroundImage', 'borderRadius', 'borderColor', 'borderWidth'].map(key => [key, style[key]])) }; })),
            fonts: [...document.fonts].map(font => ({ family: font.family, status: font.status })), controls: [...document.querySelectorAll('#step-1 button,#step-1 input')].map(node => ({ id: node.id, type: node.type, value: node.value, label: node.getAttribute('aria-label'), text: (node.innerText || '').trim().replace(/\s+/g, ' '), disabled: node.disabled })) };
    });
}
const comparable = metrics => ({ title: metrics.title, viewport: metrics.viewport, overflow: metrics.overflow, anchors: metrics.anchors, controls: metrics.controls });
function requireFonts(metrics) {
    for (const family of ['M PLUS Rounded 1c', 'Material Symbols Rounded']) assert.ok(metrics.fonts.some(font => font.family.replaceAll('"', '') === family && font.status === 'loaded'), `Real ${family} font loaded`);
}

// PNGの圧縮方式に影響されず、元ピクセルを完全一致で比較する。差があれば座標と最大チャンネル差を残す。
function decodePNG(bytes) {
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); let offset = 8, width, height, channels; const idat = [];
    while (offset < bytes.length) {
        const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8), data = bytes.subarray(offset + 8, offset + 8 + length); offset += length + 12;
        if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert.ok([2, 6].includes(data[9]), 'Screenshots use 8-bit RGB/RGBA PNG'); channels = data[9] === 6 ? 4 : 3; assert.equal(data[12], 0, 'PNG is not interlaced'); }
        if (type === 'IDAT') idat.push(data);
    }
    const raw = inflateSync(Buffer.concat(idat)), stride = width * channels, decoded = Buffer.alloc(stride * height); assert.equal(raw.length, (stride + 1) * height);
    const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)]; assert.ok(filter <= 4);
        for (let x = 0; x < stride; x++) { const at = y * stride + x, left = x >= channels ? decoded[at - channels] : 0, up = y ? decoded[at - stride] : 0, corner = y && x >= channels ? decoded[at - stride - channels] : 0;
            decoded[at] = (raw[y * (stride + 1) + 1 + x] + [0, left, up, Math.floor((left + up) / 2), paeth(left, up, corner)][filter]) & 255; }
    }
    const rgba = Buffer.alloc(width * height * 4, 255); for (let i = 0; i < width * height; i++) for (let c = 0; c < channels; c++) rgba[i * 4 + c] = decoded[i * channels + c];
    return { width, height, rgba };
}
function comparePixels(before, after) {
    const a = decodePNG(before), b = decodePNG(after), result = { before: { width: a.width, height: a.height, sha256: sha256(before) }, after: { width: b.width, height: b.height, sha256: sha256(after) }, changedPixels: 0, maxChannelDelta: 0, firstDifference: null };
    if (a.width !== b.width || a.height !== b.height) return { ...result, dimensionMismatch: true };
    for (let i = 0; i < a.width * a.height; i++) { let changed = false; for (let c = 0; c < 4; c++) { const delta = Math.abs(a.rgba[i * 4 + c] - b.rgba[i * 4 + c]); result.maxChannelDelta = Math.max(result.maxChannelDelta, delta); changed ||= delta !== 0; } if (changed) { result.changedPixels++; result.firstDifference ||= { x: i % a.width, y: Math.floor(i / a.width) }; } }
    return result;
}

async function goStep(page, target) {
    const visible = await page.locator('.step-card.active').getAttribute('id'); let step = Number(visible.replace('step-', ''));
    while (step < target) { await page.locator(`[data-next-step="${step}"]`).click(); step++; await page.locator(`#step-${step}.active`).waitFor({ state: 'visible' }); await settle(page); }
    while (step > target) { await page.locator(`[data-prev-step="${step}"]`).click(); step--; await page.locator(`#step-${step}.active`).waitFor({ state: 'visible' }); await settle(page); }
}
async function makeResult(page) { await goStep(page, 4); await page.locator('.btn-generate').click(); await page.locator('#result-section').waitFor({ state: 'visible' }); await settle(page); }
async function openDraft(page) { if (!(await page.locator('#draft-details').evaluate(node => node.open))) await page.locator('#draft-details summary').click(); await page.locator('#draft-textarea').waitFor({ state: 'visible' }); }
async function inputEvent(page, selector, value) {
    // ネイティブmaxlengthと独立にペースト等の上限超過を入力境界へ届ける。内部メソッドは呼ばない。
    await page.locator(selector).evaluate((node, text) => { node.value = text; node.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertFromPaste' })); }, value);
}
async function compose(page, selector, value, phase) {
    // CIにOS IMEはないため、標準composition/inputイベントの契約を明示的に再現する。
    await page.locator(selector).evaluate((node, { value, phase }) => {
        if (phase === 'start') node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
        node.value = value;
        if (phase === 'end') node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
        node.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertCompositionText', isComposing: phase !== 'end' }));
    }, { value, phase });
}
async function assertForm(page, expected) {
    for (const [field, [id]] of Object.entries(FIELDS)) assert.equal(await page.locator(`#${id}`).inputValue(), expected[field], `Raw ${field} round-trips without losing spaces or Unicode`);
    assert.equal(await page.locator('input[name="genre"]:checked').inputValue(), expected.genre);
    assert.equal(await page.locator('input[name="motivation"]:checked').inputValue(), expected.motivation);
    assert.equal(await page.locator('.feeling-chip.selected').getAttribute('data-val'), expected.sceneFeeling);
}
async function readBookStorage(page) { return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('bookReport')).sort().map(key => [key, localStorage.getItem(key)]))); }

async function initialSuite() {
    for (const viewport of VIEWPORTS) await runCase(`initial-exact-baseline-${viewport.width}`, async (page, record) => {
        await noOverflow(page, record); const afterPNG = await screenshot(page, `initial-${viewport.width}-candidate`), after = await layoutMetrics(page); requireFonts(after);
        let before = null, pixelComparison = null;
        if (baselineUrl) {
            const baseline = await createCase(viewport, { url: baselineUrl });
            try { await ready(baseline); const beforePNG = await screenshot(baseline.page, `initial-${viewport.width}-baseline`); before = await layoutMetrics(baseline.page); requireFonts(before); pixelComparison = comparePixels(beforePNG, afterPNG); }
            finally { await baseline.context.close(); }
        }
        const metrics = `initial-${viewport.width}-comparison.json`; await writeJSON(metrics, { before, after, pixelComparison });
        imagePairs.push({ name: `Initial ${viewport.width}px exact comparison`, before: before ? `initial-${viewport.width}-baseline.png` : null, after: `initial-${viewport.width}-candidate.png`, metrics });
        record.pixelComparison = pixelComparison;
        if (before) { assert.deepEqual(comparable(after), comparable(before), 'Initial copy, controls, actual geometry and computed styles remain exactly unchanged'); assert.equal(pixelComparison.dimensionMismatch, undefined, 'Initial PNG dimensions unchanged'); assert.equal(pixelComparison.changedPixels, 0, `Exact initial pixels: ${JSON.stringify(pixelComparison)}`); }
        assert.equal(await savedRaw(page), null, 'Initial visit does not create or overwrite saved work');
    }, {}, viewport);
}
async function wizardSuite() {
    for (const viewport of VIEWPORTS) await runCase(`complete-wizard-draft-${viewport.width}`, async (page, record, current) => {
        const data = form();
        await page.locator('[data-next-step="1"]').click(); await focusIs(page, '#book-title'); assert.match(await page.locator('#book-title-error').textContent(), /タイトル/);
        for (const [field, [id, , step]] of Object.entries(FIELDS)) if (step === 1) await page.locator(`#${id}`).fill(data[field]);
        await page.locator('label').filter({ has: page.locator('input[name="book-grade-support"][value="middle"]') }).click();
        await goStep(page, 2); assert.equal(await page.locator('#progress-container').getAttribute('aria-valuenow'), '50');
        await page.locator('[data-next-step="2"]').click(); assert.equal(await page.locator('#step-2').evaluate(node => node.classList.contains('active')), true);
        await page.locator('.option-card').filter({ has: page.locator('input[value="interest"]') }).click(); await page.locator('#motivation-detail').fill(data.motivationDetail);
        await goStep(page, 3); await page.locator('[data-next-step="3"]').click(); await focusIs(page, '#scene-desc');
        await page.locator('#scene-desc').fill(data.sceneDesc); await page.locator('.feeling-chip[data-val="びっくりした"]').click(); await page.locator('#scene-myself').fill(data.sceneMyself);
        await goStep(page, 4); assert.equal(await page.locator('#progress-container').getAttribute('aria-valuenow'), '100');
        await page.locator('.btn-generate').click(); await focusIs(page, '#conclusion-change'); assert.equal(await page.locator('#result-section').isVisible(), false);
        await page.locator('#conclusion-change').fill(data.conclusionChange); await makeResult(page);
        for (const [selector, expected] of [['#body-scene-ref', data.sceneDesc.trim()], ['#body-myself-ref', data.sceneMyself.trim()], ['#conclusion-text', data.conclusionChange.trim()]]) assert.ok((await page.locator(selector).textContent()).includes(expected));
        assert.match(await page.locator('#opening-a').textContent(), /自分|きっかけ|理由/); assert.equal(await page.locator('#result-section img[src="x"]').count(), 0);
        await page.locator('[data-copy-target="opening-b"]').focus(); await page.keyboard.press('Enter'); await settle(page, 50);
        assert.equal((await saved(page)).formData.selectedOpening, 'opening-b');
        await openDraft(page); await page.locator('#load-outline-to-draft-btn').click(); assert.ok((await page.locator('#draft-textarea').inputValue()).includes(data.sceneDesc.trim()));
        await page.locator('#draft-textarea').fill(data.draftText); await settle(page); assert.equal((await saved(page)).formData.draftText, data.draftText);
        assert.equal(await page.locator('#draft-char-count').textContent(), String(points(data.draftText).length));
        current.dialogPlan.push({ accept: false }); await page.locator('#load-outline-to-draft-btn').click(); assert.equal(await page.locator('#draft-textarea').inputValue(), data.draftText, 'Cancel replacement preserves the personal draft');
        await noOverflow(page, record); await screenshot(page, `result-draft-${viewport.width}`); record.saved = await saved(page);
        await ready(current, candidateUrl, { reload: true }); await assertForm(page, data); assert.equal(await page.locator('input[name="book-grade-support"]:checked').inputValue(), 'middle');
        await makeResult(page); await openDraft(page); assert.equal(await page.locator('#draft-textarea').inputValue(), data.draftText);
    }, { clipboard: 'success' }, viewport);
}
async function inputSuite() {
    await runCase('all-fields-unicode-spaces-and-codepoint-limits', async (page, record) => {
        record.limits = [];
        for (const [field, [id, limit, step]] of Object.entries(FIELDS)) {
            if (step) await goStep(page, step); else { await makeResult(page); await openDraft(page); }
            const exact = '𠮷'.repeat(limit); await page.locator(`#${id}`).fill(exact); await settle(page);
            assert.equal(await page.locator(`#${id}`).inputValue(), exact, `${field}: native input accepts ${limit} supplementary code points`);
            assert.equal((await saved(page)).formData[field], exact);
            const excessive = '  😀𠮷か\u3099' + '読'.repeat(limit) + '  ', expected = points(excessive).slice(0, limit).join('');
            await inputEvent(page, `#${id}`, excessive); await settle(page); assert.equal(await page.locator(`#${id}`).inputValue(), expected); assert.equal((await saved(page)).formData[field], expected);
            const value = field === 'draftText' ? '  文𠮷😀\n\n　か\u3099\n  ' : '  文𠮷😀か\u3099  ';
            await page.locator(`#${id}`).fill(value); await settle(page); assert.equal((await saved(page)).formData[field], value);
            const counter = field === 'draftText' ? '#draft-char-count' : `#${id}-char-count`; assert.equal(await page.locator(counter).textContent(), String(points(value).length));
            record.limits.push({ field, limit, exactSupplementaryCodePoints: points(exact).length, excessCodePoints: points(excessive).length, normalizedCodePoints: points(expected).length });
        }
    }, { storage: seeds(), observeStorage: true });
    for (const field of ['title', 'draftText']) await runCase(`ime-${field}-never-saves-or-trims-provisional-text`, async (page, record) => {
        const [id, limit] = FIELDS[field]; if (field === 'draftText') { await makeResult(page); await openDraft(page); }
        const before = await savedRaw(page), writesBefore = await page.evaluate(() => window.__bookE2EBoundary.writes.length), provisional = '  ' + '𠮷'.repeat(limit + 2) + '  ';
        await page.locator(`#${id}`).focus(); await compose(page, `#${id}`, provisional, 'start'); await settle(page, 800);
        assert.equal(await page.locator(`#${id}`).inputValue(), provisional, 'Active composition remains entirely untouched, including whitespace and overflow');
        assert.equal(await savedRaw(page), before, 'No provisional IME value reaches storage'); assert.equal(await page.evaluate(() => window.__bookE2EBoundary.writes.length), writesBefore);
        await compose(page, `#${id}`, provisional, 'end'); await settle(page, 800); const expected = points(provisional).slice(0, limit).join('');
        assert.equal(await page.locator(`#${id}`).inputValue(), expected); assert.equal((await saved(page)).formData[field], expected);
        record.evidence = { fixture: 'Standard DOM compositionstart/input(isComposing)/compositionend/input events; no OS IME installed in CI', beforeSHA256: sha256(before), committedCodePoints: points(expected).length };
    }, { storage: seeds(form(), 1), observeStorage: true });
    await runCase('literal-html-is-never-executed-in-results', async (page, record) => {
        await makeResult(page); assert.equal(await page.locator('#result-section img[src="x"],#result-section script').count(), 0);
        assert.ok((await page.locator('#body-scene-ref').textContent()).includes('<img src=x onerror=alert(1)>'));
        await openDraft(page); assert.equal(await page.locator('#draft-textarea').inputValue(), '<script>alert(1)</script>'); record.literalText = await page.locator('#body-scene-ref').textContent();
    }, { storage: seeds(form({ title: '<img src=x onerror=alert(1)>', sceneDesc: '<img src=x onerror=alert(1)>', draftText: '<script>alert(1)</script>' })) });
}
async function storageSuite() {
    const slotData = [1, 2, 3].map(slot => form({ title: `  本棚 ${slot} 𠮷😀  `, draftText: `  下書き ${slot}\n\n　𠮷😀か\u3099\n  ` }));
    const allSlots = { [ACTIVE]: '1', unrelatedApplication: 'leave-me-alone', ...Object.fromEntries(slotData.flatMap((data, index) => [[PREFIX + (index + 1), stored(data)], [`bookReportSupportGrade_slot_${index + 1}`, ['low', 'middle', 'high'][index]]])) };
    await runCase('slots-one-two-three-preserve-drafts-and-last-keystroke', async (page, record, current) => {
        await assertForm(page, slotData[0]); const originals = [await savedRaw(page, 1), await savedRaw(page, 2), await savedRaw(page, 3)];
        const edited = '  切替直前𠮷😀  '; await page.locator('#book-title').fill(edited); await page.locator('#slot-tab-2').click(); await settle(page, 800);
        assert.equal(await page.locator('#slot-tab-2').getAttribute('aria-selected'), 'true'); await assertForm(page, slotData[1]);
        assert.equal((await saved(page, 1)).formData.title, edited, 'Pending edit is flushed to the old slot'); assert.equal((await saved(page, 1)).formData.draftText, slotData[0].draftText);
        for (const slot of [3, 1, 2]) {
            await page.locator(`#slot-tab-${slot}`).click(); await settle(page, 800); await assertForm(page, slot === 1 ? { ...slotData[0], title: edited } : slotData[slot - 1]);
            assert.equal(await page.locator('input[name="book-grade-support"]:checked').inputValue(), ['low', 'middle', 'high'][slot - 1]);
        }
        await ready(current, candidateUrl, { reload: true }); assert.equal(await page.locator('#slot-tab-2').getAttribute('aria-selected'), 'true'); await assertForm(page, slotData[1]);
        assert.equal(await page.evaluate(() => localStorage.getItem('unrelatedApplication')), 'leave-me-alone');
        for (const slot of [2, 3]) assert.deepEqual((await saved(page, slot)).formData, JSON.parse(originals[slot - 1]).formData, 'Visiting slots never erases their drafts');
        record.slots = await readBookStorage(page);
    }, { storage: allSlots, observeStorage: true });
    await runCase('pagehide-flush-and-real-navigation-preserve-last-input', async (page, record, current) => {
        const first = '  離れる直前の一文字𠮷😀  ';
        await page.locator('#book-title').evaluate((node, value) => { node.value = value; node.dispatchEvent(new InputEvent('input', { bubbles: true, data: value })); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); }, first);
        assert.equal((await saved(page)).formData.title, first, 'pagehide synchronously flushes pending text');
        const second = '  実際の移動直前𠮷😀  '; await page.locator('#book-title').fill(second); await ready(current, candidateUrl + '?navigation-check=1'); assert.equal(await page.locator('#book-title').inputValue(), second);
        await makeResult(page); await openDraft(page); const draft = '  下書きの最後𠮷😀\n  ';
        await page.locator('#draft-textarea').fill(draft); await ready(current, candidateUrl); assert.equal((await saved(page)).formData.draftText, draft);
        record.saved = await saved(page);
    }, { storage: seeds(form(), 1), observeStorage: true });
    await runCase('failed-reset-removal-protects-pending-draft-and-recovers', async (page, record, current) => {
        await makeResult(page); await openDraft(page); const original = await savedRaw(page), otherSlot = await savedRaw(page, 2);
        let navigations = 0; page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
        // 失敗と復旧はStorage境界だけで切り替え、削除失敗中はスロット書込も一時停止して未保存入力を保つ。
        await page.evaluate(key => { window.__bookE2EBoundary.storageFaults.writeKey = key; window.__bookE2EBoundary.storageFaults.removeKey = key; }, PREFIX + 1);
        const pending = '  削除が失敗しても守る下書き𠮷😀\n  最後の未保存文字  ';
        await page.locator('#draft-textarea').fill(pending); current.dialogPlan.push({ accept: true }); await page.locator('#reset-btn').click();
        assert.equal(await page.locator('#draft-textarea').inputValue(), pending, 'Failed reset retains the entire pending draft');
        assert.equal(await savedRaw(page), original, 'Failed remove never destroys the existing stored draft');
        record.failureToast = await page.locator('#toast-container').textContent(); assert.match(record.failureToast, /保存.*(?:でき|失敗)|(?:でき|失敗).*保存/);
        await settle(page, 750); assert.equal(await page.locator('#draft-textarea').inputValue(), pending); assert.equal(await savedRaw(page), original); assert.equal(navigations, 0, 'Failed reset does not reload away unsaved text');
        record.removalAttempts = await page.evaluate(() => window.__bookE2EBoundary.removals); assert.deepEqual(record.removalAttempts.map(({ key, failed }) => ({ key, failed })), [{ key: PREFIX + 1, failed: true }]);
        await page.evaluate(() => { window.__bookE2EBoundary.storageFaults.writeKey = null; window.__bookE2EBoundary.storageFaults.removeKey = null; window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); });
        assert.equal((await saved(page)).formData.draftText, pending, 'After storage recovers, lifecycle flush saves the original pending text without another input'); assert.equal(await savedRaw(page, 2), otherSlot);
        record.recovered = await saved(page); await ready(current, candidateUrl, { reload: true }); assert.equal(await page.locator('#draft-textarea').inputValue(), pending);
    }, { storage: { ...seeds(), [PREFIX + 2]: stored(form({ title: '別の本棚', draftText: '触らない下書き' })) }, observeStorage: true });
    for (const [name, raw] of [['corrupt-json', '{broken'], ['wrong-array', '[]'], ['wrong-form', JSON.stringify({ formData: 42, currentStep: 999 })]]) await runCase(`invalid-storage-${name}-read-only-on-load`, async (page, record) => {
        assert.equal(await savedRaw(page), raw, 'Unusable stored input is not overwritten on load'); assert.equal(await page.locator('#step-1').isVisible(), true);
        await page.locator('#book-title').fill('回復した本'); await settle(page); assert.equal((await saved(page)).formData.title, '回復した本'); record.initialRaw = raw;
    }, { storage: { [ACTIVE]: '1', [PREFIX + 1]: raw }, expectedConsole: [/Failed|JSON|保存|load|parse/] });
    for (const mode of ['denyStorage', 'writeFail']) await runCase(`storage-${mode}-complete-wizard-usable`, async (page, record) => {
        await page.locator('#book-title').fill('保存できない端末でも考える'); await settle(page); record.persistenceWarning = await page.locator('#toast-container').textContent(); assert.match(record.persistenceWarning, /保存.*(?:でき|失敗)|(?:でき|失敗).*保存/, 'Persistence failure is reported on first edit'); await goStep(page, 2);
        await page.locator('.option-card').filter({ has: page.locator('input[value="cover"]') }).click(); await goStep(page, 3);
        await page.locator('#scene-desc').fill('心に残った場面'); await goStep(page, 4); await page.locator('#conclusion-change').fill('自分でも行動したい'); await makeResult(page); await openDraft(page);
        await page.locator('#draft-textarea').fill('保存できない下書き𠮷😀'); await settle(page); assert.equal(await page.locator('#draft-textarea').inputValue(), '保存できない下書き𠮷😀');
        await page.locator('#share-btn').click(); assert.equal(decodeShare(await page.locator('#share-link-input').inputValue()).draftText, '保存できない下書き𠮷😀'); await page.keyboard.press('Escape');
        record.finalToasts = await page.locator('#toast-container').textContent();
    }, { [mode]: true, expectedConsole: [/Storage|portal settings|保存|Failed to save/] });
    await runCase('real-cross-tab-merge-keeps-pending-and-unrelated-fields', async (page, record, current) => {
        const other = await current.context.newPage(); current.observe(other); await ready(current, candidateUrl, { page: other });
        const expectedTitle = '  このタブの未保存タイトル𠮷  ', expectedAuthor = '  別タブで直した作者😀  ';
        await page.locator('#book-title').fill(expectedTitle);
        await other.evaluate(({ prefix, active, author }) => { const data = JSON.parse(localStorage.getItem(prefix + 1)); data.formData.author = author; data.savedAt = '2026-01-03T00:00:00.000Z'; localStorage.setItem(prefix + 1, JSON.stringify(data)); localStorage.setItem(active, '2'); }, { prefix: PREFIX, active: ACTIVE, author: expectedAuthor });
        await settle(page, 1000); assert.equal(await page.locator('#slot-tab-1').getAttribute('aria-selected'), 'true', 'Remote active-slot preference never changes this tab');
        assert.equal(await page.locator('#book-title').inputValue(), expectedTitle, 'Pending local field survives external update'); assert.equal(await page.locator('#book-author').inputValue(), expectedAuthor, 'Unrelated remote field is merged');
        const merged = await saved(page); assert.equal(merged.formData.title, expectedTitle); assert.equal(merged.formData.author, expectedAuthor); assert.equal(merged.formData.draftText, slotData[0].draftText);
        assert.equal(await savedRaw(page, 2), allSlots[PREFIX + 2]); assert.equal(await page.evaluate(() => localStorage.getItem('unrelatedApplication')), 'leave-me-alone');
        record.merged = merged; await other.close();
    }, { storage: allSlots, observeStorage: true });
    await runCase('same-slot-external-update-retains-step-and-draft', async (page, record, current) => {
        await goStep(page, 3); const other = await current.context.newPage(); current.observe(other); await ready(current, candidateUrl, { page: other });
        await other.evaluate(prefix => { const data = JSON.parse(localStorage.getItem(prefix + 1)); data.formData.author = '別タブの作者'; localStorage.setItem(prefix + 1, JSON.stringify(data)); }, PREFIX);
        await settle(page); assert.equal(await page.locator('#book-author').inputValue(), '別タブの作者'); assert.equal(await page.locator('#step-3').isVisible(), true); assert.equal(await page.locator('#draft-textarea').inputValue(), form().draftText);
        record.saved = await saved(page); await other.close();
    }, { storage: seeds(form(), 1) });
}

async function shareSuite() {
    await runCase('share-roundtrip-pending-draft-spaces-unicode', async (page, record) => {
        await makeResult(page); await openDraft(page); const value = '  共有直前の下書き𠮷😀\n\n　か\u3099\n  ';
        await page.locator('#draft-textarea').fill(value); await page.locator('#share-btn').click(); await page.locator('#share-modal[open]').waitFor();
        const url = await page.locator('#share-link-input').inputValue(), data = decodeShare(url); assert.equal(data.draftText, value); assert.equal(data.title, form().title); assert.equal(data.author, form().author); assert.equal(data.showResults, true);
        assert.equal((await saved(page)).formData.draftText, value, 'Share flushes pending draft before serializing');
        record.share = { urlLength: url.length, data, qr: await page.locator('#share-qrcode').textContent() };
        const receiver = await createCase(VIEWPORTS[1], { url });
        try { await ready(receiver); await assertForm(receiver.page, form({ draftText: value })); assert.equal((await saved(receiver.page)).formData.draftText, value); assert.equal(await receiver.page.locator('#result-section').isVisible(), true); assert.deepEqual(receiver.dialogs, [], 'Empty destination does not need overwrite confirmation'); assert.deepEqual(receiver.errors, []); }
        finally { await receiver.context.close(); }
    }, { storage: seeds(), clipboard: 'success' });
    for (const accept of [false, true]) await runCase(`shared-link-${accept ? 'confirmed-replace' : 'cancel-preserves-all-slots'}`, async (page, record, current) => {
        const incoming = form({ title: '  受け取った本𠮷😀  ', draftText: '  受け取った下書き\n𠮷😀\n  ' });
        const url = shareURL(candidateUrl, { ...incoming, currentStep: 3, showResults: false }); await ready(current, url);
        assert.equal(current.dialogs.length, 1); assert.equal(current.dialogs[0].type, 'confirm'); assert.match(current.dialogs[0].message, /上書|置き換|取り込|読み込/);
        assert.equal(await page.locator('#slot-tab-2').getAttribute('aria-selected'), 'true');
        assert.equal(await savedRaw(page, 1), current.options.storage[PREFIX + 1]); assert.equal(await savedRaw(page, 3), current.options.storage[PREFIX + 3]);
        if (accept) { await assertForm(page, incoming); assert.deepEqual((await saved(page, 2)).formData, incoming); assert.equal(await page.locator('#step-3').isVisible(), true); }
        else { await assertForm(page, form({ title: '自分の本棚2', draftText: '消さない下書き2' })); assert.equal(await savedRaw(page, 2), current.options.storage[PREFIX + 2]); }
        record.slots = await readBookStorage(page);
    }, { beforeReady: true, dialogPlan: [{ accept }], storage: { [ACTIVE]: '2', ...Object.fromEntries([1, 2, 3].map(slot => [PREFIX + slot, stored(form({ title: `自分の本棚${slot}`, draftText: `消さない下書き${slot}` }))])) } });
    await runCase('failed-shared-import-save-keeps-url-until-storage-recovers', async (page, record, current) => {
        const incoming = form({ title: '  保存を待つ共有の本𠮷😀  ', draftText: '  保存を待つ共有の下書き\n𠮷😀\n  ' });
        const url = shareURL(candidateUrl + '?keep=1#recovery', { ...incoming, currentStep: 1, showResults: false }); await ready(current, url);
        const encoded = new URL(url).searchParams.get('data'); assert.equal(new URL(page.url()).searchParams.get('data'), encoded, 'Failed import save retains the recovery payload in the address');
        assert.equal(current.dialogs.length, 1); assert.equal(current.dialogs[0].type, 'confirm'); await assertForm(page, incoming);
        assert.equal(await savedRaw(page, 2), current.options.storage[PREFIX + 2]); assert.equal(await savedRaw(page, 1), current.options.storage[PREFIX + 1]);
        // 通常の3秒の表示期限を過ぎても、保存失敗の警告と誤った成功通知の不存在を検証する。
        await page.waitForFunction(() => ![...document.querySelectorAll('#toast-container .toast')].some(toast => /保存.*(?:でき|失敗)|(?:でき|失敗).*保存/.test(toast.textContent)));
        record.failedToasts = await page.evaluate(() => window.__bookE2EBoundary.toasts.map(toast => toast.text).join('\n')); assert.match(record.failedToasts, /保存.*(?:でき|失敗)|(?:でき|失敗).*保存/); assert.doesNotMatch(record.failedToasts, /共有された感想文データを読み込みました/, 'No import success toast precedes successful persistence');
        await page.evaluate(() => { window.__bookE2EBoundary.storageFaults.write = false; });
        const recoveredTitle = incoming.title + '追記'; await page.locator('#book-title').fill(recoveredTitle); await settle(page, 750);
        assert.deepEqual((await saved(page, 2)).formData, { ...incoming, title: recoveredTitle }, 'Recovery saves imported fields without mixing the prior local draft');
        assert.equal(new URL(page.url()).searchParams.has('data'), false, 'Only successful save removes the recovery payload'); assert.equal(new URL(page.url()).searchParams.get('keep'), '1'); assert.equal(new URL(page.url()).hash, '#recovery');
        assert.equal(await savedRaw(page, 1), current.options.storage[PREFIX + 1]); assert.equal(current.dialogs.length, 1, 'Accepted import is not confirmed a second time during save recovery');
        record.recovered = await saved(page, 2); record.recoveredUrl = page.url(); await ready(current, candidateUrl, { reload: true }); await assertForm(page, { ...incoming, title: recoveredTitle });
    }, { beforeReady: true, dialogPlan: [{ accept: true }], writeFail: true, observeToasts: true, storage: { [ACTIVE]: '2', [PREFIX + 1]: stored(form({ title: '触らない本棚1' })), [PREFIX + 2]: stored(form({ title: '元の本棚2', draftText: '元の本棚2の下書き' })) } });
    for (const [name, data] of [['malformed-base64', '%%%not-valid'], ['array', []], ['null', null], ['boolean', true], ['string', 'unexpected']]) await runCase(`invalid-url-${name}-never-overwrites-work`, async (page, record, current) => {
        const url = name === 'malformed-base64' ? candidateUrl + '?data=' + encodeURIComponent(data) : shareURL(candidateUrl, data); await ready(current, url);
        assert.equal(await savedRaw(page), current.options.storage[PREFIX + 1]); await assertForm(page, form()); assert.equal(current.dialogs.length, 0); record.slots = await readBookStorage(page);
    }, { beforeReady: true, storage: seeds(form(), 1), observeStorage: true, expectedConsole: [/デシリアライズ|URL|JSON|Invalid|decode|base64/] });
    await runCase('shared-enums-step-and-text-normalized-without-injection', async (page, record, current) => {
        const hostile = { ...form(), title: '𠮷'.repeat(81), author: 42, genre: '"><img src=x onerror=alert(1)>', motivation: 'unrecognized', sceneFeeling: { no: 'string' }, selectedOpening: 'nonexistent', currentStep: 999999, showResults: 'true', __unexpected: 'ignored' };
        await ready(current, shareURL(candidateUrl, hostile)); assert.equal(await page.locator('#book-title').inputValue(), '𠮷'.repeat(80)); assert.equal(await page.locator('#book-author').inputValue(), '');
        assert.equal(await page.locator('input[name="genre"]:checked').inputValue(), 'story'); assert.equal(await page.locator('#step-1').isVisible(), true); assert.equal(await page.locator('#result-section').isVisible(), false);
        assert.equal(await page.locator('img[src="x"]').count(), 0); const data = await saved(page); assert.equal(data.formData.selectedOpening, 'opening-a'); assert.equal(data.formData.__unexpected, undefined); assert.equal(data.currentStep, 1); record.saved = data;
    }, { beforeReady: true, expectedConsole: [/URL|Invalid/] });
    await runCase('max-draft-share-long-link-preserves-all-codepoints', async (page, record) => {
        await makeResult(page); await page.locator('#share-btn').click(); const url = await page.locator('#share-link-input').inputValue(), data = decodeShare(url);
        assert.equal(data.draftText, '𠮷'.repeat(5000)); assert.equal(points(data.draftText).length, 5000); assert.match(await page.locator('#share-qrcode').textContent(), /QR|文字数|長/);
        record.share = { urlLength: url.length, codePoints: points(data.draftText).length, sha256: sha256(url), qrFallback: await page.locator('#share-qrcode').textContent() };
    }, { storage: seeds(form({ draftText: '𠮷'.repeat(5000) })) });
}
async function dialogsSuite() {
    await runCase('parents-dialog-escape-focus-and-aria-repeated', async (page, record) => {
        const trigger = '[data-action="parents-modal-open"]';
        for (let repeat = 0; repeat < 3; repeat++) {
            await page.locator(trigger).click(); await page.locator('#parents-modal[open]').waitFor(); assert.equal(await page.locator(trigger).getAttribute('aria-expanded'), 'true');
            await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.closest('#parents-modal') !== null), true);
            await page.keyboard.press('Escape'); await eventually(() => page.locator('#parents-modal').evaluate(node => node.open), false, 'Escape closes parent dialog'); await eventually(() => page.locator(trigger).getAttribute('aria-expanded'), 'false', 'Queued native close event updates expanded state'); await focusIs(page, trigger);
        }
        record.focus = await page.evaluate(() => document.activeElement.getAttribute('data-action'));
    });
    await runCase('share-dialog-escape-focus-close-button', async (page, record) => {
        await makeResult(page);
        for (const close of ['escape', 'button']) { await page.locator('#share-btn').click(); await page.locator('#share-modal[open]').waitFor(); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.closest('#share-modal') !== null), true); if (close === 'escape') await page.keyboard.press('Escape'); else await page.locator('#share-modal-close').click(); await eventually(() => page.locator('#share-modal').evaluate(node => node.open), false, 'Share closes'); await focusIs(page, '#share-btn'); }
        record.saved = await saved(page);
    }, { storage: seeds() });
    await runCase('gacha-interrupted-repeated-focus-trap-no-stale-timers', async (page, record) => {
        const trigger = '.gacha-trigger-btn[data-target="book-synopsis"]', before = await page.locator('#synopsis-part-a').inputValue(); record.cycles = [];
        for (let cycle = 0; cycle < 4; cycle++) {
            await page.locator(trigger).click(); await page.locator('#gacha-modal').waitFor({ state: 'visible' }); assert.equal(await page.locator('#gacha-close-btn').isEnabled(), true, 'Spinner always permits cancellation');
            await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.closest('#gacha-modal') !== null), true, 'Gacha traps forward Tab');
            await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.closest('#gacha-modal') !== null), true, 'Gacha traps reverse Tab');
            if (cycle % 2) await page.locator('#gacha-close-btn').click(); else await page.keyboard.press('Escape');
            await page.locator('#gacha-modal').waitFor({ state: 'hidden' }); await focusIs(page, trigger); record.cycles.push({ cycle, close: cycle % 2 ? 'button' : 'Escape' });
        }
        await page.locator(trigger).click(); await settle(page, 1500); assert.equal(await page.locator('#gacha-modal').isVisible(), true, 'Old close/roll timers cannot close the new session');
        assert.match(await page.locator('#gacha-question').textContent(), /自分|聞|問/); assert.equal(await page.locator('#gacha-apply-btn').isEnabled(), true);
        await page.locator('#gacha-reroll-btn').click(); await page.keyboard.press('Escape'); await page.locator('#gacha-modal').waitFor({ state: 'hidden' }); await settle(page, 1500); assert.equal(await page.locator('#gacha-modal').isVisible(), false, 'Cancelled reroll never reopens modal');
        await page.locator(trigger).click(); await settle(page, 1500); await page.locator('#gacha-apply-btn').click(); await page.locator('#gacha-modal').waitFor({ state: 'hidden' }); await settle(page, 350);
        assert.equal(await page.locator('#synopsis-part-a').inputValue(), before, 'Thinking gacha asks a question without overwriting the child’s writing'); await focusIs(page, '#synopsis-part-a');
        await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.closest('#gacha-modal') !== null), false, 'Closed gacha leaves no stale focus trap');
        await screenshot(page, 'gacha-complete');
    }, { storage: seeds(form(), 1), motion: 'no-preference' });
}
async function clipboardAndDownloadSuite() {
    for (const mode of ['success', 'failure', 'fallback-success']) await runCase(`copy-${mode}-reports-truthfully`, async (page, record) => {
        await makeResult(page);
        if (mode !== 'fallback-success') {
            await page.locator('[data-copy-target="opening-c"]').click(); await settle(page, 80);
            let message = await page.locator('#toast-container .toast').last().textContent(); assert.match(message, mode === 'success' ? /コピーしました/ : /コピーでき|コピー.*失敗/);
            await page.locator('#copy-all-btn').click(); await settle(page, 80); message = await page.locator('#toast-container .toast').last().textContent(); assert.match(message, mode === 'success' ? /コピーしました/ : /コピーでき|コピー.*失敗/);
            const copies = await page.evaluate(() => window.__bookE2EBoundary.clipboard); assert.ok(copies.at(-1).includes(form().title)); assert.ok(copies.at(-1).includes(form().sceneDesc.trim())); assert.ok(copies.at(-1).includes(form().conclusionChange.trim()));
        }
        await page.locator('#share-btn').click(); const link = await page.locator('#share-link-input').inputValue(); await page.locator('#share-copy-btn').click(); await settle(page, 100);
        const message = await page.locator('#toast-container .toast').last().textContent(); assert.match(message, mode === 'failure' ? /コピーでき|コピー.*失敗/ : /コピーしました/);
        const observed = await page.evaluate(() => window.__bookE2EBoundary); assert.equal(observed.clipboard.at(-1), link); if (mode !== 'success') assert.ok(observed.fallbackCopies > 0, 'Clipboard denial exercises fallback result');
        record.clipboard = { ...observed, finalToast: message };
    }, { storage: seeds(), clipboard: mode === 'failure' ? 'failure' : mode, expectedConsole: [/Copy|Clipboard|コピー/] });
    await runCase('actual-download-valid-utf8-safe-filename-complete-memo', async (page, record) => {
        await makeResult(page); const downloadEvent = page.waitForEvent('download'); await page.locator('#download-text-btn').click(); const download = await downloadEvent;
        assert.equal(await download.failure(), null); const filename = download.suggestedFilename(); assert.match(filename, /\.txt$/); assert.doesNotMatch(filename, /[\\/:*?"<>|]/);
        const target = path.join(artifactDir, 'downloaded-book-report.txt'); await download.saveAs(target); const bytes = await readFile(target), text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        for (const value of [form().sceneDesc.trim(), form().sceneMyself.trim(), form().conclusionChange.trim(), '𠮷😀']) assert.ok(text.includes(value), `Actual downloaded UTF-8 contains ${value}`);
        assert.ok(text.includes('本/名:題*?"<>|𠮷😀')); assert.ok(text.includes(await page.locator('#opening-b').innerText()));
        record.download = { suggestedFilename: filename, bytes: bytes.length, sha256: sha256(bytes), text };
    }, { storage: seeds(form({ title: '本/名:題*?"<>|𠮷😀' })) });
}
async function performanceSuite() {
    async function measure(current) {
        const page = current.page; await makeResult(page); await openDraft(page); await settle(page);
        const before = await page.evaluate(() => window.__bookE2EBoundary.writes.length);
        await page.locator('#draft-textarea').evaluate(node => { for (let i = 1; i <= 60; i++) { node.value = '文'.repeat(i); node.dispatchEvent(new InputEvent('input', { bubbles: true, data: '文', inputType: 'insertText' })); } });
        await settle(page, 900); const writes = await page.evaluate(index => window.__bookE2EBoundary.writes.slice(index), before);
        assert.equal(await page.locator('#draft-textarea').inputValue(), '文'.repeat(60)); assert.equal((await saved(page)).formData.draftText, '文'.repeat(60));
        const beforeNoop = await page.evaluate(() => window.__bookE2EBoundary.writes.length); await inputEvent(page, '#draft-textarea', '文'.repeat(60)); await settle(page, 900);
        return { events: 60, writes, totalWrites: writes.length, slotWrites: writes.filter(write => write.key === PREFIX + 1).length, noOpWrites: (await page.evaluate(() => window.__bookE2EBoundary.writes.length)) - beforeNoop };
    }
    await runCase('measured-draft-burst-bounds-storage-writes-without-regression', async (page, record, current) => {
        record.candidate = await measure(current);
        if (baselineUrl) { const baseline = await createCase(VIEWPORTS[1], { url: baselineUrl, observeStorage: true, storage: seeds() }); try { await ready(baseline); record.baseline = await measure(baseline); } finally { await baseline.context.close(); } }
        await writeJSON('storage-write-performance.json', record);
        assert.ok(record.candidate.slotWrites <= 2, `60 draft inputs need <=2 slot writes; observed ${record.candidate.slotWrites}`); assert.ok(record.candidate.totalWrites <= 3, 'Active-slot preference is not rewritten for every keystroke');
        assert.equal(record.candidate.noOpWrites, 0, 'Unchanged input creates no redundant persistence');
        // 最適化済みの基準にも同じ上限を守る。毎回の公開で追加の削減を要求しない。
        if (record.baseline) assert.ok(record.candidate.totalWrites <= record.baseline.totalWrites, 'Measured candidate never increases writes over immutable baseline');
    }, { storage: seeds(), observeStorage: true });
}

// CSS予測ではなく、Chromium出力PDFのページ辞書、Popplerの字形座標、全ページの実画像を検査する。
function inspectPDF(bytes) {
    const source = bytes.toString('latin1'); assert.ok(source.startsWith('%PDF-'));
    const objects = new Map([...source.matchAll(/(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/g)].map(match => [`${match[1]} ${match[2]}`, match[3]]));
    const pages = [...objects.entries()].filter(([, object]) => /\/Type\s*\/Page\b/.test(object)); assert.ok(pages.length > 0, 'Actual PDF page objects readable');
    const mediaBox = (object, seen = new Set()) => {
        const direct = /\/MediaBox\s*\[([^\]]+)\]/.exec(object); if (direct) return direct[1].trim().split(/\s+/).map(Number);
        const indirect = /\/MediaBox\s+(\d+)\s+(\d+)\s+R/.exec(object); if (indirect) { const array = objects.get(`${indirect[1]} ${indirect[2]}`)?.match(/\[([^\]]+)\]/); if (array) return array[1].trim().split(/\s+/).map(Number); }
        const parent = /\/Parent\s+(\d+)\s+(\d+)\s+R/.exec(object), key = parent && `${parent[1]} ${parent[2]}`;
        assert.ok(key && !seen.has(key) && objects.has(key), 'Every PDF page resolves finite MediaBox'); seen.add(key); return mediaBox(objects.get(key), seen);
    };
    return { bytes: bytes.length, sha256: sha256(bytes), pageCount: pages.length, pages: pages.map(([object, body]) => { const box = mediaBox(body); assert.equal(box.length, 4); assert.ok(box.every(Number.isFinite)); return { object, mediaBox: box, widthPoints: box[2] - box[0], heightPoints: box[3] - box[1] }; }) };
}
const unxml = value => value.replace(/&(?:#(x[\da-f]+|\d+)|lt|gt|amp|quot|apos);/gi, (entity, number) => number ? String.fromCodePoint(number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number)) : ({ '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&apos;': "'" }[entity] || entity));
const normalizedText = value => value.replace(/\s+/gu, '');
function bboxPages(source) {
    return [...source.matchAll(/<page\s+([^>]+)>([\s\S]*?)<\/page>/g)].map(match => {
        const attributes = text => Object.fromEntries([...text.matchAll(/([\w]+)="([^"]*)"/g)].map(item => [item[1], Number(item[2])]));
        return { ...attributes(match[1]), words: [...match[2].matchAll(/<word\s+([^>]+)>([\s\S]*?)<\/word>/g)].map(word => ({ ...attributes(word[1]), value: unxml(word[2]) })) };
    });
}
async function pdfArtifacts(page, name, record, { expectedDraft, baseline = false, expectMemo = true } = {}) {
    const pdfPath = path.join(artifactDir, `${name}.pdf`), bboxPath = path.join(artifactDir, `${name}-bbox.xhtml`), textPath = path.join(artifactDir, `${name}.txt`);
    const bytes = await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false }); const pdf = inspectPDF(bytes);
    (record.pdf ||= []).push({ name, ...pdf }); await writeJSON(`${name}-pdf.json`, pdf);
    await runTool('pdftotext', ['-bbox-layout', '-enc', 'UTF-8', pdfPath, bboxPath], { timeout: 60_000 }); await runTool('pdftotext', ['-layout', '-enc', 'UTF-8', pdfPath, textPath], { timeout: 60_000 });
    const fontOutput = await runTool('pdffonts', [pdfPath], { timeout: 60_000 }); await writeFile(path.join(artifactDir, `${name}-fonts.txt`), fontOutput.stdout);
    const xml = await readFile(bboxPath, 'utf8'), text = await readFile(textPath, 'utf8'), pages = bboxPages(xml); assert.equal(pages.length, pdf.pageCount, 'Poppler independently confirms actual PDF page count');
    await runTool('pdftoppm', ['-r', '96', '-png', pdfPath, path.join(artifactDir, `${name}-page`)], { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
    const files = (await readdir(artifactDir)).filter(file => file.startsWith(`${name}-page-`) && file.endsWith('.png')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); assert.equal(files.length, pages.length, 'Every PDF page has its own raster');
    pdf.bbox = pages; pdf.textSHA256 = sha256(text); pdf.raster = [];
    for (let index = 0; index < files.length; index++) {
        const raster = await readFile(path.join(artifactDir, files[index])), decoded = decodePNG(raster); let inkPixels = 0, whitePixels = 0, minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
        for (let pixel = 0; pixel < decoded.width * decoded.height; pixel++) {
            const channels = decoded.rgba.subarray(pixel * 4, pixel * 4 + 3); if (channels.every(channel => channel >= 245)) whitePixels++;
            if (channels.some(channel => channel < 220)) { inkPixels++; const x = pixel % decoded.width, y = Math.floor(pixel / decoded.width); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        }
        pdf.raster.push({ file: files[index], bytes: raster.length, sha256: sha256(raster), width: decoded.width, height: decoded.height, inkPixels, whiteFraction: whitePixels / (decoded.width * decoded.height), inkBounds: { minX, minY, maxX, maxY } });
    }
    await writeJSON(`${name}-pdf.json`, pdf); Object.assign(record.pdf.at(-1), pdf);
    if (!baseline) {
        assert.ok(pdf.pageCount >= 1 && pdf.pageCount <= 12, 'Complete A4 memo uses 1–12 real pages, not runaway or blank overflow');
        for (let index = 0; index < pages.length; index++) {
            const physical = pdf.pages[index], printed = pages[index], raster = pdf.raster[index];
            assert.ok(Math.abs(physical.widthPoints - 595.28) < 1 && Math.abs(physical.heightPoints - 841.89) < 1, `Page ${index + 1} is physically A4 portrait`);
            assert.ok(printed.words.length >= 1, `Page ${index + 1} is not an empty trailing/overflow page`);
            for (const word of printed.words) assert.ok([word.xMin, word.xMax, word.yMin, word.yMax].every(Number.isFinite) && word.xMin >= -.5 && word.yMin >= -.5 && word.xMax <= physical.widthPoints + .5 && word.yMax <= physical.heightPoints + .5, `Page ${index + 1} glyph stays on physical paper: ${JSON.stringify(word)}`);
            assert.ok(raster.inkPixels > 40, `Page ${index + 1} has visible raster content`); assert.ok(raster.whiteFraction > .5, `Page ${index + 1} is predominantly white, including dark mode`);
            assert.ok(raster.inkBounds.minX > 1 && raster.inkBounds.minY > 1 && raster.inkBounds.maxX < raster.width - 2 && raster.inkBounds.maxY < raster.height - 2, `Page ${index + 1} ink does not hit physical paper edges`);
        }
        if (expectedDraft) assert.ok(normalizedText(text).includes(normalizedText(expectedDraft)), 'Actual PDF contains the complete draft, including its final characters, across page breaks');
        for (const expected of (expectMemo ? [form().sceneDesc.trim().replace(/[𠮷😀]/gu, ''), form().conclusionChange.trim()] : [])) assert.ok(normalizedText(text).includes(normalizedText(expected)), `Actual PDF contains readable Japanese memo: ${expected}`);
        assert.doesNotMatch(text, /保護者の方へ|構成メモを共有する|自分に聞いてみよう！|この質問を考える！|シャッフル中|共有された感想文データ/, 'Open dialogs and toasts are absent from actual PDF text');
    }
    return pdf;
}
async function printSuite() {
    const shortDraft = '印刷はじめ\n\n　自分の言葉で読みながら考えたことを書く。\n最後まで印刷できた。';
    const end = '\n印刷の最後まで届いた';
    const longDraft = '印刷はじめ\n' + '読んで考えて自分の言葉で書く。'.repeat(400).slice(0, 5000 - points('印刷はじめ\n').length - points(end).length) + end;
    assert.equal(points(longDraft).length, 5000);
    for (const [kind, draft] of [['short', shortDraft], ['maximum5000', longDraft]]) for (const dark of [false, true]) await runCase(`actual-a4-${kind}-${dark ? 'dark' : 'light'}`, async (page, record) => {
        await makeResult(page); assert.equal(await page.locator('#draft-details').evaluate(node => node.open), false, 'Print starts with normally closed details');
        const before = await page.locator('#draft-textarea').inputValue(); assert.equal(before, draft);
        const name = `pdf-${kind}-${dark ? 'dark' : 'light'}`; record.print = await pdfArtifacts(page, name, record, { expectedDraft: draft });
        assert.equal(await page.locator('#draft-details').evaluate(node => node.open), false, 'afterprint restores the original details state'); assert.equal(await page.locator('#draft-textarea').inputValue(), before);
        await page.emulateMedia({ media: 'print' }); record.computedPrint = await page.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, draft: getComputedStyle(document.querySelector('#print-draft-view')).color, timelineMarkers: [...document.querySelectorAll('.timeline-item')].map(node => getComputedStyle(node, '::before').display), modals: [...document.querySelectorAll('dialog,#gacha-modal')].map(node => ({ id: node.id, display: getComputedStyle(node).display })) }));
        assert.equal(record.computedPrint.body, 'rgb(255, 255, 255)'); assert.ok(record.computedPrint.timelineMarkers.length > 0); for (const display of record.computedPrint.timelineMarkers) assert.equal(display, 'none', 'Decorative timeline pseudo-circles never paint over printed headings'); for (const modal of record.computedPrint.modals) assert.equal(modal.display, 'none', `${modal.id} excluded from print`);
        await screenshot(page, `${name}-print-media`); await page.emulateMedia({ media: 'screen' });
    }, { storage: { ...seeds(form({ draftText: draft })), ...(dark ? { [PROFILE]: JSON.stringify({ darkMode: true, reduceMotion: false }) } : {}) } }, VIEWPORTS[3]);
    for (const dialog of ['parents', 'share', 'gacha']) await runCase(`actual-a4-open-${dialog}-dialog-excluded`, async (page, record) => {
        await makeResult(page);
        if (dialog === 'parents') await page.locator('[data-action="parents-modal-open"]').click();
        else if (dialog === 'share') await page.locator('#share-btn').click();
        else {
            // 結果画面ではガチャ入口が隠れているため、結果を生成した後の再訪で通常ウィザードから開く。
            await page.reload({ waitUntil: 'load' }); await page.locator('#book-grade-support').waitFor(); await settle(page); await page.locator('.gacha-trigger-btn[data-target="book-synopsis"]').click(); await settle(page, 1500);
        }
        await screenshot(page, `print-open-${dialog}-screen`);
        if (dialog === 'gacha') {
            const pdf = await pdfArtifacts(page, `pdf-open-${dialog}-dark`, record, { expectMemo: false });
            const pdfText = await readFile(path.join(artifactDir, `pdf-open-${dialog}-dark.txt`), 'utf8'); assert.doesNotMatch(pdfText, /自分に聞いてみよう！|この質問を考える！|シャッフル中/); assert.ok(pdf.pageCount > 0);
        } else await pdfArtifacts(page, `pdf-open-${dialog}-dark`, record, { expectedDraft: shortDraft });
        await page.emulateMedia({ media: 'print' }); assert.equal(await page.locator(dialog === 'parents' ? '#parents-modal' : dialog === 'share' ? '#share-modal' : '#gacha-modal').evaluate(node => getComputedStyle(node).display), 'none');
        await page.emulateMedia({ media: 'screen' }); await page.keyboard.press('Escape');
    }, { storage: { ...seeds(form({ draftText: shortDraft })), [PROFILE]: JSON.stringify({ darkMode: true }) } }, VIEWPORTS[3]);
    await runCase('real-pdf-and-print-buttons-flush-pending-draft', async (page, record) => {
        await makeResult(page); await openDraft(page); const first = '印刷はじめ\n直前の変更が印刷まで届いた。'; await page.locator('#draft-textarea').fill(first);
        await pdfArtifacts(page, 'pdf-pending-draft', record, { expectedDraft: first }); assert.equal((await saved(page)).formData.draftText, first, 'Real beforeprint flushes pending draft');
        assert.equal(await page.locator('#draft-details').evaluate(node => node.open), true, 'Open editor remains open afterprint');
        for (const selector of ['#print-btn', '#big-print-pdf-btn']) { const value = `印刷ボタン ${selector} 直前𠮷😀`; await page.locator('#draft-textarea').fill(value); await page.locator(selector).click(); const observed = await page.evaluate(() => window.__bookE2EBoundary.prints.at(-1)); assert.equal(observed.draft, value); assert.equal(JSON.parse(observed.slots[0]).formData.draftText, value); }
        record.printCalls = await page.evaluate(() => window.__bookE2EBoundary.prints);
    }, { storage: seeds(), observePrint: true }, VIEWPORTS[3]);
    if (baselineUrl) for (const [kind, draft] of [['short', shortDraft], ['maximum5000', longDraft]]) await runCase(`baseline-real-a4-${kind}-comparison-evidence`, async (page, record) => {
        await makeResult(page); const name = `pdf-${kind}-baseline`; record.baseline = await pdfArtifacts(page, name, record, { baseline: true });
        const metrics = `${name}-comparison.json`; await writeJSON(metrics, { baseline: record.baseline, candidate: `pdf-${kind}-light-pdf.json`, note: 'Baseline defects are preserved as comparison evidence, never accepted as candidate expected behavior. All physical pages are rasterized.' });
        const candidatePDF = await readFile(path.join(artifactDir, `pdf-${kind}-light-pdf.json`), 'utf8').then(JSON.parse).catch(() => null);
        if (candidatePDF?.raster?.[0]) imagePairs.push({ name: `Actual A4 ${kind}; all pages linked`, before: record.baseline.raster[0]?.file || null, after: candidatePDF.raster[0].file, metrics });
    }, { url: baselineUrl, storage: seeds(form({ draftText: draft })) }, VIEWPORTS[3]);
}

async function nativeSuite() {
    for (const viewport of VIEWPORTS) await runCase(`native-first-and-reload-${viewport.width}`, async (page, record, current) => {
        record.loads = [];
        for (let pass = 0; pass < 2; pass++) {
            if (pass) await ready(current, candidateUrl, { reload: true });
            const metrics = await layoutMetrics(page); requireFonts(metrics); await noOverflow(page, record); record.loads.push(metrics);
            assert.equal(await savedRaw(page), null, 'Untouched actual browser first/reload never creates stored work'); assert.equal(await page.locator('#step-1').isVisible(), true);
            await screenshot(page, `native-${viewport.width}-${pass ? 'reload' : 'first'}`);
        }
        record.serviceWorker = await page.evaluate(() => ({ supported: 'serviceWorker' in navigator, controller: navigator.serviceWorker?.controller?.scriptURL || null }));
        record.method = 'Fresh browser; original network fonts/service workers; no route, init script, storage fixture, clock or browser API replacement';
    }, { native: true }, viewport);
}
async function productionSuite() {
    const url = new URL(productionUrl); assert.equal(url.protocol, 'https:'); assert.equal(url.search, ''); assert.equal(url.hash, ''); assert.ok(url.pathname.endsWith('/book_report/'), 'Use the normal unmodified canonical Book Report URL');
    const publicRoot = new URL('../', url), expected = manifests.get('candidate').manifest, expectedByPath = new Map(expected.files.map(entry => [entry.path, entry]));
    for (const viewport of VIEWPORTS) await runCase(`production-native-first-reload-${viewport.width}`, async (page, record, current) => {
        const reference = await createCase(viewport, { native: true }); let local;
        try { await ready(reference); local = await layoutMetrics(reference.page); requireFonts(local); } finally { await reference.context.close(); }
        record.loads = [];
        for (let pass = 0; pass < 2; pass++) {
            const pending = [], received = new Map(), captureErrors = [];
            const listener = response => {
                const address = new URL(response.url()); if (address.origin !== publicRoot.origin || !address.pathname.startsWith(publicRoot.pathname)) return;
                let relative = decodeURIComponent(address.pathname.slice(publicRoot.pathname.length)); if (relative.endsWith('/')) relative += 'index.html';
                const target = expectedByPath.get(relative); if (!target || !/\.(?:html|m?js|css)$/.test(relative)) return;
                pending.push((async () => { try { const bytes = await response.body(); received.set(relative, { path: relative, status: response.status(), bytes: bytes.length, sha256: sha256(bytes), expectedSHA256: target.sha256, fromServiceWorker: response.fromServiceWorker(), url: response.url() }); } catch (error) { captureErrors.push({ path: relative, error: error.message }); } })());
            };
            page.on('response', listener);
            try {
                await ready(current, url.href, { reload: pass > 0 });
                assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href'), page.url()).href, url.href, 'First/reload use the public canonical URL');
                const references = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(node => node.src || node.href)); await Promise.all(pending);
                const required = new Set(['book_report/index.html', 'book_report/script.js', 'book_report/script-core.js', 'book_report/summer-support.js', ...references.filter(value => value.startsWith(publicRoot.href)).map(value => decodeURIComponent(new URL(value).pathname.slice(publicRoot.pathname.length))), ...expected.files.filter(entry => entry.path.endsWith('.css')).map(entry => entry.path)]);
                const metrics = await layoutMetrics(page); requireFonts(metrics); await noOverflow(page, record);
                const load = { pass: pass ? 'reload' : 'first', url: page.url(), assets: [...received.values()], required: [...required], captureErrors, metrics }; record.loads.push(load); await writeJSON(`production-${viewport.width}-loads.json`, record.loads);
                for (const relative of required) {
                    assert.ok(expectedByPath.has(relative), `${relative}: deployed asset belongs to immutable final candidate`); const actual = received.get(relative);
                    assert.ok(actual, `${relative}: actual navigation/reload fetched response bytes`); assert.equal(actual.status, 200); assert.equal(actual.sha256, expectedByPath.get(relative).sha256, `${relative}: deployed SHA256 matches candidate`);
                }
                assert.deepEqual(captureErrors, []); assert.deepEqual(comparable(metrics), comparable(local), 'Live visible copy, controls and computed layout match final immutable build');
                assert.equal(await savedRaw(page), null, 'Read-only production first/reload creates no book/draft'); await screenshot(page, `production-${viewport.width}-${pass ? 'reload' : 'first'}`);
            } finally { page.off('response', listener); }
        }
        await page.locator('[data-action="parents-modal-open"]').click(); await page.keyboard.press('Escape'); await eventually(() => page.locator('[data-action="parents-modal-open"]').getAttribute('aria-expanded'), 'false', 'Live native dialog Escape updates aria');
        await focusIs(page, '[data-action="parents-modal-open"]'); assert.equal(await savedRaw(page), null);
        record.method = 'Fresh context per width, untouched HTTPS canonical URL first/reload, real fonts/service workers, actual browser response SHA256 plus DOM/style comparison. No routing, seeding, clock, init script, edits, imports or persistent production mutation.';
    }, { native: true, beforeReady: true, url: url.href }, viewport);
}
async function gallery() {
    const files = await readdir(artifactDir), images = files.filter(name => name.endsWith('.png')).sort(), pdfs = files.filter(name => name.endsWith('.pdf')).sort();
    await writeJSON('image-review-manifest.json', { pairs: imagePairs, note: 'Initial PNG decoded pixels and geometry are compared exactly. Actual PDF pages are rendered and glyph bounds inspected. These automated checks and evidence do not claim a human visual review.' });
    await writeFile(path.join(artifactDir, 'index.htm'), `<!doctype html><html lang="ja"><meta charset="utf-8"><title>読書感想文 実ビルド検証</title><style>body{font-family:system-ui;margin:24px;background:#e2e8f0;color:#0f172a}section{padding:16px;background:white;margin:24px 0;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{max-width:100%;border:1px solid #94a3b8}figure{margin:0;min-width:0}.overlay{position:relative}.overlay img+img{position:absolute;left:0;top:0;opacity:.5}pre{white-space:pre-wrap}</style><h1>読書感想文 実ビルド検証</h1><p>初期画面は4幅でピクセル・寸法・表示文言を完全比較。印刷は実PDFの全ページ、実寸法、字形座標、全文保存を検査します。実行詳細は <a href="results.json">results.json</a>、集計は <a href="summary.json">summary.json</a>。</p>${imagePairs.map(pair => `<section><h2>${escapeHTML(pair.name)}</h2><a href="${escapeHTML(pair.metrics)}">比較JSON</a><div class="pair"><figure>${pair.before ? `<img loading="lazy" src="${escapeHTML(pair.before)}">` : '<p>基準未指定</p>'}</figure><figure><img loading="lazy" src="${escapeHTML(pair.after)}"></figure></div>${pair.before ? `<details><summary>50%重ね合わせ</summary><div class="overlay"><img loading="lazy" src="${escapeHTML(pair.before)}"><img loading="lazy" src="${escapeHTML(pair.after)}"></div></details>` : ''}</section>`).join('')}<h2>実印刷PDF</h2><ul>${pdfs.map(name => `<li><a href="${escapeHTML(name)}">${escapeHTML(name)}</a> · <a href="${escapeHTML(name.replace(/\.pdf$/, '-pdf.json'))}">ページ・字形・画像の実測</a></li>`).join('')}</ul><h2>実画面とPDF全ページ</h2>${images.map(name => `<details><summary>${escapeHTML(name)}</summary><img loading="lazy" src="${escapeHTML(name)}"></details>`).join('')}<h2>ケース別結果</h2>${results.map(result => `<section><h3>${escapeHTML(result.name)}: ${result.status}</h3>${result.error ? `<pre>${escapeHTML(result.error)}</pre>` : ''}<p>${result.durationMs} ms</p></section>`).join('')}</html>`);
}
try {
    assert.ok(['browser', 'api'].includes(fontMode), 'BOOK_REPORT_FONT_MODE must be browser or api'); await mkdir(artifactDir, { recursive: true });
    assert.ok(productionUrl || baselineDist || process.env.BOOK_REPORT_ALLOW_NO_BASELINE === '1', 'Set BOOK_REPORT_BASELINE_ROOT for the required exact comparison (BOOK_REPORT_ALLOW_NO_BASELINE=1 explicitly permits incomplete debug runs)');
    candidateUrl = await serveDist(dist); await manifestAssets(dist, 'candidate');
    if (baselineDist) { assert.notEqual(dist, baselineDist); baselineUrl = await serveDist(baselineDist); await manifestAssets(baselineDist, 'baseline'); }
    await writeJSON('asset-verification-before.json', await Promise.all([...manifests.keys()].map(verifyAssets)));
    if (!productionUrl) for (const command of ['pdftotext', 'pdftoppm', 'pdffonts']) await runTool(command, ['-v'], { timeout: 10_000 });
    browser = await chromium.launch({ headless: true });
    await writeJSON('run-metadata.json', { browser: 'Chromium', version: browser.version(), dist, baselineDist, productionUrl, fontMode, viewports: VIEWPORTS,
        method: 'Immutable actual Vite builds. No app globals/functions imported or patched. Fixtures are documented storage/clipboard/OS print/browser composition/input boundaries. Cross-tab events and downloads are real. Native and production cases forbid all fixtures/routing. Actual PDF bytes, independent Poppler text/bbox/fonts/all-page raster, and exact decoded PNG comparisons are saved.' });
    if (productionUrl) await productionSuite();
    else { await initialSuite(); await wizardSuite(); await inputSuite(); await storageSuite(); await shareSuite(); await dialogsSuite(); await clipboardAndDownloadSuite(); await performanceSuite(); await printSuite(); await nativeSuite(); }
    if (failures.length) throw new AggregateError(failures, `Book Report E2E: ${failures.length}/${results.length} cases failed; see ${artifactDir}/results.json`);
    console.log(`[OK] Book Report E2E: ${results.length} cases passed. Artifacts: ${artifactDir}`);
} catch (error) {
    await writeJSON('run-error.json', { error: error.stack || String(error), completedCases: results.length }).catch(() => {}); throw error;
} finally {
    try {
        await writeJSON('asset-verification-after.json', await Promise.all([...manifests.keys()].map(verifyAssets))); await gallery(); await writeJSON('results.json', results);
        await writeJSON('summary.json', { total: results.length, passed: results.filter(result => result.status === 'passed').length, failed: failures.length, baselineComparison: baselineDist ? 'requested-exact-pixels-and-geometry' : 'explicitly-skipped-incomplete', mode: productionUrl ? 'production-native-verification' : 'local-built-e2e', artifactDir, automatedVisualEvidenceOnly: true });
    } finally { await browser?.close(); for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

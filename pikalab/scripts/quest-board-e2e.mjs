import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 実ビルドのみを無加工配信する。アプリの内部状態・関数を参照/置換しない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const baselineDist = process.env.QUEST_BOARD_BASELINE_ROOT ? path.resolve(process.env.QUEST_BOARD_BASELINE_ROOT) : null;
const productionUrl = process.env.QUEST_BOARD_PRODUCTION_URL || null;
const artifactDir = path.resolve(process.env.QUEST_BOARD_ARTIFACT_DIR || path.join(root, 'visual-guard-artifacts', 'quest-board'));
const fontMode = process.env.QUEST_BOARD_FONT_MODE || 'browser';
const VIEWPORTS = [{ width: 320, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];
const KEY = 'questBoardData', PROFILE = 'wonder_school_profile_v2';
const EPOCH = new Date('2026-01-02T12:00:00Z');
const servers = [], manifests = new Map(), results = [], failures = [], imagePairs = [];
let browser, candidateUrl, baselineUrl;
const runTool = promisify(execFile);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJSON = (name, value) => writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
const screenshot = async (page, name) => { await page.evaluate(() => document.fonts.ready); return page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' }); };
const codePoints = value => Array.from(value);
const quest = (overrides = {}) => ({ title: '保存済みの目標', count: 10, reward: '保存済みのごほうび', stamps: Array(10).fill(false), ...overrides });
const encodeQuest = data => Buffer.from(JSON.stringify(data)).toString('base64url');
const shareURL = (base, data) => { const url = new URL(base); url.searchParams.set('q', encodeQuest(data)); return url.href; };
const decodeQuest = value => JSON.parse(Buffer.from(new URL(value).searchParams.get('q'), 'base64url').toString('utf8'));
const readSaved = page => page.evaluate(key => localStorage.getItem(key), KEY);
const readQuest = async page => JSON.parse(await readSaved(page));
const pressed = page => page.locator('.stamp-spot[aria-pressed="true"]').count();
const text = async (page, selector) => (await page.locator(selector).textContent()).trim();

async function serveDist(directory) {
    const entry = await readFile(path.join(directory, 'quest_board/index.html'), 'utf8');
    assert.ok((await stat(path.join(directory, 'assets'))).isDirectory(), 'Actual Vite dist/assets is required');
    assert.match(entry, /(?:\.\.\/|\/)assets\/[^"']+\.css/, 'Source HTML is not an actual Vite build');
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
    const server = createServer(async (request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            let file = path.resolve(directory, `.${pathname}`);
            if (file !== directory && !file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
            if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
            response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            response.end(await readFile(file));
        } catch (error) { response.writeHead(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500).end(); }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}/quest_board/`;
}

async function manifestAssets(directory, name) {
    const origin = 'https://quest-build.invalid', pending = [new URL('/quest_board/index.html', origin)], files = new Map();
    while (pending.length) {
        const url = pending.shift();
        if (url.origin !== origin) continue;
        const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        if (files.has(relative)) continue;
        const file = path.resolve(directory, relative);
        assert.ok(file.startsWith(directory + path.sep), 'Asset references must stay inside the build root');
        const bytes = await readFile(file), source = bytes.toString('utf8'), references = [];
        files.set(relative, { path: relative, bytes: bytes.length, sha256: sha256(bytes) });
        if (file.endsWith('.html')) {
            for (const match of source.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) references.push(match[1].replaceAll('&amp;', '&'));
        } else if (file.endsWith('.css')) {
            for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) references.push(match[1]);
            for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gi)) references.push(match[1]);
        } else if (/\.m?js$/.test(file)) {
            for (const match of source.matchAll(/\b(?:import|export)\s*(?:[^;'"\n]*?\bfrom\s*)?["']([^"']+)["']/g)) references.push(match[1]);
            for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) references.push(match[1]);
        }
        for (const reference of references) {
            if (/^(?:data:|#)/.test(reference)) continue;
            const next = new URL(reference, url);
            if (next.origin === origin) pending.push(next);
        }
    }
    assert.ok([...files.keys()].some(file => file.startsWith('assets/')), 'Linked built assets must be hashed');
    const manifest = { entry: 'quest_board/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
    manifests.set(name, { directory, manifest });
    await writeJSON(`${name}-asset-manifest.json`, manifest);
}
async function verifyAssets(name) {
    const { directory, manifest } = manifests.get(name);
    for (const entry of manifest.files) {
        const bytes = await readFile(path.join(directory, entry.path));
        assert.equal(bytes.length, entry.bytes, `${name}: immutable size ${entry.path}`);
        assert.equal(sha256(bytes), entry.sha256, `${name}: immutable built asset ${entry.path}`);
    }
    return { name, files: manifest.files.length, manifestSHA256: sha256(JSON.stringify(manifest)) };
}

// フィクスチャは保存/API/OSなどブラウザ境界だけに適用する。ネイティブ・本番ケースでは一切使用しない。
function browserEnvironment(options) {
    const observation = window.__questE2EBoundary = { writes: [], prints: [], clipboard: [], copyFallbacks: 0, focus: [] };
    if (options.observeFocus) {
        const capture = event => observation.focus.push({ event: event.type, readyState: document.readyState, id: document.activeElement?.id || '', tag: document.activeElement?.tagName, hash: location.hash });
        document.addEventListener('focusin', capture, true); document.addEventListener('DOMContentLoaded', capture); window.addEventListener('load', capture);
    }
    const storage = window.Storage.prototype, originalSet = storage.setItem;
    if (options.observeStorage || options.writeFail) storage.setItem = function (key, value) {
        observation.writes.push({ key, value });
        if (options.writeFail && key === 'questBoardData') throw new DOMException('Storage full', 'QuotaExceededError');
        return originalSet.call(this, key, value);
    };
    if (options.denyStorage) for (const method of ['getItem', 'setItem', 'removeItem']) storage[method] = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
    if (options.audioFail) {
        const unavailable = function () { throw new DOMException('Audio unavailable', 'NotSupportedError'); };
        Object.defineProperty(window, 'AudioContext', { configurable: true, value: unavailable });
        Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: unavailable });
    }
    if (options.observePrint) window.print = () => {
        observation.prints.push({ title: document.querySelector('#disp-title')?.textContent, reward: document.querySelector('#disp-reward')?.textContent,
            count: document.querySelectorAll('.stamp-spot').length, stamped: document.querySelectorAll('.stamp-spot.stamped').length,
            printStamps: document.body.classList.contains('print-stamps'), saved: localStorage.getItem('questBoardData') });
    };
    if (options.clipboard) {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => {
            observation.clipboard.push(value);
            if (options.clipboard === 'pending-fail') await new Promise(resolve => setTimeout(resolve, 500));
            if (options.clipboard !== 'success') throw new DOMException('Clipboard denied', 'NotAllowedError');
        } } });
        document.execCommand = command => { if (command === 'copy') observation.copyFallbacks++; return options.clipboard === 'fallback-success'; };
    }
}
async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const target = options.url || candidateUrl;
    const context = await browser.newContext({ viewport, locale: 'ja-JP', timezoneId: 'UTC', colorScheme: 'light',
        hasTouch: viewport.width < 768, isMobile: viewport.width < 768, reducedMotion: options.motion || 'reduce', serviceWorkers: options.native ? 'allow' : 'block',
        ...(options.storage ? { storageState: { cookies: [], origins: [{ origin: new URL(target).origin, localStorage: Object.entries(options.storage).map(([name, value]) => ({ name, value })) }] } } : {}) });
    assert.ok(!options.native || !['storage', 'clock', 'observeStorage', 'writeFail', 'denyStorage', 'audioFail', 'observePrint', 'clipboard', 'observeFocus'].some(key => options[key]), 'Native cases forbid fixtures');
    if (['observeStorage', 'writeFail', 'denyStorage', 'audioFail', 'observePrint', 'clipboard', 'observeFocus'].some(key => options[key])) await context.addInitScript(browserEnvironment, options);
    const current = { context, options, errors: [], requestFailures: [], externalFailures: [], consoleErrors: [], consoleWarnings: [], dialogs: [], dialogPlan: [], fontTransfers: [] };
    if (!options.native && fontMode === 'api') await context.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, async route => {
        const response = await context.request.fetch(route.request(), { timeout: 30_000 }), bytes = await response.body();
        current.fontTransfers.push({ url: route.request().url(), status: response.status(), bytes: bytes.length, sha256: sha256(bytes), transport: 'Original URL and original font response bytes via APIRequestContext' });
        await route.fulfill({ response, body: bytes });
    });
    current.observe = page => {
        page.setDefaultTimeout(15_000);
        page.on('pageerror', error => current.errors.push(error.stack || error.message));
        page.on('console', message => { if (message.type() === 'error') current.consoleErrors.push(message.text()); if (message.type() === 'warning') current.consoleWarnings.push(message.text()); });
        const failure = (url, label) => (new URL(url).origin === new URL(target).origin ? current.requestFailures : current.externalFailures).push(label);
        page.on('response', response => { if (response.status() >= 400) failure(response.url(), `${response.status()} ${response.url()}`); });
        page.on('requestfailed', request => failure(request.url(), `${request.failure()?.errorText} ${request.url()}`));
        page.on('dialog', async dialog => {
            const plan = current.dialogPlan.shift();
            current.dialogs.push({ type: dialog.type(), message: dialog.message(), expected: Boolean(plan), action: plan?.accept ? 'accept' : 'dismiss' });
            if (plan?.accept) await dialog.accept(); else await dialog.dismiss();
        });
    };
    current.page = await context.newPage(); current.observe(current.page);
    if (options.clock) { await current.page.clock.install({ time: EPOCH }); await current.page.clock.pauseAt(EPOCH); }
    return current;
}
async function settle(current, milliseconds = 160) {
    if (current.options.clock) await current.page.clock.runFor(milliseconds);
    else await current.page.waitForTimeout(milliseconds);
}
async function ready(current, url = current.options.url || candidateUrl, { reload = false, page = current.page } = {}) {
    const response = reload ? await page.reload({ waitUntil: 'load' }) : await page.goto(url, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    await page.locator('.stamp-spot').first().waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
    if (current.options.clock) await page.clock.runFor(220); else await page.waitForTimeout(220);
}
async function eventually(read, expected, label, timeout = 12_000) {
    const deadline = Date.now() + timeout; let actual;
    do { actual = await read(); if (Object.is(actual, expected)) return actual; await new Promise(resolve => setTimeout(resolve, 30)); } while (Date.now() < deadline);
    assert.equal(actual, expected, label);
}
async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const record = { name, viewport, status: 'passed', fixtures: { ...options, storage: options.storage ? Object.keys(options.storage) : undefined } }, began = Date.now(); let current;
    try {
        current = await createCase(viewport, options); if (!options.beforeReady) await ready(current);
        await work(current.page, record, current);
        assert.deepEqual(current.errors, [], 'No unhandled browser exceptions');
        assert.deepEqual(current.requestFailures, [], 'All actual same-origin assets load');
        assert.deepEqual(current.dialogs.filter(dialog => !dialog.expected), [], 'No unexpected native dialogs');
        assert.equal(current.dialogPlan.length, 0, 'Every expected native dialog really opened');
        const unexpected = current.consoleErrors.filter(message => !(options.expectedConsole || []).some(pattern => pattern.test(message)) && !/Failed to load resource: net::ERR_/.test(message));
        assert.deepEqual(unexpected, [], 'No unexpected console errors');
        console.log(`[OK] Quest Board: ${name}`);
    } catch (error) {
        record.status = 'failed'; record.error = error.stack || String(error); failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Quest Board: ${name}: ${error.message}`);
        try { if (current?.page) { await screenshot(current.page, `${name}-failure`); record.failureMetrics = await layoutMetrics(current.page); } } catch (error) { record.captureError = error.message; }
    } finally {
        Object.assign(record, { durationMs: Date.now() - began, pageErrors: current?.errors || [], requestFailures: current?.requestFailures || [], externalFailures: current?.externalFailures || [],
            consoleErrors: current?.consoleErrors || [], consoleWarnings: current?.consoleWarnings || [], dialogs: current?.dialogs || [], fontTransfers: current?.fontTransfers || [] });
        await current?.context.close(); results.push(record); await writeJSON('results.json', results);
    }
}
async function focusIs(page, selector) {
    const focus = await page.locator(selector).evaluate(node => ({ expected: node === document.activeElement, activeId: document.activeElement?.id || '', activeTag: document.activeElement?.tagName, activeModal: document.activeElement?.closest('[role=dialog]')?.id || null }));
    assert.equal(focus.expected, true, `${selector}: keyboard focus ${JSON.stringify(focus)}`);
}
async function setCount(page, count, current, { commit = true, wait = true } = {}) {
    // rangeのinput/changeはブラウザ境界の明示フィクスチャ。アプリ関数・状態は呼び出さない。
    await page.locator('#quest-count').evaluate((node, { count, commit }) => { node.value = String(count); node.dispatchEvent(new Event('input', { bubbles: true })); if (commit) node.dispatchEvent(new Event('change', { bubbles: true })); }, { count, commit });
    if (wait) await settle(current);
}
async function assertQuest(page, data) {
    assert.equal(await page.locator('#quest-title').inputValue(), data.title);
    assert.equal(await page.locator('#quest-reward').inputValue(), data.reward);
    assert.equal(await page.locator('#quest-count').inputValue(), String(data.count));
    assert.equal(await text(page, '#count-val'), String(data.count));
    assert.equal(await text(page, '#disp-title'), data.title || 'クエスト名未設定');
    assert.equal(await text(page, '#disp-reward'), data.reward || 'ごほうび未設定');
    assert.equal(await page.locator('.stamp-spot').count(), data.count);
    const spots = await page.locator('.stamp-spot').evaluateAll(nodes => nodes.map(node => ({ index: Number(node.dataset.index), pressed: node.getAttribute('aria-pressed') === 'true', marked: node.classList.contains('stamped'), goal: node.classList.contains('goal'), label: node.getAttribute('aria-label') })));
    assert.deepEqual(spots, data.stamps.map((value, index) => ({ index: index + 1, pressed: value, marked: value, goal: index === data.count - 1, label: `スタンプ ${index + 1}` })));
}
async function layoutMetrics(page) {
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
        const round = value => Math.round(value * 100) / 100;
        const selectors = ['header', 'header h1', '#help-btn', 'aside', '#main-content', '.quest-container', '#quest-card', '.quest-header', '#disp-title', '#stamp-grid', '.stamp-spot', '.stamp-number', '.reward-area', '#disp-reward', '#quest-title', '#quest-count', '#quest-reward', '#print-btn', '#share-btn'];
        const anchors = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map((node, index) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node);
            return { key: `${selector}:${index}`, text: (node.innerText || '').trim().replace(/\s+/g, ' '), box: Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, round(box[key])])),
                style: Object.fromEntries(['display', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'gap', 'color', 'backgroundColor', 'backgroundImage', 'borderRadius', 'borderColor', 'borderWidth'].map(key => [key, style[key]])) };
        }));
        return { title: document.title, activeFocus: { id: document.activeElement?.id || '', tag: document.activeElement?.tagName, modal: document.activeElement?.closest('[role=dialog]')?.id || null }, focusEvents: window.__questE2EBoundary?.focus || [], viewport: { width: innerWidth, height: innerHeight }, anchors,
            controls: [...document.querySelectorAll('button,input')].map(node => ({ id: node.id, tag: node.tagName, type: node.type, value: node.matches('input') ? node.value : '', label: node.getAttribute('aria-label'), text: (node.innerText || '').trim().replace(/\s+/g, ' '), disabled: node.disabled })),
            overflow: { document: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth },
            card: (() => {
                const card = document.querySelector('#quest-card'), container = document.querySelector('.quest-container'), grid = document.querySelector('#stamp-grid'), rect = card.getBoundingClientRect();
                const spots = [...grid.children].map(node => node.getBoundingClientRect());
                return { transform: getComputedStyle(card).transform, columns: getComputedStyle(grid).gridTemplateColumns,
                    naturalWidth: card.offsetWidth, naturalHeight: card.offsetHeight, contentHeight: card.scrollHeight,
                    containerWidth: container.clientWidth, containerHeight: container.clientHeight,
                    minSpotWidth: Math.min(...spots.map(box => box.width)), minSpotHeight: Math.min(...spots.map(box => box.height)),
                    gridWidth: grid.clientWidth, columnGap: parseFloat(getComputedStyle(grid).columnGap),
                    contentClipped: card.scrollHeight > card.clientHeight + 1,
                    naturalOverflow: card.offsetHeight > container.clientHeight - 32,
                    box: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } };
            })(),
            fonts: [...document.fonts].map(face => ({ family: face.family, status: face.status, unicodeRange: face.unicodeRange })),
            fontChecks: ['header h1', '#disp-title', '#disp-reward', '.material-symbols-rounded'].map(selector => {
                const node = document.querySelector(selector), style = getComputedStyle(node), text = node.textContent.trim();
                const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
                return { selector, family: style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''), font, text, loaded: document.fonts.check(font, text) };
            }),
            fontUsage: [...new Set([...document.querySelectorAll('body,header h1,.material-symbols-rounded,#disp-title')].filter(node => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0 && node.textContent.trim()).map(node => getComputedStyle(node).fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')))] };
    });
    // 指定フォント名と実際に描画したフォントを区別する。共有CSSの正当なsystem/CJKフォールバックも記録する。
    const cdp = await page.context().newCDPSession(page);
    try {
        await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
        const { root } = await cdp.send('DOM.getDocument'); metrics.platformFonts = [];
        for (const selector of ['header h1', '#disp-title', '#disp-reward', '.material-symbols-rounded']) {
            const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
            const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId }); metrics.platformFonts.push({ selector, fonts });
        }
    } finally { await cdp.detach(); }
    return metrics;
}
function requireFonts(metrics) {
    for (const check of metrics.fontChecks) {
        assert.equal(check.loaded, true, `${check.selector}: actual computed font stack loaded for tested text ${check.text}`);
        const declared = metrics.fonts.filter(face => face.family.replace(/^["']|["']$/g, '') === check.family);
        if (declared.length) assert.ok(declared.some(face => face.status === 'loaded'), `${check.family}: the visible declared font has loaded real bytes`);
    }
    assert.ok(metrics.fontUsage.includes('Material Symbols Rounded'), 'Visible icons retain the actual icon font');
    assert.ok(metrics.fonts.some(face => face.family.includes('Material Symbols Rounded') && face.status === 'loaded'), 'Real Material Symbols font bytes loaded');
    for (const sample of metrics.platformFonts) assert.ok(sample.fonts.some(font => font.glyphCount > 0), `${sample.selector}: actual browser-rendered glyphs are present`);
    const icons = metrics.platformFonts.find(sample => sample.selector === '.material-symbols-rounded');
    assert.ok(icons.fonts.some(font => font.familyName.includes('Material Symbols Rounded') && font.isCustomFont && font.glyphCount > 0), 'Icon glyphs are rendered by the real downloaded Material font');
}

function contrastRatio(foreground, background) {
    const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
async function toastContrast(page) {
    const samples = await page.locator('#toast-container .toast').evaluateAll(nodes => nodes.map(node => { const style = getComputedStyle(node); return { text: node.textContent, color: style.color, background: style.backgroundColor, fontSize: style.fontSize }; }));
    return samples.map(sample => ({ ...sample, ratio: contrastRatio(sample.color, sample.background) }));
}
async function assertToastContrast(page, record) {
    const samples = await toastContrast(page); assert.ok(samples.length, 'Expected status/warning toast is present for contrast measurement');
    (record.toastContrast ||= []).push(...samples);
    for (const sample of samples) assert.ok(sample.ratio >= 4.5, `Visible toast text meets AA contrast: ${JSON.stringify(sample)}`);
}
function compareInitial(after, before) {
    assert.equal(after.title, before.title, 'Document title unchanged');
    const normalize = controls => controls.map(control => { const result = { ...control }; if (['share-link-input'].includes(result.id)) delete result.label; return result; });
    assert.deepEqual(normalize(after.controls), normalize(before.controls), 'Original controls, copy, defaults and accessible labels remain');
    const exceptions = [], baseline = before.card;
    const preferredColumns = 4; // 初期10回の既存契約
    const evidence = {
        tooSmallHitTarget: baseline.minSpotWidth < 43.95 || baseline.minSpotHeight < 43.95,
        naturalCardOverflow: baseline.naturalOverflow || baseline.contentClipped,
        desktopColumnDoesNotFit: before.viewport.width >= 768 && (baseline.gridWidth - baseline.columnGap * (preferredColumns - 1)) / preferredColumns < 44,
        baseline
    };
    const repaired = Object.values(evidence).some(value => value === true);
    const board = /^(?:\.quest-container|#quest-card|\.quest-header|#disp-title|#stamp-grid|\.stamp-spot|\.stamp-number|\.reward-area|#disp-reward):/;
    for (const old of before.anchors) {
        const next = after.anchors.find(anchor => anchor.key === old.key); assert.ok(next, `${old.key}: semantic element remains`); assert.equal(next.text, old.text, `${old.key}: original visible copy`);
        const oldStyle = { ...old.style }, newStyle = { ...next.style };
        if (old.key.startsWith('.stamp-number:') && oldStyle.color !== newStyle.color) {
            const index = Number(old.key.split(':')[1]), oldSpot = before.anchors.find(anchor => anchor.key === `.stamp-spot:${index}`), newSpot = after.anchors.find(anchor => anchor.key === `.stamp-spot:${index}`);
            const originalRatio = contrastRatio(oldStyle.color, oldSpot.style.backgroundColor), repairedRatio = contrastRatio(newStyle.color, newSpot.style.backgroundColor);
            assert.ok(originalRatio < 4.5 && repairedRatio >= 4.5, `${old.key}: only a measured failing AA contrast may change`);
            assert.equal(newStyle.color, 'rgb(107, 114, 128)', 'Only the reviewed readable number color is allowed');
            exceptions.push({ key: old.key, reason: 'Illegible unstamped number contrast repair', before: oldStyle.color, after: newStyle.color, originalRatio, repairedRatio });
            delete oldStyle.color; delete newStyle.color;
        }
        assert.deepEqual(newStyle, oldStyle, `${old.key}: original colors, typography, spacing and shapes outside the explicit contrast repair`);
        const differences = ['x', 'y', 'width', 'height'].filter(key => Math.abs(next.box[key] - old.box[key]) > 1.5);
        if (!differences.length) continue;
        assert.ok(board.test(old.key) && repaired, `${old.key}: unexplained initial geometry drift ${JSON.stringify({ before: old.box, after: next.box, evidence })}`);
        exceptions.push({ key: old.key, before: old.box, after: next.box, reason: 'Measured baseline target under44, card-content overflow, or desktop columns not fitting44px', evidence });
    }
    assert.ok(after.card.minSpotWidth >= 43.95 && after.card.minSpotHeight >= 43.95, 'Candidate initial hit targets remain >=44px');
    return exceptions;
}
async function noHorizontalOverflow(page, record) {
    const metrics = await layoutMetrics(page); (record.layouts ||= []).push(metrics);
    assert.ok(metrics.overflow.document <= 1 && metrics.overflow.body <= 1, `No document horizontal overflow: ${JSON.stringify(metrics.overflow)}`);
}
async function reachable(page, selector, record, minimum = 0) {
    const locator = page.locator(selector); await locator.scrollIntoViewIfNeeded(); await locator.click({ trial: true });
    const sample = await locator.evaluate(node => {
        const box = node.getBoundingClientRect(), clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent), rect = parent.getBoundingClientRect();
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) { clip.left = Math.max(clip.left, rect.left + parent.clientLeft); clip.right = Math.min(clip.right, rect.left + parent.clientLeft + parent.clientWidth); }
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) { clip.top = Math.max(clip.top, rect.top + parent.clientTop); clip.bottom = Math.min(clip.bottom, rect.top + parent.clientTop + parent.clientHeight); }
        }
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return { box: Object.fromEntries(['left', 'right', 'top', 'bottom', 'width', 'height'].map(key => [key, box[key]])), clip, hit: hit === node || node.contains(hit) };
    });
    (record.reachability ||= []).push({ selector, ...sample }); const { box, clip } = sample;
    assert.ok(box.width >= minimum - .05 && box.height >= minimum - .05, `${selector}: actual transformed hit target >=${minimum}px ${JSON.stringify(box)}`);
    assert.ok(box.left >= clip.left - 1 && box.right <= clip.right + 1 && box.top >= clip.top - 1 && box.bottom <= clip.bottom + 1 && sample.hit, `${selector}: whole target and pointer center reachable ${JSON.stringify(sample)}`);
}
async function initialSuite() {
    for (const viewport of VIEWPORTS) await runCase(`baseline-initial-${viewport.width}`, async (page, record, current) => {
        const after = await layoutMetrics(page); requireFonts(after); await noHorizontalOverflow(page, record);
        await screenshot(page, `initial-${viewport.width}-candidate`);
        let before = null;
        if (baselineUrl) {
            const baseline = await createCase(viewport, { url: baselineUrl });
            try {
                await ready(baseline); before = await layoutMetrics(baseline.page); requireFonts(before);
                await screenshot(baseline.page, `initial-${viewport.width}-baseline`);
                record.allowedRepairs = compareInitial(after, before);
                await setCount(baseline.page, 35, baseline);
                record.baselineCount35 = await layoutMetrics(baseline.page);
                await screenshot(baseline.page, `count35-${viewport.width}-baseline`);
                await baseline.page.locator('.stamp-spot.goal').click(); record.baselineGoalToastContrast = await toastContrast(baseline.page);
            } finally { await baseline.context.close(); }
        }
        const metrics = `initial-${viewport.width}-metrics.json`; await writeJSON(metrics, { before, after, allowedRepairs: record.allowedRepairs, baselineCount35: record.baselineCount35, baselineGoalToastContrast: record.baselineGoalToastContrast });
        imagePairs.push({ name: `Initial ${viewport.width}`, before: before ? `initial-${viewport.width}-baseline.png` : null, after: `initial-${viewport.width}-candidate.png`, metrics });
        await setCount(page, 35, current); await screenshot(page, `count35-${viewport.width}-candidate`);
        imagePairs.push({ name: `35 stamps ${viewport.width}`, before: before ? `count35-${viewport.width}-baseline.png` : null, after: `count35-${viewport.width}-candidate.png`, metrics });
        for (const index of [1, 18, 35]) await reachable(page, `.stamp-spot[data-index="${index}"]`, record, viewport.width < 768 ? 44 : 0);
        for (const selector of ['#quest-title', '#quest-count', '#quest-reward', '#print-btn', '#share-btn']) await reachable(page, selector, record, 44);
    }, {}, viewport);
}
async function countsSuite() {
    for (const viewport of VIEWPORTS) await runCase(`all-counts-5-through-35-${viewport.width}`, async (page, record, current) => {
        record.counts = [];
        for (let count = 5; count <= 35; count++) {
            await setCount(page, count, current); const data = await readQuest(page);
            assert.equal(data.count, count); assert.equal(data.stamps.length, count); await assertQuest(page, data);
            const boxes = await page.locator('.stamp-spot').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height }; }));
            record.counts.push({ count, minWidth: Math.min(...boxes.map(box => box.width)), minHeight: Math.min(...boxes.map(box => box.height)) });
            if (viewport.width < 768) for (const box of boxes) assert.ok(box.width >= 43.95 && box.height >= 43.95, `Count ${count}: all actual mobile targets >=44px`);
        }
        await page.locator('.stamp-spot[data-index="27"]').click(); assert.equal(await pressed(page), 27);
        await setCount(page, 20, current); assert.equal(await pressed(page), 20);
        await setCount(page, 35, current); assert.equal(await pressed(page), 20, 'Shrunk-away stamps do not return');
        await noHorizontalOverflow(page, record); await screenshot(page, `all-counts-${viewport.width}`);
    }, {}, viewport);
    await runCase('native-keyboard-cumulative-stamps-reset-cancel', async (page, record, current) => {
        await setCount(page, 10, current);
        await page.locator('.stamp-spot[data-index="4"]').focus(); await page.keyboard.press('Enter'); assert.equal(await pressed(page), 4);
        await page.keyboard.press('Tab'); await focusIs(page, '.stamp-spot[data-index="5"]'); await page.keyboard.press('Space'); assert.equal(await pressed(page), 5);
        current.dialogPlan.push({ accept: false }); await page.locator('.stamp-spot[data-index="3"]').click(); assert.equal(await pressed(page), 5, 'Cancel keeps cumulative stamps');
        current.dialogPlan.push({ accept: true }); await page.locator('.stamp-spot[data-index="3"]').focus(); await page.keyboard.press('Enter'); assert.equal(await pressed(page), 2, 'Confirmed reset clears clicked and later stamps');
        assert.match(current.dialogs.at(-1).message, /スタンプを消/); assert.equal(current.dialogs.at(-1).type, 'confirm');
        await page.locator('.stamp-spot.goal').focus(); await page.keyboard.press('Space'); assert.equal(await pressed(page), 10);
        assert.match(await text(page, '#toast-container'), /ゴール達成/);
        const saved = await readQuest(page); await ready(current, candidateUrl, { reload: true }); await assertQuest(page, saved);
        await page.locator('#quest-count').focus(); await page.keyboard.press('Home'); await settle(current); assert.equal(await page.locator('.stamp-spot').count(), 5);
        await page.keyboard.press('End'); await settle(current); assert.equal(await page.locator('.stamp-spot').count(), 35);
        await page.keyboard.press('ArrowLeft'); await settle(current); assert.equal(await page.locator('.stamp-spot').count(), 34);
        record.saved = saved;
    });
    for (const viewport of VIEWPORTS.slice(0, 2)) await runCase(`count35-rotate-resize-${viewport.width}`, async (page, record, current) => {
        await setCount(page, 35, current); await page.locator('.stamp-spot[data-index="12"]').click();
        const saved = await readSaved(page);
        for (const size of [{ width: viewport.height, height: viewport.width }, VIEWPORTS[3], viewport]) {
            await page.setViewportSize(size); await settle(current, 250); await noHorizontalOverflow(page, record);
            assert.equal(await pressed(page), 12); assert.equal(await readSaved(page), saved, 'Resize does not save or change quest');
            for (const index of [1, 18, 35]) await reachable(page, `.stamp-spot[data-index="${index}"]`, record, 44);
            for (const selector of ['#quest-title', '#quest-count', '#quest-reward', '#print-btn', '#share-btn']) await reachable(page, selector, record, 44);
            record.layouts.push(await layoutMetrics(page)); await screenshot(page, `rotate-${viewport.width}-to-${size.width}x${size.height}`);
        }
    }, {}, viewport);
}
async function composition(page, selector, value, phase) {
    // OS IMEはCIに無いため、DOMの標準composition/inputイベントだけを順序通りに発火する。
    await page.locator(selector).evaluate((node, { value, phase }) => {
        if (phase === 'start') node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
        node.value = value;
        if (phase === 'end') node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
        node.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertCompositionText', isComposing: phase !== 'end' }));
    }, { value, phase });
}
async function inputSuite() {
    await runCase('unicode-30-codepoints-ime-and-empty-fallbacks', async (page, record, current) => {
        await page.locator('.stamp-spot[data-index="4"]').click();
        for (const selector of ['#quest-title', '#quest-reward']) {
            for (const value of ['あ'.repeat(30), '𠮷'.repeat(30), '😀'.repeat(31), 'A'.repeat(28) + 'か\u3099' + '終', '<img src=x onerror=alert(1)>']) {
                await page.locator(selector).fill(value); await settle(current);
                const expected = codePoints(value).slice(0, 30).join(''); assert.equal(await page.locator(selector).inputValue(), expected);
                assert.equal(await text(page, selector === '#quest-title' ? '#disp-title' : '#disp-reward'), expected);
                assert.equal(await page.locator('#quest-card img').count(), 0, 'Text is never interpreted as HTML');
                assert.equal(await pressed(page), 4, 'Editing labels preserves stamps');
                assert.equal((await readQuest(page))[selector === '#quest-title' ? 'title' : 'reward'], expected);
            }
            const before = await readSaved(page), provisional = 'あ'.repeat(29) + '𠮷' + '終';
            await page.locator(selector).focus(); await composition(page, selector, provisional, 'start');
            assert.equal(await page.locator(selector).inputValue(), provisional, 'IME provisional text is never truncated mid-composition');
            assert.equal(await readSaved(page), before, 'IME provisional state is not persisted');
            await composition(page, selector, provisional, 'end'); await settle(current);
            assert.equal(await page.locator(selector).inputValue(), codePoints(provisional).slice(0, 30).join(''), 'Committed IME applies existing code-point limit');
            await page.locator(selector).fill(''); await settle(current);
        }
        assert.equal(await text(page, '#disp-title'), 'クエスト名未設定'); assert.equal(await text(page, '#disp-reward'), 'ごほうび未設定');
        record.contract = '30 Unicode code points; combining marks remain separate code points, preserving the existing product contract. IME sequence is an explicit browser-event fixture.';
    });
    await runCase('input-burst-keeps-grid-and-bounds-layout-work', async (page, record, current) => {
        record.performance = await measureInputBurst(page, current);
        assert.equal(record.performance.gridMutations, 0, 'Text-only input never reconstructs stamp DOM'); assert.equal(record.performance.sameSpots, true);
        assert.ok(record.performance.layoutCount <= 6, `30 input burst performs <=6 layout passes, observed ${record.performance.layoutCount}`);
        assert.ok(record.performance.cardStyleMutations <= 6, `30 inputs do not rewrite scale on every keystroke, observed ${record.performance.cardStyleMutations}`);
        assert.equal(await text(page, '#disp-title'), '目'.repeat(30)); assert.equal(await pressed(page), 6);
        if (baselineUrl) {
            const baseline = await createCase(VIEWPORTS[3], { url: baselineUrl });
            try {
                await ready(baseline); record.baselinePerformance = await measureInputBurst(baseline.page, baseline);
                record.performanceDelta = Object.fromEntries(['layoutCount', 'recalcStyleCount', 'layoutSeconds', 'cardStyleMutations', 'gridMutations'].map(key => [key, { baseline: record.baselinePerformance[key], candidate: record.performance[key], reduction: record.baselinePerformance[key] - record.performance[key] }]));
            } finally { await baseline.context.close(); }
        }
        await writeJSON('input-performance-comparison.json', { baseline: record.baselinePerformance || null, candidate: record.performance, delta: record.performanceDelta || null, note: 'Same real immutable builds and 30-event input burst; absolute candidate bounds are enforced. No hardware-sensitive duration ratio is required.' });
    }, {}, VIEWPORTS[3]);
}
async function measureInputBurst(page, current) {
    await setCount(page, 35, current); await page.locator('.stamp-spot[data-index="6"]').click(); await page.mouse.move(0, 0);
    await page.evaluate(async () => { const style = getComputedStyle(document.querySelector('#disp-title')); await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, '目'); await document.fonts.ready; }); await settle(current, 250);
    const cdp = await current.context.newCDPSession(page); await cdp.send('Performance.enable');
    await page.evaluate(() => {
        const grid = document.querySelector('#stamp-grid'), card = document.querySelector('#quest-card');
        const data = window.__questE2EMeasure = { gridMutations: 0, cardStyleMutations: 0, originalSpots: [...grid.children] };
        new MutationObserver(records => { data.gridMutations += records.filter(record => record.type === 'childList').length; }).observe(grid, { childList: true, subtree: true });
        new MutationObserver(records => { data.cardStyleMutations += records.length; }).observe(card, { attributes: true, attributeFilter: ['style'] });
    });
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(metric => [metric.name, metric.value]));
    const before = await metrics();
    // 同一タスク中の入力バーストを明示フィクスチャとして再現する。強制同期レイアウトをCDPで実測する。
    await page.locator('#quest-title').evaluate(node => {
        for (let index = 1; index <= 30; index++) { node.value = '目'.repeat(index); node.dispatchEvent(new InputEvent('input', { bubbles: true, data: '目', inputType: 'insertText' })); }
    });
    await page.evaluate(() => document.fonts.ready); await settle(current, 350); const after = await metrics();
    const measured = { events: 30, layoutCount: after.LayoutCount - before.LayoutCount, recalcStyleCount: after.RecalcStyleCount - before.RecalcStyleCount, layoutSeconds: after.LayoutDuration - before.LayoutDuration,
        ...(await page.evaluate(() => ({ gridMutations: window.__questE2EMeasure.gridMutations, cardStyleMutations: window.__questE2EMeasure.cardStyleMutations, sameSpots: window.__questE2EMeasure.originalSpots.every((node, index) => document.querySelector('#stamp-grid').children[index] === node) }))) };
    await cdp.detach(); return measured;
}

async function storageSuite() {
    for (const [name, saved] of [['empty', null], ['corrupt-json', '{broken'], ['wrong-shape', '[]']]) await runCase(`initial-storage-${name}-never-overwritten`, async (page, record, current) => {
        assert.equal(await readSaved(page), saved); assert.equal(await page.evaluate(() => window.__questE2EBoundary.writes.filter(entry => entry.key === 'questBoardData').length), 0);
        await ready(current, candidateUrl, { reload: true }); assert.equal(await readSaved(page), saved);
        await page.locator('#quest-title').fill('自分で編集した目標'); await settle(current); assert.equal((await readQuest(page)).title, '自分で編集した目標');
        record.initialStorage = saved;
    }, { observeStorage: true, storage: saved === null ? undefined : { [KEY]: saved } });
    const normalizedSeed = JSON.stringify({ title: '𠮷'.repeat(40), reward: 'ごほうび', count: 40, stamps: [true, 1, true, false], unused: 'preserve-until-edit' });
    await runCase('stored-normalization-is-read-only-until-edit', async (page, record) => {
        assert.equal(await readSaved(page), normalizedSeed); assert.equal(await page.locator('#quest-title').inputValue(), '𠮷'.repeat(30));
        assert.equal(await page.locator('.stamp-spot').count(), 35); assert.equal(await pressed(page), 2);
        await page.locator('#quest-reward').fill('編集後');
        const data = await readQuest(page); assert.equal(data.count, 35); assert.equal(data.reward, '編集後'); assert.equal(data.stamps.length, 35); assert.equal(data.stamps[1], false); record.saved = data;
    }, { observeStorage: true, storage: { [KEY]: normalizedSeed } });
    for (const mode of ['denyStorage', 'writeFail']) await runCase(`storage-${mode}-usable-stamps-and-edit`, async (page, record, current) => {
        await page.locator('#quest-title').fill('保存できなくても編集'); await setCount(page, 15, current);
        await page.locator('.stamp-spot[data-index="8"]').click(); assert.equal(await pressed(page), 8);
        await page.locator('#quest-reward').fill('メモリ上のごほうび'); await settle(current);
        assert.equal(await text(page, '#disp-title'), '保存できなくても編集'); assert.equal(await text(page, '#disp-reward'), 'メモリ上のごほうび');
        await page.locator('#share-btn').click(); assert.equal(decodeQuest(await page.locator('#share-link-input').inputValue()).count, 15); await page.keyboard.press('Escape');
        const warnings = await page.locator('#toast-container .toast').allTextContents(); record.warningToasts = warnings; await assertToastContrast(page, record);
        assert.ok(warnings.some(value => /保存/.test(value) && /でき|失敗/.test(value)), 'Save failure visibly warns the user');
        assert.ok(warnings.filter(value => /保存/.test(value)).length <= 1, 'Repeated edits do not flood save-failure warnings');
        if (mode === 'writeFail') { assert.equal(await readSaved(page), JSON.stringify(quest())); record.writeAttempts = await page.evaluate(() => window.__questE2EBoundary.writes.length); assert.ok(record.writeAttempts >= 3, 'Later edits retry failed persistence'); }
    }, { clock: true, [mode]: true, storage: mode === 'writeFail' ? { [KEY]: JSON.stringify(quest()) } : undefined, expectedConsole: [/LocalStorage|保存|volume|Storage/] });
    await runCase('dark-toast-success-and-storage-failure-contrast', async (page, record, current) => {
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-night')), true);
        await page.locator('#quest-title').fill('保存できないときの通知'); await settle(current, 100); await assertToastContrast(page, record);
        await page.locator('.stamp-spot.goal').click(); await assertToastContrast(page, record);
        assert.ok(record.toastContrast.some(sample => /保存/.test(sample.text))); assert.ok(record.toastContrast.some(sample => /ゴール達成/.test(sample.text)));
        for (const sample of record.toastContrast) assert.ok(sample.color.match(/[\d.]+/g).slice(0, 3).map(Number).every(value => value >= 240), 'Night-mode toast text remains light; shared CSS may use readable off-white');
    }, { clock: true, writeFail: true, motion: 'no-preference', storage: { [PROFILE]: JSON.stringify({ darkMode: true, reduceMotion: false, isMuted: true }) } });
    await runCase('audio-constructor-failure-never-blocks-progress', async (page, record, current) => {
        await page.locator('.stamp-spot[data-index="7"]').click(); assert.equal(await pressed(page), 7);
        current.dialogPlan.push({ accept: true }); await page.locator('.stamp-spot[data-index="4"]').click(); assert.equal(await pressed(page), 3);
        assert.equal((await readQuest(page)).stamps.filter(Boolean).length, 3); record.audioBoundary = 'AudioContext and webkitAudioContext constructors throw NotSupportedError';
    }, { audioFail: true });
    await runCase('pending-slider-navigation-and-print-share-flush', async (page, record, current) => {
        await setCount(page, 29, current, { commit: false, wait: false });
        await page.locator('#print-btn').click(); const print = await page.evaluate(() => window.__questE2EBoundary.prints.at(-1));
        assert.equal(print.count, 29, 'Print flushes pending slider before opening OS dialog'); assert.equal(JSON.parse(print.saved).count, 29);
        await setCount(page, 17, current, { commit: false, wait: false }); await page.locator('#share-btn').click();
        assert.equal(decodeQuest(await page.locator('#share-link-input').inputValue()).count, 17); assert.equal(await page.locator('.stamp-spot').count(), 17); await page.keyboard.press('Escape');
        await setCount(page, 33, current, { commit: false, wait: false });
        await page.goto('about:blank'); await ready(current); assert.equal(await page.locator('.stamp-spot').count(), 33, 'Real pagehide flushes interrupted range input');
        assert.equal((await readQuest(page)).count, 33); record.print = print;
    }, { observePrint: true, clock: true });
    await runCase('real-cross-tab-disjoint-merge-and-interrupted-edits', async (page, record, current) => {
        const remote = await current.context.newPage(); current.observe(remote); await ready(current, candidateUrl, { page: remote });
        await remote.locator('#quest-title').fill('別タブの目標'); await eventually(() => page.locator('#quest-title').inputValue(), '別タブの目標', 'Real storage event synchronizes idle title');
        await page.locator('#quest-reward').focus(); await remote.locator('#quest-reward').fill('別タブのごほうび');
        await eventually(() => page.locator('#quest-reward').inputValue(), '別タブのごほうび', 'Focus alone is not a dirty edit');
        await page.locator('#quest-title').focus(); await composition(page, '#quest-title', '入力途中の目標', 'start');
        await remote.locator('#quest-reward').fill('同時に変更したごほうび'); await remote.locator('.stamp-spot[data-index="4"]').click();
        await page.waitForTimeout(160); assert.equal(await page.locator('#quest-title').inputValue(), '入力途中の目標', 'Remote event cannot interrupt IME');
        await composition(page, '#quest-title', '入力確定の目標', 'end');
        await eventually(() => page.locator('#quest-reward').inputValue(), '同時に変更したごほうび', 'Disjoint remote reward survives local composition');
        await eventually(() => pressed(page), 4, 'Disjoint remote stamps survive local composition');
        await eventually(async () => (await readQuest(page)).title, '入力確定の目標', 'Local composition field wins at commit');
        await setCount(page, 18, current, { commit: false, wait: false });
        await remote.locator('#quest-title').fill('スライダー中の別タブ編集'); await remote.locator('.stamp-spot[data-index="6"]').click();
        await page.waitForTimeout(160); assert.equal(await page.locator('#quest-count').inputValue(), '18', 'Remote event cannot overwrite pending slider');
        await setCount(page, 18, current);
        await eventually(() => page.locator('#quest-title').inputValue(), 'スライダー中の別タブ編集', 'Commit merges disjoint remote title');
        await eventually(() => pressed(page), 6, 'Commit merges remote stamps within resized count');
        const final = await readQuest(page); assert.equal(final.count, 18); assert.equal(final.reward, '同時に変更したごほうび');
        await eventually(() => remote.locator('#quest-count').inputValue(), '18', 'Merged state synchronizes back to remote tab');
        await assertQuest(page, final); await assertQuest(remote, final);
        record.finalMergedQuest = final; record.method = 'Two real pages in one browser context; genuine localStorage storage events, no dispatch of synthetic StorageEvent';
        await remote.close();
    }, { clock: true, storage: { [KEY]: JSON.stringify(quest()) } });
}
async function modalIs(page, selector, open) {
    assert.equal(await page.locator(selector).isVisible(), open, `${selector}: expected visibility`);
    assert.equal(await page.locator(selector).getAttribute('aria-hidden'), open ? 'false' : 'true');
    for (const background of ['header', '#main-content']) assert.equal(await page.locator(background).evaluate(node => node.hasAttribute('inert')), open, `${background}: modal inert state`);
}
async function modalKeyboard(page, selector, record) {
    for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Tab', 'Tab', 'Tab', 'Tab']) {
        await page.keyboard.press(key);
        const sample = await page.locator(selector).evaluate(node => ({ inside: node.contains(document.activeElement), id: document.activeElement?.id, tag: document.activeElement?.tagName }));
        (record.focus ||= []).push({ selector, key, ...sample }); assert.equal(sample.inside, true, `${selector}: ${key} remains in the custom modal`);
    }
}
async function qrEvidence(page) {
    await page.waitForFunction(() => document.querySelector('#share-qrcode canvas') || document.querySelector('#share-qrcode img[src^="data:image/"]'));
    const evidence = await page.locator('#share-qrcode').evaluate(node => {
        const canvas = node.querySelector('canvas'), img = node.querySelector('img');
        if (canvas) { const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; let dark = 0, light = 0;
            for (let index = 0; index < bytes.length; index += 4) { if (bytes[index] < 100) dark++; if (bytes[index] > 200) light++; }
            return { kind: 'canvas', width: canvas.width, height: canvas.height, dark, light, data: canvas.toDataURL() }; }
        return { kind: 'image', width: img.naturalWidth, height: img.naturalHeight, data: img.src };
    });
    assert.equal(evidence.width, 180); assert.equal(evidence.height, 180);
    if (evidence.kind === 'canvas') assert.ok(evidence.dark > 100 && evidence.light > 100, 'Real QR canvas contains both modules and background');
    assert.ok(evidence.data.startsWith('data:image/')); evidence.sha256 = sha256(Buffer.from(evidence.data.split(',')[1], 'base64')); delete evidence.data; return evidence;
}
async function shareSuite() {
    for (const viewport of [VIEWPORTS[0], VIEWPORTS[3]]) await runCase(`share-qr-progress-keyboard-reopen-${viewport.width}`, async (page, record, current) => {
        await page.locator('#quest-title').fill('毎日の目標𠮷😀'); await page.locator('#quest-reward').fill('楽しい時間'); await setCount(page, 15, current);
        await page.locator('.stamp-spot[data-index="8"]').click(); const original = await readQuest(page), history = await page.evaluate(() => history.length);
        for (let cycle = 0; cycle < 3; cycle++) {
            await page.locator('#share-btn').focus(); await page.keyboard.press(cycle === 1 ? 'Space' : 'Enter'); await modalIs(page, '#share-modal', true); await focusIs(page, '#share-close-btn');
            assert.equal(await page.locator('#share-btn').getAttribute('aria-expanded'), 'true'); assert.equal(await page.locator('#share-with-progress').isChecked(), false);
            const cleanLink = await page.locator('#share-link-input').inputValue(); assert.deepEqual(decodeQuest(cleanLink), { ...original, stamps: Array(15).fill(false) });
            record.qrWithoutProgress = await qrEvidence(page);
            await page.locator('#share-with-progress').focus(); await page.keyboard.press('Space');
            const progressLink = await page.locator('#share-link-input').inputValue(); assert.deepEqual(decodeQuest(progressLink), original);
            record.qrWithProgress = await qrEvidence(page); assert.notEqual(record.qrWithProgress.sha256, record.qrWithoutProgress.sha256, 'Changing progress regenerates real QR modules');
            for (const selector of ['#share-close-btn', '#share-link-input', '#share-copy-btn']) await reachable(page, selector, record);
            const panel = await page.locator('#share-modal > div').evaluate(node => ({ width: node.clientWidth, scrollWidth: node.scrollWidth, height: node.clientHeight, scrollHeight: node.scrollHeight }));
            (record.sharePanels ||= []).push(panel); assert.ok(panel.scrollWidth <= panel.width + 1, `Share input/copy row fits the modal without horizontal overflow: ${JSON.stringify(panel)}`);
            await modalKeyboard(page, '#share-modal', record); await screenshot(page, `share-${viewport.width}-cycle${cycle}`);
            if (cycle === 1) await page.locator('#share-close-btn').click(); else await page.keyboard.press('Escape');
            await modalIs(page, '#share-modal', false); await focusIs(page, '#share-btn'); assert.equal(await page.locator('#share-btn').getAttribute('aria-expanded'), 'false');
            assert.equal(await page.evaluate(() => history.length), history, 'Share dialog does not create stale history entries');
        }
        await page.locator('#share-btn').click(); await page.locator('#share-modal').click({ position: { x: 2, y: 2 } }); await modalIs(page, '#share-modal', false); await focusIs(page, '#share-btn');
        assert.deepEqual(await readQuest(page), original, 'Sharing does not mutate quest or selected progress');
        if (viewport.width < 768) {
            await page.setViewportSize({ width: viewport.height, height: viewport.width }); await settle(current, 220);
            await page.locator('#share-btn').click();
            for (const selector of ['#share-close-btn', '#share-link-input', '#share-copy-btn']) await reachable(page, selector, record);
            await screenshot(page, `share-${viewport.width}-short-landscape`); await page.keyboard.press('Escape'); await modalIs(page, '#share-modal', false);
        }
        record.qrMethod = 'The real shipped QRCode library generated canvas/image bytes. No QR constructor, output or response was mocked.';
    }, {}, viewport);
    for (const mode of ['success', 'fallback-success', 'failure', 'pending-fail']) await runCase(`clipboard-${mode}`, async (page, record, current) => {
        await page.locator('#share-btn').click(); const expected = await page.locator('#share-link-input').inputValue();
        await page.locator('#share-copy-btn').click();
        if (mode === 'pending-fail') {
            assert.equal(await page.locator('#share-copy-btn').isDisabled(), true);
            await page.locator('#share-copy-btn').evaluate(node => node.click()); await page.keyboard.press('Escape'); await page.clock.runFor(800);
            await modalIs(page, '#share-modal', false); await focusIs(page, '#share-btn');
        } else await settle(current, 100);
        record.boundary = await page.evaluate(() => window.__questE2EBoundary);
        assert.equal(record.boundary.clipboard[0], expected);
        if (mode === 'pending-fail') assert.equal(record.boundary.clipboard.length, 1, 'Repeated pending copy does not launch duplicate clipboard requests');
        if (mode === 'success' || mode === 'fallback-success') assert.match(await text(page, '#toast-container'), /コピーしました/);
        else {
            assert.doesNotMatch(await text(page, '#toast-container'), /コピーしました/, 'Clipboard rejection and false execCommand never claim success');
            if (mode === 'failure') assert.match(await text(page, '#toast-container'), /コピー.*(?:でき|失敗)|(?:でき|失敗).*コピー/);
        }
        if (mode === 'fallback-success' || mode === 'failure') assert.equal(record.boundary.copyFallbacks, 1);
        if (mode !== 'pending-fail') await assertToastContrast(page, record);
    }, { clipboard: mode, clock: true });
    const saved = JSON.stringify(quest({ title: '受信前の自分の目標', stamps: [true, true, ...Array(8).fill(false)] }));
    const incoming = quest({ title: '共有先の目標𠮷', reward: '共有ごほうび😀', count: 7, stamps: [true, true, true, false, false, false, false] });
    for (const method of ['escape', 'cancel', 'backdrop', 'confirm']) await runCase(`share-import-${method}-history-and-storage`, async (page, record, current) => {
        await ready(current); const normalHistory = await page.evaluate(() => history.length);
        const url = new URL(shareURL(candidateUrl, incoming)); url.searchParams.set('keep', 'yes'); url.hash = 'preserved-share-fragment';
        await ready(current, url.href); await modalIs(page, '#share-import-modal', true); await focusIs(page, '#share-import-confirm-btn');
        assert.equal(await readSaved(page), saved, 'Opening shared URL does not replace saved quest'); await assertQuest(page, JSON.parse(saved));
        assert.match(await text(page, '#share-import-preview'), /共有先の目標𠮷/); await modalKeyboard(page, '#share-import-modal', record);
        const previewHistory = await page.evaluate(() => history.length);
        if (method === 'confirm') { await page.locator('#share-import-confirm-btn').focus(); await page.keyboard.press('Enter'); }
        else if (method === 'cancel') { await page.locator('#share-import-cancel-btn').focus(); await page.keyboard.press('Space'); }
        else if (method === 'backdrop') await page.locator('#share-import-modal').click({ position: { x: 2, y: 2 } });
        else await page.keyboard.press('Escape');
        await modalIs(page, '#share-import-modal', false); await focusIs(page, '#quest-title');
        const clean = new URL(page.url()); assert.equal(clean.searchParams.has('q'), false); assert.equal(clean.searchParams.get('keep'), 'yes'); assert.equal(clean.hash, '#preserved-share-fragment');
        assert.equal(await page.evaluate(() => history.length), previewHistory, 'Import decision replaces URL without adding a history entry');
        assert.equal(await readSaved(page), method === 'confirm' ? JSON.stringify(incoming) : saved); await assertQuest(page, method === 'confirm' ? incoming : JSON.parse(saved));
        await page.goBack({ waitUntil: 'load' }); await page.locator('.stamp-spot').first().waitFor(); await page.goForward({ waitUntil: 'load' }); await page.locator('.stamp-spot').first().waitFor();
        assert.equal(await page.locator('#share-import-modal').isVisible(), false, 'Forward navigation does not reopen a consumed/cancelled import');
        assert.equal(new URL(page.url()).searchParams.has('q'), false); record.history = { normalHistory, previewHistory, cleanedUrl: clean.href };
        await screenshot(page, `import-${method}`);
    }, { beforeReady: true, observeFocus: true, storage: { [KEY]: saved } });
    await runCase('share-import-existing-fragment-retains-modal-focus', async (page, record, current) => {
        const url = new URL(shareURL(candidateUrl, incoming)); url.hash = 'main-content'; await ready(current, url.href);
        await modalIs(page, '#share-import-modal', true); record.focusEvents = await page.evaluate(() => window.__questE2EBoundary.focus);
        await focusIs(page, '#share-import-confirm-btn'); await modalKeyboard(page, '#share-import-modal', record);
        await page.keyboard.press('Escape'); await modalIs(page, '#share-import-modal', false); await focusIs(page, '#quest-title');
        assert.equal(new URL(page.url()).hash, '#main-content'); assert.equal(new URL(page.url()).searchParams.has('q'), false); assert.equal(await readSaved(page), saved);
    }, { beforeReady: true, observeFocus: true, storage: { [KEY]: saved } });
    const invalid = [
        ['bad-base64', '!!!!'], ['malformed-json', Buffer.from('{').toString('base64url')], ['oversize', 'A'.repeat(4097)],
        ['unknown-field', encodeQuest({ ...incoming, unexpected: true })], ['invalid-count', encodeQuest({ ...incoming, count: 36 })],
        ['nonboolean-stamp', encodeQuest({ ...incoming, stamps: ['true', ...Array(6).fill(false)] })], ['long-title', encodeQuest({ ...incoming, title: 'あ'.repeat(31) })]
    ];
    for (const [name, q] of invalid) await runCase(`invalid-share-${name}-preserves-storage`, async (page, record) => {
        assert.equal(await page.locator('#share-import-modal').isVisible(), false); assert.equal(new URL(page.url()).searchParams.has('q'), false);
        assert.equal(await readSaved(page), saved); assert.match(await text(page, '#toast-container'), /共有データを読み込めません/); await assertQuest(page, JSON.parse(saved)); record.input = name;
    }, { storage: { [KEY]: saved }, url: `${candidateUrl}?q=${encodeURIComponent(q)}`, expectedConsole: [/デシリアライズ失敗/] });
    await runCase('duplicate-shared-query-is-rejected', async page => {
        assert.equal(await page.locator('#share-import-modal').isVisible(), false); assert.equal(await readSaved(page), saved); assert.equal(new URL(page.url()).searchParams.has('q'), false);
    }, { storage: { [KEY]: saved }, url: `${candidateUrl}?q=${encodeQuest(incoming)}&q=${encodeQuest(incoming)}` });
}
async function helpSuite() {
    for (const viewport of [VIEWPORTS[0], VIEWPORTS[3]]) await runCase(`help-native-dialog-escape-and-reopen-${viewport.width}`, async (page, record) => {
        const dialog = page.locator('#help-modal'), opener = page.locator('#help-btn');
        for (let cycle = 0; cycle < 3; cycle++) {
            await opener.focus(); await page.keyboard.press('Enter'); assert.equal(await dialog.evaluate(node => node.open && node.matches(':modal')), true);
            assert.equal(await opener.getAttribute('aria-expanded'), 'true');
            if (cycle === 1) {
                // 遅延した前回close通知が再表示中のaria-expandedを壊さないことを再現。
                await dialog.evaluate(node => node.dispatchEvent(new Event('close')));
                assert.equal(await opener.getAttribute('aria-expanded'), 'true', 'Stale close event cannot hide the open dialog state');
            }
            for (let index = 0; index < 4; index++) {
                await page.keyboard.press('Tab');
                const result = await dialog.evaluate(node => ({ inside: node.contains(document.activeElement), root: document.activeElement === document.body || document.activeElement === document.documentElement }));
                assert.ok(result.inside || result.root, 'Native dialog never focuses background page controls');
                if (!result.inside) { await page.keyboard.press('Tab'); assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true); }
            }
            await page.locator('#quest-title').evaluate(node => node.focus()); assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
            if (cycle === 1) await dialog.locator('[data-action="parents-modal-close"]').last().click(); else await page.keyboard.press('Escape');
            await eventually(() => dialog.evaluate(node => node.open), false, 'Native dialog closes');
            await eventually(() => opener.getAttribute('aria-expanded'), 'false', 'Native close/cancel synchronizes aria-expanded'); await focusIs(page, '#help-btn');
        }
        await opener.click(); await screenshot(page, `help-${viewport.width}`); await page.keyboard.press('Escape');
        await eventually(() => dialog.evaluate(node => node.open), false, 'Fourth native dialog closes');
        await eventually(() => opener.getAttribute('aria-expanded'), 'false', 'Fourth close synchronizes aria-expanded'); await focusIs(page, '#help-btn');
        record.closedCycles = 4;
    }, {}, viewport);
}
// CSS計算値ではなく、Chromiumが返すPDFの実ページ辞書/MediaBoxを読む。
function inspectPDF(bytes) {
    const source = bytes.toString('latin1'); assert.ok(source.startsWith('%PDF-'));
    const objects = new Map([...source.matchAll(/(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/g)].map(match => [`${match[1]} ${match[2]}`, match[3]]));
    const pages = [...objects.entries()].filter(([, object]) => /\/Type\s*\/Page\b/.test(object));
    assert.ok(pages.length > 0, 'Actual PDF page objects readable; unsupported object streams must fail explicitly');
    const mediaBox = (object, seen = new Set()) => {
        const direct = /\/MediaBox\s*\[([^\]]+)\]/.exec(object); if (direct) return direct[1].trim().split(/\s+/).map(Number);
        const indirect = /\/MediaBox\s+(\d+)\s+(\d+)\s+R/.exec(object);
        if (indirect) { const array = objects.get(`${indirect[1]} ${indirect[2]}`)?.match(/\[([^\]]+)\]/); if (array) return array[1].trim().split(/\s+/).map(Number); }
        const parent = /\/Parent\s+(\d+)\s+(\d+)\s+R/.exec(object), key = parent && `${parent[1]} ${parent[2]}`;
        assert.ok(key && !seen.has(key) && objects.has(key), 'Every PDF page resolves a finite MediaBox'); seen.add(key); return mediaBox(objects.get(key), seen);
    };
    return { bytes: bytes.length, sha256: sha256(bytes), pageCount: pages.length, pages: pages.map(([object, body]) => { const box = mediaBox(body); assert.equal(box.length, 4); assert.ok(box.every(Number.isFinite)); return { object, mediaBox: box, widthPoints: box[2] - box[0], heightPoints: box[3] - box[1] }; }) };
}
function assertPDFGrid(words, visibleNumbers) {
    const numberWords = words.filter(word => /^\d+$/.test(word.text) && visibleNumbers.includes(Number(word.text)));
    // 日本語の報酬に含まれる小さい数字はスタンプ番号ではない。実PDFの最大番号フォント高から分離する。
    const maximumHeight = Math.max(...numberWords.map(word => word.yMax - word.yMin));
    const numbers = numberWords.filter(word => word.yMax - word.yMin >= maximumHeight * .9).map(word => ({ ...word, value: Number(word.text), cx: (word.xMin + word.xMax) / 2, cy: (word.yMin + word.yMax) / 2 }));
    for (const value of visibleNumbers) assert.equal(numbers.filter(word => word.value === value).length, 1, `Actual PDF has one visible stamp number ${value}`);
    const unique = values => values.sort((a, b) => a - b).reduce((result, value) => { if (!result.length || value - result.at(-1) > 2) result.push(value); return result; }, []);
    const pitch = values => { const positions = unique(values); return positions.length > 1 ? Math.min(...positions.slice(1).map((value, index) => value - positions[index])) : Infinity; };
    const xPitch = pitch(numbers.map(word => word.cx)), yPitch = pitch(numbers.map(word => word.cy)), cellPitch = Math.min(xPitch, yPitch);
    assert.ok(Number.isFinite(cellPitch), 'Actual PDF has measurable spacing between visible stamp numbers');
    // 実PDFから得られるセル間隔は円直径の上限。番号の四隅に3pt残せないセルは必ず窮屈/重なりなので不合格。
    const safeRadiusUpperBound = cellPitch / 2 - 3;
    for (const word of numbers) {
        const cornerRadius = Math.hypot((word.xMax - word.xMin) / 2, (word.yMax - word.yMin) / 2);
        assert.ok(cornerRadius <= safeRadiusUpperBound + .25, `Actual PDF stamp ${word.value}: text bounds need ${cornerRadius.toFixed(2)}pt radius, spacing permits only ${safeRadiusUpperBound.toFixed(2)}pt with3pt inset`);
    }
    const goal = words.find(word => word.text === 'GOAL'), rewardLabel = words.find(word => word.text === 'CLEAR');
    assert.ok(goal && rewardLabel, 'Actual PDF exposes GOAL and reward label geometry');
    assert.ok(goal.yMax + 6 <= rewardLabel.yMin, `Actual PDF GOAL does not intrude into reward area: ${goal.yMax} vs ${rewardLabel.yMin}`);
    return { numbers, xPitch: Number.isFinite(xPitch) ? xPitch : null, yPitch: Number.isFinite(yPitch) ? yPitch : null, safeRadiusUpperBound, goal, rewardLabel,
        method: 'Actual Poppler number glyph bounds and cell pitches;3pt inset is a necessary readability bound. Separate DOM assertions require each number rectangle to fit its measured circular border with2px inset.' };
}
async function savePDF(page, name, landscape, record) {
    await page.evaluate(() => document.fonts.ready);
    const expectedText = { title: await text(page, '#disp-title'), reward: await text(page, '#disp-reward') };
    await page.emulateMedia({ media: null });
    const bytes = await page.pdf({ path: path.join(artifactDir, `${name}.pdf`), format: 'A4', landscape, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    const pdf = inspectPDF(bytes); (record.pdf ||= []).push({ name, landscape, ...pdf }); await writeJSON(`${name}-pdf.json`, pdf);
    assert.equal(pdf.pageCount, 1, 'Actual quest PDF is one complete page, without blank/overflow pages');
    const expected = landscape ? [297, 210] : [210, 297];
    for (const sheet of pdf.pages) { assert.ok(Math.abs(sheet.widthPoints - expected[0] / 25.4 * 72) <= 1); assert.ok(Math.abs(sheet.heightPoints - expected[1] / 25.4 * 72) <= 1); }
    const pdfPath = path.join(artifactDir, `${name}.pdf`), bboxPath = path.join(artifactDir, `${name}-bbox.xhtml`);
    // 実PDFの字形配置をPopplerでも独立検査し、目視可能なPNGを残す。CIにはpoppler-utilsが必要。
    await runTool('pdftotext', ['-bbox-layout', pdfPath, bboxPath], { timeout: 30_000 });
    const { stdout: pdfText } = await runTool('pdftotext', ['-layout', pdfPath, '-'], { timeout: 30_000, maxBuffer: 2_000_000 });
    await writeFile(path.join(artifactDir, `${name}-text.txt`), pdfText);
    const { stdout: pdfFonts } = await runTool('pdffonts', [pdfPath], { timeout: 30_000 });
    await writeFile(path.join(artifactDir, `${name}-fonts.txt`), pdfFonts);
    const bbox = await readFile(bboxPath, 'utf8');
    const words = [...bbox.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)"[^>]*>([\s\S]*?)<\/word>/g)].map(match => ({ xMin: +match[1], yMin: +match[2], xMax: +match[3], yMax: +match[4], text: match[5] }));
    assert.ok(words.length >= 5, 'Actual PDF contains readable quest text');
    for (const word of words) assert.ok(word.xMin >= -.5 && word.yMin >= -.5 && word.xMax <= pdf.pages[0].widthPoints + .5 && word.yMax <= pdf.pages[0].heightPoints + .5, `Actual PDF text remains on the physical page: ${JSON.stringify(word)}`);
    const plain = pdfText.replace(/\s+/g, ''), bmp = value => Array.from(value).filter(char => char.codePointAt(0) <= 0xFFFF).join('').replace(/\s+/g, '');
    assert.ok(plain.includes(bmp(expectedText.title)), 'Actual PDF preserves readable Japanese quest title');
    assert.ok(plain.includes(bmp(expectedText.reward)), 'Actual PDF preserves readable Japanese reward');
    assert.doesNotMatch(pdfText, /保護者の方へ|現在の進捗|このクエストを取り込む|別の端末と共有/, 'Actual PDF excludes dialogs/sidebar');
    const visibleNumbers = await page.evaluate(() => [...document.querySelectorAll('.stamp-spot')].filter(node => !document.querySelector('#print-with-stamps').checked || !node.classList.contains('stamped')).map(node => Number(node.dataset.index)));
    await writeJSON(`${name}-glyph-evidence.json`, { visibleNumbers, words });
    await runTool('pdftoppm', ['-singlefile', '-scale-to', '1600', '-png', pdfPath, path.join(artifactDir, `${name}-actual-pdf`)], { timeout: 60_000 });
    const raster = await readFile(path.join(artifactDir, `${name}-actual-pdf.png`));
    assert.ok(raster.length > 1000, 'Poppler rendered actual PDF glyphs/stamp graphics');
    pdf.content = { expectedText, nonBMPCharacters: Array.from(expectedText.title + expectedText.reward).filter(char => char.codePointAt(0) > 0xFFFF), nonBMPReview: 'Actual PDF raster retains supplementary kanji/emoji evidence; pdftotext is not required to represent color glyphs identically. Inspect raster before merge.', fonts: `${name}-fonts.txt`, wordCount: words.length, textSHA256: sha256(pdfText), rasterSHA256: sha256(raster), raster: `${name}-actual-pdf.png`, bbox: `${name}-bbox.xhtml` };
    pdf.gridEvidence = assertPDFGrid(words, visibleNumbers);
    await writeJSON(`${name}-pdf.json`, pdf); return pdf;
}
async function printMetrics(page) {
    return page.evaluate(() => {
        const box = node => { const rect = node.getBoundingClientRect(); return Object.fromEntries(['left', 'right', 'top', 'bottom', 'width', 'height'].map(key => [key, rect[key]])); };
        const cardNode = document.querySelector('#quest-card'), card = box(cardNode), cardStyle = getComputedStyle(cardNode), number = value => parseFloat(value) || 0;
        const contentLeft = card.left + number(cardStyle.borderLeftWidth) + number(cardStyle.paddingLeft), contentRight = card.right - number(cardStyle.borderRightWidth) - number(cardStyle.paddingRight);
        const goalNode = document.querySelector('.stamp-spot.goal'), goal = box(goalNode), pseudo = getComputedStyle(goalNode, '::after'), goalStyle = getComputedStyle(goalNode);
        const pseudoBottom = pseudo.bottom.endsWith('%') ? number(pseudo.bottom) * goalNode.clientHeight / 100 : number(pseudo.bottom);
        const goalBottom = goal.bottom - number(goalStyle.borderBottomWidth) - pseudoBottom;
        const goalHeight = number(pseudo.height) || number(pseudo.lineHeight) || number(pseudo.fontSize);
        return { card, cardContent: { left: contentLeft, right: contentRight, width: contentRight - contentLeft }, header: box(document.querySelector('.quest-header')), grid: box(document.querySelector('#stamp-grid')), reward: box(document.querySelector('.reward-area')),
            goalLabel: { top: goalBottom - goalHeight, bottom: goalBottom, fontSize: pseudo.fontSize, height: goalHeight, bottomStyle: pseudo.bottom },
            title: document.querySelector('#disp-title').textContent, rewardText: document.querySelector('#disp-reward').textContent,
            stamps: [...document.querySelectorAll('.stamp-spot')].map(node => ({ index: Number(node.dataset.index), box: box(node), numberBox: box(node.querySelector('.stamp-number')), borderWidth: number(getComputedStyle(node).borderLeftWidth), pressed: node.getAttribute('aria-pressed'), markDisplay: getComputedStyle(node.querySelector('.stamp-mark')).display, numberColor: getComputedStyle(node.querySelector('.stamp-number')).color })),
            cardBackground: getComputedStyle(cardNode).backgroundColor, bodyBackground: getComputedStyle(document.body).backgroundColor,
            noPrint: [...document.querySelectorAll('.no-print,#help-modal,#toast-container')].map(node => ({ id: node.id || node.tagName, display: getComputedStyle(node).display })),
            transform: getComputedStyle(cardNode).transform, motion: ['body', '#quest-card', '.stamp-spot'].map(selector => { const style = getComputedStyle(document.querySelector(selector)); return { selector, transitionProperty: style.transitionProperty, transitionDuration: style.transitionDuration, animationName: style.animationName, animationDuration: style.animationDuration }; }) };
    });
}
function assertPrintGeometry(metrics) {
    for (const name of ['header', 'grid', 'reward']) {
        const rect = metrics[name], content = metrics.cardContent;
        assert.ok(Math.abs(rect.left - content.left) <= 1.5 && Math.abs(rect.right - content.right) <= 1.5, `Printed ${name} spans card inner width: ${JSON.stringify({ rect, content })}`);
    }
    for (const stamp of metrics.stamps) {
        const outer = stamp.box, inner = stamp.numberBox, cx = (outer.left + outer.right) / 2, cy = (outer.top + outer.bottom) / 2;
        const radius = Math.min(outer.width, outer.height) / 2 - stamp.borderWidth - 2;
        assert.ok(Math.abs(outer.width - outer.height) <= 1, `Printed stamp ${stamp.index} remains circular`);
        if (stamp.markDisplay === 'none') for (const x of [inner.left, inner.right]) for (const y of [inner.top, inner.bottom]) {
            assert.ok(Math.hypot(x - cx, y - cy) <= radius + .5, `Printed stamp ${stamp.index}: number rectangle fits circle inside its border with2px safety ${JSON.stringify(stamp)}`);
        }
    }
    assert.ok(metrics.goalLabel.bottom + 2 <= metrics.reward.top, `Printed GOAL label has2px clearance before reward: ${JSON.stringify({ goal: metrics.goalLabel, reward: metrics.reward })}`);
}
async function printSuite() {
    for (const landscape of [false, true]) for (const count of [5, 10, 35]) for (const withStamps of [false, true]) {
        const name = `pdf-${landscape ? 'landscape' : 'portrait'}-${count}-${withStamps ? 'stamped' : 'blank'}`;
        await runCase(name, async (page, record, current) => {
            await setCount(page, count, current); await page.locator('.stamp-spot[data-index="3"]').click();
            await page.locator('#quest-title').fill('印刷する目標𠮷😀'); await page.locator('#quest-reward').fill('印刷するごほうび');
            await page.locator('#print-with-stamps').setChecked(withStamps);
            await savePDF(page, name, landscape, record);
            await page.setViewportSize(landscape ? { width: 1123, height: 794 } : { width: 794, height: 1123 });
            await page.emulateMedia({ media: 'print' }); await settle(current, 200); record.print = await printMetrics(page); assertPrintGeometry(record.print);
            assert.equal(record.print.stamps.length, count); assert.equal(record.print.title, '印刷する目標𠮷😀');
            assert.equal(record.print.cardBackground, 'rgb(255, 255, 255)'); assert.equal(record.print.transform, 'none');
            for (const node of record.print.noPrint) assert.equal(node.display, 'none', `${node.id}: nonprinting UI hidden`);
            for (const stamp of record.print.stamps) assert.equal(stamp.markDisplay !== 'none', withStamps && stamp.pressed === 'true', 'Print stamps checkbox controls actual computed visibility');
            assert.ok(record.print.grid.bottom <= record.print.reward.top + 1, 'Printed stamps do not overlap reward');
            assert.ok(record.print.reward.bottom <= record.print.card.bottom + 1, 'Reward stays inside printed card');
            await screenshot(page, `${name}-print-media`);
            await page.emulateMedia({ media: 'screen' }); await page.setViewportSize(VIEWPORTS[1]); await settle(current, 220);
            assert.equal(await pressed(page), 3, 'Printing never deletes stored progress'); assert.equal((await readQuest(page)).stamps.filter(Boolean).length, 3);
            await reachable(page, '.stamp-spot[data-index="1"]', record, 44);
        }, {}, VIEWPORTS[1]);
    }
    for (const landscape of [false, true]) await runCase(`pdf-${landscape ? 'landscape' : 'portrait'}-35-max30-japanese`, async (page, record, current) => {
        const title = '毎日がんばる'.repeat(5), reward = '達成ごほうび'.repeat(5);
        assert.equal(codePoints(title).length, 30); assert.equal(codePoints(reward).length, 30);
        await setCount(page, 35, current); await page.locator('.stamp-spot[data-index="3"]').click();
        await page.locator('#quest-title').fill(title); await page.locator('#quest-reward').fill(reward); await page.locator('#print-with-stamps').uncheck();
        const name = `pdf-${landscape ? 'landscape' : 'portrait'}-35-max30-japanese`; await savePDF(page, name, landscape, record);
        await page.setViewportSize(landscape ? { width: 1123, height: 794 } : { width: 794, height: 1123 }); await page.emulateMedia({ media: 'print' });
        // viewportと印刷メディアの切替が描画へ反映されてから長文の配置を測る。
        // 即時の白背景・遷移停止は別ケースで待機なしのまま検証する。
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        record.print = await printMetrics(page); assertPrintGeometry(record.print);
        assert.equal(record.print.title, title); assert.equal(record.print.rewardText, reward); assert.equal(record.print.stamps.length, 35);
        assert.ok(record.print.grid.bottom <= record.print.reward.top + 1); assert.ok(record.print.reward.bottom <= record.print.card.bottom + 1);
        await screenshot(page, `${name}-print-media`); record.fixture = { title, reward, titleCodePoints: 30, rewardCodePoints: 30, count: 35, withStamps: false };
    }, {}, VIEWPORTS[1]);
    for (const reduceMotion of [true, false]) for (const modal of ['help', 'share']) await runCase(`dark-${reduceMotion ? 'reduced-motion' : 'ordinary-motion'}-open-${modal}-print`, async (page, record, current) => {
        const suffix = reduceMotion ? '' : '-ordinary-motion';
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-night')), true);
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('reduce-motion')), reduceMotion);
        assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), false, 'OS preference is normal motion in both saved-profile tests');
        await setCount(page, 35, current); await page.locator('.stamp-spot[data-index="10"]').click();
        const animation = await page.locator('.stamp-spot.stamped').first().evaluate(node => ({ animation: getComputedStyle(node).animationDuration, transition: getComputedStyle(node).transitionDuration }));
        if (reduceMotion) assert.ok(parseFloat(animation.animation) <= .001 && parseFloat(animation.transition) <= .001, 'Saved reduce-motion preference works even with OS no-preference');
        else assert.ok(parseFloat(animation.animation) > .1, 'Ordinary-motion screen really has animation enabled before printing');
        await page.locator('#print-with-stamps').check(); await page.locator(modal === 'help' ? '#help-btn' : '#share-btn').click();
        await screenshot(page, `dark-${modal}-open${suffix}`); await savePDF(page, `dark-${modal}-open-landscape${suffix}`, true, record);
        await page.setViewportSize({ width: 1123, height: 794 }); await page.emulateMedia({ media: 'print' });
        // 待機を挟まず取得する。1秒の暗色背景遷移が終わるまで待って不具合を隠さない。
        record.immediatePrint = await printMetrics(page);
        assert.equal(record.immediatePrint.cardBackground, 'rgb(255, 255, 255)'); assert.equal(record.immediatePrint.bodyBackground, 'rgb(255, 255, 255)', 'Print switches immediately to white even when screen motion is enabled');
        assert.equal(record.immediatePrint.transform, 'none', 'Print card is unscaled immediately');
        for (const motion of record.immediatePrint.motion) {
            assert.equal(motion.animationName, 'none', `${motion.selector}: print has no active animation`);
            assert.ok(motion.transitionDuration.split(',').every(value => parseFloat(value) === 0), `${motion.selector}: print transitions are disabled immediately`);
        }
        assertPrintGeometry(record.immediatePrint); record.print = record.immediatePrint;
        for (const node of record.print.noPrint) assert.equal(node.display, 'none', `${node.id}: open modal excluded from print`);
        assert.equal(record.print.stamps.filter(stamp => stamp.markDisplay !== 'none').length, 10);
        await screenshot(page, `dark-${modal}-print-media${suffix}`); await page.emulateMedia({ media: 'screen' }); await page.keyboard.press('Escape'); await settle(current, 220);
        assert.equal(await page.locator(modal === 'help' ? '#help-modal' : '#share-modal').isVisible(), false); await page.locator('#quest-title').fill('印刷後も編集可能');
        assert.equal(await text(page, '#disp-title'), '印刷後も編集可能'); record.motion = animation;
    }, { motion: 'no-preference', storage: { [PROFILE]: JSON.stringify({ darkMode: true, reduceMotion, isMuted: true }) } }, VIEWPORTS[3]);
    await runCase('real-pdf-beforeprint-flushes-pending-range', async (page, record, current) => {
        await setCount(page, 31, current, { commit: false, wait: false });
        await savePDF(page, 'pending-slider-actual-pdf', true, record);
        assert.equal(await page.locator('.stamp-spot').count(), 31); assert.equal((await readQuest(page)).count, 31, 'Native printToPDF beforeprint flushes pending UI and save');
    }, { clock: true }, VIEWPORTS[3]);
}
// 変更前の印刷不具合を合格条件へ混ぜず、同一入力の実PDFを独立した比較証拠として残す。
async function capturePDFComparisonArtifacts(name, bytes) {
    const pdf = inspectPDF(bytes), pdfPath = path.join(artifactDir, `${name}.pdf`), bboxPath = path.join(artifactDir, `${name}-bbox.xhtml`);
    await runTool('pdftotext', ['-bbox-layout', pdfPath, bboxPath], { timeout: 30_000 });
    const { stdout: text } = await runTool('pdftotext', ['-layout', pdfPath, '-'], { timeout: 30_000, maxBuffer: 2_000_000 });
    const { stdout: fonts } = await runTool('pdffonts', [pdfPath], { timeout: 30_000 });
    await writeFile(path.join(artifactDir, `${name}-text.txt`), text); await writeFile(path.join(artifactDir, `${name}-fonts.txt`), fonts);
    const bbox = await readFile(bboxPath, 'utf8');
    const pageTextBounds = [...bbox.matchAll(/<page width="([^"]+)" height="([^"]+)"[^>]*>([\s\S]*?)<\/page>/g)].map((match, page) => {
        const words = [...match[3].matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)"[^>]*>([\s\S]*?)<\/word>/g)].map(word => ({ xMin: +word[1], yMin: +word[2], xMax: +word[3], yMax: +word[4], text: word[5] }));
        return { page: page + 1, width: +match[1], height: +match[2], wordCount: words.length, words };
    });
    // baselineは元から複数ページの場合があるため、先頭だけでなく実際の全ページを描画する。
    const prefix = `${name}-comparison-page`; await runTool('pdftoppm', ['-scale-to', '1400', '-png', pdfPath, path.join(artifactDir, prefix)], { timeout: 60_000 });
    const images = (await readdir(artifactDir)).filter(file => file.startsWith(`${prefix}-`) && file.endsWith('.png')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    assert.equal(images.length, pdf.pageCount, 'Every real comparison PDF page has a raster artifact');
    const raster = await Promise.all(images.map(async file => ({ file, sha256: sha256(await readFile(path.join(artifactDir, file))) })));
    return { ...pdf, text, textFile: `${name}-text.txt`, textSHA256: sha256(text), fontsFile: `${name}-fonts.txt`, bboxFile: `${name}-bbox.xhtml`, pageTextBounds, raster };
}
async function baselinePrintEvidenceSuite() {
    if (!baselineUrl) return;
    for (const landscape of [false, true]) await runCase(`baseline-pdf-evidence-${landscape ? 'landscape' : 'portrait'}-35`, async (page, record, current) => {
        const title = '印刷する目標𠮷😀', reward = '印刷するごほうび';
        await setCount(page, 35, current); await page.locator('.stamp-spot[data-index="3"]').click();
        await page.locator('#quest-title').fill(title); await page.locator('#quest-reward').fill(reward); await page.locator('#print-with-stamps').check();
        await page.evaluate(() => document.fonts.ready);
        record.fixture = { viewport: VIEWPORTS[1], title, reward, count: 35, stamped: 3, withStamps: true, landscape, format: 'A4', preferCSSPageSize: true };
        record.baselineScreen = await layoutMetrics(page);
        const name = landscape ? 'baseline-landscape-35' : 'baselineportrait35';
        await page.emulateMedia({ media: null });
        const bytes = await page.pdf({ path: path.join(artifactDir, `${name}.pdf`), format: 'A4', landscape, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
        record.baseline = await capturePDFComparisonArtifacts(name, bytes);
        record.baseline.assetManifestSHA256 = sha256(JSON.stringify(manifests.get('baseline').manifest));
        const candidateName = `pdf-${landscape ? 'landscape' : 'portrait'}-35-stamped`;
        try {
            const candidateBytes = await readFile(path.join(artifactDir, `${candidateName}.pdf`));
            record.candidate = await capturePDFComparisonArtifacts(candidateName, candidateBytes);
            record.candidate.assetManifestSHA256 = sha256(JSON.stringify(manifests.get('candidate').manifest));
            record.pageCountDifference = record.candidate.pageCount - record.baseline.pageCount;
        } catch (error) { if (error.code !== 'ENOENT' || error.path !== path.join(artifactDir, `${candidateName}.pdf`)) throw error; record.candidateUnavailable = 'Candidate case failed before emitting its PDF; do not infer a baseline comparison.'; }
        record.method = 'Same synthetic35-stamp title/reward/three-stamped/checked-print-option and390px viewport as candidate actual-PDF case. Immutable original build. Baseline page count, text and all-page raster are evidence only; no baseline one-page/layout assertion. Candidate one-page and physical text-bounds requirements remain unchanged in its original cases.';
        const metrics = `${name}-comparison.json`; await writeJSON(metrics, record);
        if (record.candidate) imagePairs.push({ name: `Actual PDF ${landscape ? 'landscape' : 'portrait'} 35 stamps: first pages (baseline ${record.baseline.pageCount}, candidate ${record.candidate.pageCount}; all pages in metrics/gallery)`, before: record.baseline.raster[0].file, after: record.candidate.raster[0].file, metrics });
    }, { url: baselineUrl }, VIEWPORTS[1]);
}
async function nativeSuite() {
    for (const viewport of VIEWPORTS) await runCase(`native-fonts-first-reload-${viewport.width}`, async (page, record, current) => {
        record.loads = [];
        for (let pass = 0; pass < 2; pass++) {
            if (pass) await ready(current, candidateUrl, { reload: true });
            const metrics = await layoutMetrics(page); requireFonts(metrics); await noHorizontalOverflow(page, record); record.loads.push(metrics);
            assert.equal(await page.locator('.stamp-spot').count(), 10); assert.equal(await readSaved(page), null, 'Fresh native visit/reload does not create a saved quest');
            await screenshot(page, `native-${viewport.width}-${pass ? 'reload' : 'first'}`);
        }
        record.serviceWorker = await page.evaluate(() => ({ supported: 'serviceWorker' in navigator, controller: navigator.serviceWorker?.controller?.scriptURL || null }));
        record.method = 'Fresh actual browser fonts and service workers; no routing, clock, storage fixture, init script or browser-boundary replacement';
    }, { native: true }, viewport);
}
async function productionSuite() {
    const url = new URL(productionUrl); assert.equal(url.protocol, 'https:'); assert.equal(url.search, ''); assert.equal(url.hash, '');
    assert.ok(url.pathname.endsWith('/quest_board/'), 'Production must be the untouched normal Quest Board URL');
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
                const references = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(node => node.src || node.href));
                await Promise.all(pending);
                const required = ['quest_board/index.html', ...references.filter(value => value.startsWith(publicRoot.href)).map(value => decodeURIComponent(new URL(value).pathname.slice(publicRoot.pathname.length)))];
                const metrics = await layoutMetrics(page); requireFonts(metrics); await noHorizontalOverflow(page, record);
                const load = { pass: pass ? 'reload' : 'first', url: page.url(), assets: [...received.values()], required, captureErrors, metrics }; record.loads.push(load); await writeJSON(`production-${viewport.width}-loads.json`, record.loads);
                for (const relative of new Set(required)) {
                    assert.ok(expectedByPath.has(relative), `${relative}: deployed asset belongs to final candidate build`); const actual = received.get(relative);
                    assert.ok(actual, `${relative}: actual navigation/reload fetched response bytes`); assert.equal(actual.status, 200); assert.equal(actual.sha256, expectedByPath.get(relative).sha256, `${relative}: deployed SHA256 equals expected final asset`);
                }
                assert.deepEqual(captureErrors, []);
                const comparable = value => ({ title: value.title, anchors: value.anchors, controls: value.controls, overflow: value.overflow, card: value.card });
                assert.deepEqual(comparable(metrics), comparable(local), 'Live semantic DOM, controls and computed layout match immutable final build');
                assert.equal(await readSaved(page), null, 'Normal production initial/reload does not save a quest');
                await screenshot(page, `production-${viewport.width}-${pass ? 'reload' : 'first'}`);
            } finally { page.off('response', listener); }
        }
        await page.locator('#help-btn').click(); await page.keyboard.press('Escape'); await eventually(() => page.locator('#help-btn').getAttribute('aria-expanded'), 'false', 'Production help native Escape state');
        await page.locator('#share-btn').click(); record.qr = await qrEvidence(page); await page.keyboard.press('Escape');
        assert.equal(await readSaved(page), null, 'Read-only production help/share inspection does not create saved state');
        record.method = 'Fresh context per viewport; normal HTTPS URL first/reload; real browser fonts/service workers; response SHA256 and read-only DOM/style inspection. No route, clock, seeding, addInitScript or browser-boundary replacement. No quest edit/import or persistent production mutation.';
    }, { native: true, beforeReady: true, url: url.href }, viewport);
}
async function imageReview() {
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    await writeJSON('image-review-manifest.json', { pairs: imagePairs, note: 'PNG/PDF evidence is not a claim of human visual review. Original copy/computed appearance and independently bounded functionality are asserted; targeted repair geometry is recorded explicitly.' });
    const files = await readdir(artifactDir), images = files.filter(name => name.endsWith('.png')).sort(), pdfs = files.filter(name => name.endsWith('.pdf')).sort();
    await writeFile(path.join(artifactDir, 'index.htm'), `<!doctype html><html lang="ja"><meta charset="utf-8"><title>クエストボード 実ビルド検証</title><style>body{font-family:system-ui;margin:24px;background:#e2e8f0;color:#0f172a}section{padding:16px;background:white;margin:24px 0;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{max-width:100%;border:1px solid #94a3b8}figure{margin:0;min-width:0}.overlay{position:relative}.overlay img+img{position:absolute;left:0;top:0;opacity:.5}</style><h1>クエストボード 実ビルド検証</h1><p>左：変更前、右：変更後。初期本文・計算済みスタイルを比較し、タップ領域/応答性の修正による寸法差は実測JSONに記録します。PDFは実ページ数・A4寸法を別途検査します。</p>${imagePairs.map(pair => `<section><h2>${escape(pair.name)}</h2><a href="${escape(pair.metrics)}">実測JSON</a><div class="pair"><figure>${pair.before ? `<img loading="lazy" src="${escape(pair.before)}">` : '<p>基準未指定</p>'}</figure><figure><img loading="lazy" src="${escape(pair.after)}"></figure></div>${pair.before ? `<details><summary>50%重ね合わせ</summary><div class="overlay"><img loading="lazy" src="${escape(pair.before)}"><img loading="lazy" src="${escape(pair.after)}"></div></details>` : ''}</section>`).join('')}<h2>実印刷PDF</h2><ul>${pdfs.map(name => `<li><a href="${escape(name)}">${escape(name)}</a></li>`).join('')}</ul><h2>操作・障害・本番の画像</h2>${images.map(name => `<details><summary>${escape(name)}</summary><img loading="lazy" src="${escape(name)}"></details>`).join('')}</html>`);
}
try {
    assert.ok(['browser', 'api'].includes(fontMode), 'QUEST_BOARD_FONT_MODE must be browser or api');
    await mkdir(artifactDir, { recursive: true }); candidateUrl = await serveDist(dist); await manifestAssets(dist, 'candidate');
    if (baselineDist) { assert.notEqual(dist, baselineDist); baselineUrl = await serveDist(baselineDist); await manifestAssets(baselineDist, 'baseline'); }
    else console.log('[INFO] QUEST_BOARD_BASELINE_ROOT unset: baseline comparison explicitly skipped.');
    await writeJSON('asset-verification-before.json', await Promise.all([...manifests.keys()].map(verifyAssets)));
    browser = await chromium.launch({ headless: true });
    await writeJSON('run-metadata.json', { browser: 'Chromium', version: browser.version(), dist, baselineDist, productionUrl, fontMode, viewports: VIEWPORTS,
        method: 'Immutable actual Vite dist; app runtime/state is never imported or patched. Explicit fixtures: storage contents/errors, audio constructor failure, clipboard failures, OS print observer, IME DOM events, range input/change events, synthetic input burst and lifecycle clock. Real storage events use two pages. Real QR library and PDF bytes always run. Native and production passes prohibit fixtures and routing.' });
    if (productionUrl) await productionSuite();
    else { await initialSuite(); await countsSuite(); await inputSuite(); await storageSuite(); await shareSuite(); await helpSuite(); await printSuite(); await baselinePrintEvidenceSuite(); await nativeSuite(); }
    if (failures.length) throw new AggregateError(failures, `Quest Board E2E: ${failures.length}/${results.length} cases failed; see ${artifactDir}/results.json`);
    console.log(`[OK] Quest Board E2E: ${results.length} cases passed. Artifacts: ${artifactDir}`);
} catch (error) {
    await writeJSON('run-error.json', { error: error.stack || String(error), completedCases: results.length }).catch(() => {}); throw error;
} finally {
    try {
        await writeJSON('asset-verification-after.json', await Promise.all([...manifests.keys()].map(verifyAssets))); await imageReview(); await writeJSON('results.json', results);
        await writeJSON('summary.json', { total: results.length, passed: results.filter(result => result.status === 'passed').length, failed: failures.length,
            baselineComparison: baselineDist ? 'requested' : 'explicitly skipped', mode: productionUrl ? 'production-native-verification' : 'local-built-e2e', artifactDir });
    } finally { await browser?.close(); for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

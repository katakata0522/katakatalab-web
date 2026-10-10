import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 確定した実ビルドを無加工で配信する。アプリ内部の状態・関数は参照も置換もしない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const baselineDist = process.env.PAPER_GEN_BASELINE_ROOT ? path.resolve(process.env.PAPER_GEN_BASELINE_ROOT) : null;
const productionUrl = process.env.PAPER_GEN_PRODUCTION_URL || null;
const artifactDir = path.resolve(process.env.PAPER_GEN_ARTIFACT_DIR || path.join(root, 'visual-guard-artifacts', 'paper'));
const fontMode = process.env.PAPER_GEN_FONT_MODE || 'browser';
const VIEWPORTS = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1366, height: 900 }];
const TYPES = ['kanji', 'grid5', 'grid10', 'english', 'music', 'genko400', 'genko200'];
const PROFILE = 'wonder_school_profile_v2', ACTIVE_SLOT = 'bookReportQuestActiveSlot';
const slotKey = slot => `bookReportQuestData_slot_${slot}`;
const EPOCH = new Date('2026-01-02T12:00:00Z');
const servers = [], manifests = new Map(), results = [], failures = [], imagePairs = [];
let browser, candidateUrl, baselineUrl;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJSON = (name, value) => writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
const text = async (page, selector) => (await page.locator(selector).textContent()).trim();
const screenshot = (page, name) => page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' });
const graphemes = value => [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(value)].map(part => part.segment);
const sharedDraft = url => url.searchParams.has('draft') ? url.searchParams.get('draft') : url.searchParams.has('draft64') ? Buffer.from(url.searchParams.get('draft64'), 'base64url').toString('utf8') : null;
const nonblank = value => graphemes(value).filter(char => char.trim()).join('');
const seedDraft = (draft = '端末に保存済みの下書き') => ({ step: 4, unrelated: '保持する値', formData: { title: '保存済みの本', author: '作者', draftText: draft }, draftText: draft });

async function serveDist(directory) {
    const entry = await readFile(path.join(directory, 'paper_gen/index.html'), 'utf8');
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
    return `http://127.0.0.1:${server.address().port}/paper_gen/`;
}

async function manifestAssets(directory, name) {
    const origin = 'https://paper-build.invalid', pending = [new URL('/paper_gen/index.html', origin)], files = new Map();
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
    const manifest = { entry: 'paper_gen/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
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

// 保存障害・OS印刷/外部共有はブラウザ境界のみで観測する。アプリ関数や配信内容は差し替えない。
function browserEnvironment(options) {
    const observation = window.__paperE2EBoundary = { prints: [], shares: [], opens: [] };
    if (options.denyStorage) {
        for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
    } else if (options.quotaExceeded) {
        Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    }
    if (options.observePrint) window.print = () => {
        let storage;
        try { storage = Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])); }
        catch (error) { storage = { error: error.name }; }
        observation.prints.push({ text: [...document.querySelectorAll('#print-target .genko-text')].map(node => node.textContent).join(''), sheets: document.querySelectorAll('.paper-sheet').length, storage });
    };
    if (options.share) Object.defineProperty(navigator, 'share', { configurable: true, value: options.share === 'native' ? async data => { observation.shares.push(data); } : undefined });
    if (options.share === 'fallback') window.open = (...args) => { observation.opens.push(args); return null; };
}
async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const target = options.url || candidateUrl;
    const context = await browser.newContext({ viewport, locale: 'ja-JP', timezoneId: 'UTC', colorScheme: 'light',
        hasTouch: viewport.width < 768, isMobile: viewport.width < 768, reducedMotion: 'reduce',
        serviceWorkers: options.native ? 'allow' : 'block',
        ...(options.storage ? { storageState: { cookies: [], origins: [{ origin: new URL(target).origin, localStorage: Object.entries(options.storage).map(([name, value]) => ({ name, value })) }] } } : {}) });
    if (options.observePrint || options.share || options.denyStorage || options.quotaExceeded) await context.addInitScript(browserEnvironment, options);
    const current = { context, options, errors: [], requestFailures: [], externalFailures: [], consoleErrors: [], dialogs: [], fontTransfers: [] };
    // 任意のAPI経由モードでも同一URLの実フォントバイトだけを使用し、空CSSや代用フォントは配信しない。
    if (!options.native && fontMode === 'api') await context.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, async route => {
        const response = await context.request.fetch(route.request(), { timeout: 30_000 });
        const bytes = await response.body();
        current.fontTransfers.push({ url: route.request().url(), status: response.status(), bytes: bytes.length, sha256: sha256(bytes), transport: 'Playwright APIRequestContext; original URL and response body' });
        await route.fulfill({ response, body: bytes });
    });
    current.observe = page => {
        page.setDefaultTimeout(15_000);
        page.on('pageerror', error => current.errors.push(error.stack || error.message));
        page.on('console', message => { if (message.type() === 'error') current.consoleErrors.push(message.text()); });
        const failure = (url, label) => (new URL(url).origin === new URL(target).origin ? current.requestFailures : current.externalFailures).push(label);
        page.on('response', response => { if (response.status() >= 400) failure(response.url(), `${response.status()} ${response.url()}`); });
        page.on('requestfailed', request => failure(request.url(), `${request.failure()?.errorText} ${request.url()}`));
        page.on('dialog', async dialog => { current.dialogs.push(dialog.message()); await dialog.dismiss(); });
    };
    current.page = await context.newPage(); current.observe(current.page);
    if (options.clock) { await current.page.clock.install({ time: EPOCH }); await current.page.clock.pauseAt(EPOCH); }
    return current;
}
async function ready(current, url = candidateUrl, { reload = false, page = current.page } = {}) {
    const response = reload ? await page.reload({ waitUntil: 'load' }) : await page.goto(url, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    await page.locator('.paper-sheet svg').first().waitFor({ state: 'attached' });
    if (current.options.clock) await page.clock.runFor(400);
    await page.waitForFunction(() => Boolean(document.querySelector('#print-target')?.style.transform));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => { const node = document.querySelector('#print-target'), target = /scale\(([^)]+)\)/.exec(node.style.transform); return target && Math.abs(new DOMMatrixReadOnly(getComputedStyle(node).transform).a - Number(target[1])) < .00001; });
}
async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const record = { name, viewport, status: 'passed' }, began = Date.now(); let current;
    try {
        current = await createCase(viewport, options); if (!options.beforeReady) await ready(current, options.url || candidateUrl);
        await work(current.page, record, current);
        assert.deepEqual(current.errors, [], 'No unhandled browser exceptions');
        assert.deepEqual(current.requestFailures, [], 'All actual same-origin assets load');
        assert.deepEqual(current.dialogs, [], 'No unexpected browser dialogs');
        const unexpectedConsoleErrors = current.consoleErrors.filter(message => !(options.expectedConsole || []).some(pattern => pattern.test(message)) && !/Failed to load resource: net::ERR_/.test(message));
        assert.deepEqual(unexpectedConsoleErrors, [], 'No unexpected console errors');
        console.log(`[OK] Paper Gen: ${name}`);
    } catch (error) {
        record.status = 'failed'; record.error = error.stack || String(error); failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Paper Gen: ${name}: ${error.message}`);
        try { if (current?.page) { await screenshot(current.page, `${name}-failure`); record.failureMetrics = await layoutMetrics(current.page); } }
        catch (captureError) { record.captureError = captureError.message; }
    } finally {
        Object.assign(record, { durationMs: Date.now() - began, pageErrors: current?.errors || [], requestFailures: current?.requestFailures || [], externalFailures: current?.externalFailures || [], consoleErrors: current?.consoleErrors || [], unconsumedDialogs: current?.dialogs || [], fontTransfers: current?.fontTransfers || [] });
        await current?.context.close(); results.push(record); await writeJSON('results.json', results);
    }
}
async function eventually(read, expected, label, timeout = 12_000) {
    const deadline = Date.now() + timeout; let actual;
    do { actual = await read(); if (Object.is(actual, expected)) return actual; await new Promise(resolve => setTimeout(resolve, 25)); } while (Date.now() < deadline);
    assert.equal(actual, expected, label);
}
async function draftText(page) { return page.locator('#print-target .genko-text').evaluateAll(nodes => nodes.map(node => node.textContent).join('')); }
async function readSlot(page, slot = '1') { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), slotKey(slot)); }
async function selectPaper(page, type) {
    await page.locator(`[data-paper-type="${type}"]`).click();
    assert.equal(await page.locator('.paper-btn[aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator(`[data-paper-type="${type}"]`).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#paper-draft-textarea').isEnabled(), type.startsWith('genko'));
    assert.equal(await page.locator('#load-draft-btn').isEnabled(), type.startsWith('genko'));
    assert.equal(await page.locator('#kanji-settings-panel').isVisible(), type === 'kanji');
}
async function enterDraft(page, value, current) {
    await page.locator('#paper-draft-textarea').fill(value);
    if (current?.options.clock) await page.clock.runFor(200);
    await eventually(() => draftText(page), nonblank(value), 'Every entered grapheme is rendered in the current paper');
    assert.equal(await text(page, '#draft-char-count'), String(graphemes(value).length));
}
async function consumeAlert(current, expected, record) {
    await eventually(() => current.dialogs.length, 1, 'Exactly one expected alert');
    const message = current.dialogs.shift(); assert.match(message, expected);
    (record.expectedDialogs ||= []).push(message);
}
async function focusIs(page, selector) {
    await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, selector);
}
async function scale(page) {
    return page.locator('#print-target').evaluate(node => { const transform = getComputedStyle(node).transform; return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a; });
}

async function layoutMetrics(page) {
    return page.evaluate(() => {
        const round = value => Math.round(value * 100) / 100;
        const selectors = ['header', 'header h1', 'aside', '#main-content', '#preview-container', '#print-target', '.paper-sheet', '#kanji-settings-panel', '#draft-flow-panel', '.paper-btn', '.kanji-style-btn', '#paper-draft-textarea', '#load-draft-btn', '#print-paper-btn', '#share-paper-btn', '#zoom-in-btn', '#zoom-out-btn', '[data-action="parents-modal-open"]'];
        const anchors = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map((node, index) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node);
            return { key: `${selector}:${index}`, text: node.matches('textarea') ? '' : (node.innerText || '').trim().replace(/\s+/g, ' '),
                box: Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, round(box[key])])),
                style: Object.fromEntries(['display', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'gap', 'color', 'backgroundColor', 'backgroundImage', 'borderRadius'].map(key => [key, style[key]])) };
        }));
        return { title: document.title, viewport: { width: innerWidth, height: innerHeight }, anchors,
            controls: [...document.querySelectorAll('button,input,textarea')].map(node => ({ id: node.id, tag: node.tagName, type: node.type, name: node.name || '', value: node.matches('input,textarea') ? node.value : '', label: node.getAttribute('aria-label'), text: (node.innerText || '').trim().replace(/\s+/g, ' '), disabled: node.disabled })),
            svg: document.querySelector('.paper-sheet svg')?.outerHTML,
            overflow: { document: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth },
            fontUsage: [...new Set([...document.querySelectorAll('body,header h1,.material-symbols-rounded,.genko-text')].filter(node => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0 && node.textContent.trim()).map(node => getComputedStyle(node).fontFamily.split(',')[0].trim().replace(/^[\"']|[\"']$/g, '')))],
            fonts: [...document.fonts].map(face => ({ family: face.family, status: face.status })) };
    });
}
function requireFonts(metrics) {
    // 宣言だけで未使用のUnicodeサブセットは正常にunloadedのままになる。
    // 実ビルドが表示要素に指定する宣言済みWebフォントだけ、実バイトの読込を必須にする。
    assert.ok(metrics.fontUsage.includes('Material Symbols Rounded'), 'Visible icons use their actual icon font');
    for (const family of metrics.fontUsage) {
        const declared = metrics.fonts.filter(face => face.family.replace(/^[\"']|[\"']$/g, '') === family);
        if (declared.length) assert.ok(declared.some(face => face.status === 'loaded'), `${family}: the visible declared font has loaded real bytes`);
    }
    assert.ok(metrics.fonts.some(face => face.family.includes('Material Symbols Rounded') && face.status === 'loaded'), 'Actual icon font is loaded');
}
function compareInitial(after, before) {
    assert.equal(after.title, before.title, 'Initial document title preserved');
    const previousControls = structuredClone(before.controls);
    const draftControl = previousControls.find(control => control.id === 'paper-draft-textarea');
    if (draftControl?.label === null) draftControl.label = '原稿用紙に流し込む文字';
    assert.deepEqual(after.controls, previousControls, 'Initial controls and copy preserved; the previously unlabeled draft receives its specific accessible label');
    assert.equal(after.svg, before.svg, 'Initial 35-cell A4 SVG preserved exactly');
    const exceptions = [];
    const repaired = /^(?:aside|#main-content|#preview-container|#print-target|\.paper-sheet):/;
    for (const old of before.anchors) {
        const current = after.anchors.find(anchor => anchor.key === old.key);
        assert.ok(current, `${old.key}: original semantic element remains`);
        assert.equal(current.text, old.text, `${old.key}: visible copy preserved`);
        // 既知のプレビュー収容修正以外は見た目を完全比較する。修正箇所も差分を記録する。
        if (repaired.test(old.key)) {
            const oldStyle = { ...old.style }, newStyle = { ...current.style };
            for (const key of ['display', 'padding', 'gap']) { delete oldStyle[key]; delete newStyle[key]; }
            assert.deepEqual(newStyle, oldStyle, `${old.key}: typography, colors and shape preserved`);
            if (JSON.stringify(current) !== JSON.stringify(old)) exceptions.push({ key: old.key, before: old, after: current, reason: 'Preview sizing/scroll containment repair; paper edge reachability asserted separately' });
            if (before.viewport.width >= 1366 && old.key === '.paper-sheet:0') for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(current.box[key] - old.box[key]) <= 1.5, `Desktop initial paper ${key} stays within 1.5px of baseline`);
        } else {
            assert.deepEqual(current.style, old.style, `${old.key}: exact original computed appearance`);
            if (old.box.y >= 0 && old.box.y < before.viewport.height && old.box.height > 0) for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(current.box[key] - old.box[key]) <= 1.5, `${old.key}: initially visible control ${key} preserved within 1.5px`);
        }
    }
    return exceptions;
}
async function reachable(page, selector, record) {
    const locator = page.locator(selector); await locator.scrollIntoViewIfNeeded();
    if (await locator.isEnabled()) await locator.click({ trial: true });
    const sample = await locator.evaluate(node => {
        const rect = node.getBoundingClientRect(), clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) { clip.left = Math.max(clip.left, box.left + parent.clientLeft); clip.right = Math.min(clip.right, box.left + parent.clientLeft + parent.clientWidth); }
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) { clip.top = Math.max(clip.top, box.top + parent.clientTop); clip.bottom = Math.min(clip.bottom, box.top + parent.clientTop + parent.clientHeight); }
        }
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { selector: node.id || node.tagName, box: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }, clip, hit: hit === node || node.contains(hit) };
    });
    (record.reachability ||= []).push(sample);
    const { box, clip } = sample;
    assert.ok(box.width > 0 && box.height > 0 && box.left >= clip.left - 1 && box.right <= clip.right + 1 && box.top >= clip.top - 1 && box.bottom <= clip.bottom + 1, `${selector}: whole control is reachable ${JSON.stringify(sample)}`);
    assert.equal(sample.hit, true, `${selector}: center receives pointer input`);
}
async function noHorizontalOverflow(page, record) {
    const metrics = await layoutMetrics(page); (record.layouts ||= []).push(metrics);
    assert.ok(metrics.overflow.document <= 1 && metrics.overflow.body <= 1, `No document horizontal overflow: ${JSON.stringify(metrics.overflow)}`);
}
async function paperEdges(page, record, label) {
    const preview = page.locator('#preview-container');
    for (const end of [false, true]) {
        // 表示を動かす操作だけを使い、用紙・アプリ状態は変更しない。
        // モバイルでは本文、デスクトップではプレビュー自身が主な縦スクロール領域になる。
        await preview.evaluate((node, end) => {
            node.scrollTo({ left: end ? node.scrollWidth : 0, top: end ? node.scrollHeight : 0, behavior: 'instant' });
            const sheets = document.querySelectorAll('.paper-sheet'), target = sheets[end ? sheets.length - 1 : 0];
            for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                const cs = getComputedStyle(parent), paper = target.getBoundingClientRect(), box = parent.getBoundingClientRect();
                if (/^(auto|scroll)$/.test(cs.overflowY) && parent.scrollHeight > parent.clientHeight) {
                    const delta = end ? paper.bottom - (box.top + parent.clientTop + parent.clientHeight) : paper.top - (box.top + parent.clientTop);
                    parent.scrollTo({ top: parent.scrollTop + delta, behavior: 'instant' });
                }
            }
        }, end);
        const sample = await preview.evaluate((node, end) => {
            const sheets = document.querySelectorAll('.paper-sheet'), first = sheets[0].getBoundingClientRect(), last = sheets[sheets.length - 1].getBoundingClientRect(), paper = end ? last : first;
            const bounds = node.getBoundingClientRect(), cs = getComputedStyle(node);
            const parent = node.parentElement, parentStyle = getComputedStyle(parent);
            const px = value => parseFloat(value) || 0;
            const parentPadding = px(parentStyle.paddingTop) + px(parentStyle.paddingBottom);
            const parentBorder = px(parentStyle.borderTopWidth) + px(parentStyle.borderBottomWidth);
            const siblings = [...parent.children].filter(child => child !== node && getComputedStyle(child).display !== 'none');
            const siblingHeight = siblings.reduce((sum, child) => { const style = getComputedStyle(child); return sum + child.getBoundingClientRect().height + px(style.marginTop) + px(style.marginBottom); }, 0);
            // 親のCSS最小高を満たす余白は正常。実測親heightを許容上限に使うと未縮小の子の膨張まで見逃すため、CSS値から独立に算出する。
            const parentMinContent = px(parentStyle.minHeight) - (parentStyle.boxSizing === 'border-box' ? parentPadding + parentBorder : 0);
            const parentMinimumFill = parentStyle.display === 'flex' && parentStyle.flexDirection === 'column'
                ? Math.max(0, parentMinContent - siblingHeight - px(parentStyle.rowGap) * siblings.length - px(cs.marginTop) - px(cs.marginBottom)) : 0;
            const clip = { left: Math.max(0, bounds.left + node.clientLeft), right: Math.min(innerWidth, bounds.left + node.clientLeft + node.clientWidth), top: Math.max(0, bounds.top + node.clientTop), bottom: Math.min(innerHeight, bounds.top + node.clientTop + node.clientHeight) };
            for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
                if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) { clip.left = Math.max(clip.left, box.left + parent.clientLeft); clip.right = Math.min(clip.right, box.left + parent.clientLeft + parent.clientWidth); }
                if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) { clip.top = Math.max(clip.top, box.top + parent.clientTop); clip.bottom = Math.min(clip.bottom, box.top + parent.clientTop + parent.clientHeight); }
            }
            return { end, mobile: innerWidth < 768, sheet: { left: paper.left, right: paper.right, top: paper.top, bottom: paper.bottom }, clip,
                viewport: { left: bounds.left + node.clientLeft, right: bounds.left + node.clientLeft + node.clientWidth, top: bounds.top + node.clientTop, bottom: bounds.top + node.clientTop + node.clientHeight },
                clientWidth: node.clientWidth, clientHeight: node.clientHeight, scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight, scrollLeft: node.scrollLeft, scrollTop: node.scrollTop,
                renderedHeight: last.bottom - first.top, paddingTop: parseFloat(cs.paddingTop) || 0, paddingBottom: parseFloat(cs.paddingBottom) || 0, minHeight: parseFloat(cs.minHeight) || 0, parentMinimumFill, parentMinimum: px(parentStyle.minHeight), siblingHeight };
        }, end);
        (record.paperEdges ||= []).push({ label, ...sample });
        assert.ok(sample.clip.right - sample.clip.left > 200 && sample.clip.bottom - sample.clip.top >= 160, `${label}: preview has usable actually visible area`);
        const coordinate = end ? { x: sample.sheet.right, y: sample.sheet.bottom } : { x: sample.sheet.left, y: sample.sheet.top };
        assert.ok(coordinate.x >= sample.clip.left - 1 && coordinate.x <= sample.clip.right + 1 && coordinate.y >= sample.clip.top - 1 && coordinate.y <= sample.clip.bottom + 1,
            `${label}: ${end ? 'last bottom-right' : 'first top-left'} paper corner is reachable within viewport and every clipping ancestor: ${JSON.stringify(sample)}`);
        if (end && sample.scrollHeight > sample.clientHeight + 1) assert.ok(sample.viewport.bottom - sample.sheet.bottom <= sample.paddingBottom + 2, `${label}: native scroll end has no unscaled blank tail`);
        if (sample.mobile) assert.ok(sample.clientHeight <= Math.max(sample.minHeight, sample.parentMinimumFill, sample.renderedHeight + sample.paddingTop + sample.paddingBottom) + 2, `${label}: mobile flow height matches actual scaled pages, not unscaled child overflow`);
    }
}

async function initialSuite() {
    for (const viewport of VIEWPORTS) await runCase(`initial-preservation-${viewport.width}`, async (page, record) => {
        const after = await layoutMetrics(page); requireFonts(after); await noHorizontalOverflow(page, record);
        const name = `initial-${viewport.width}`;
        await screenshot(page, `${name}-after`);
        if (baselineUrl) {
            const baseline = await createCase(viewport, { url: baselineUrl });
            try {
                await ready(baseline, baselineUrl);
                const before = await layoutMetrics(baseline.page); requireFonts(before);
                await screenshot(baseline.page, `${name}-before`);
                await writeJSON(`${name}-metrics.json`, { before, after });
                record.allowedLayoutRepairs = compareInitial(after, before);
                await writeJSON(`${name}-metrics.json`, { before, after, allowedLayoutRepairs: record.allowedLayoutRepairs });
                assert.deepEqual(baseline.errors, []); assert.deepEqual(baseline.requestFailures, []);
            } finally { await baseline.context.close(); }
        } else await writeJSON(`${name}-metrics.json`, { after, baseline: 'PAPER_GEN_BASELINE_ROOT not specified; before/after comparison not performed' });
        imagePairs.push({ name, before: baselineUrl ? `${name}-before.png` : null, after: `${name}-after.png`, metrics: `${name}-metrics.json` });
        for (const selector of ['[data-paper-type="kanji"]', '[data-paper-type="genko200"]', '#print-paper-btn', '#share-paper-btn', '#zoom-in-btn', '#zoom-out-btn']) await reachable(page, selector, record);
        await paperEdges(page, record, 'initial-fit'); await screenshot(page, `${name}-reachable-preview`);
    }, {}, viewport);
}

async function geometry(page, type, style = '35') {
    const data = await page.locator('.paper-sheet').first().evaluate(node => {
        const svg = node.querySelector('svg'), cs = getComputedStyle(node);
        const attrs = element => Object.fromEntries([...element.attributes].map(attribute => [attribute.name, attribute.value]));
        return { width: parseFloat(cs.width), height: parseFloat(cs.height), viewBox: svg.getAttribute('viewBox'),
            rects: [...svg.querySelectorAll('rect')].map(attrs), lines: [...svg.querySelectorAll('line')].map(attrs),
            paths: [...svg.querySelectorAll('path')].map(attrs), text: [...svg.querySelectorAll('text')].map(element => element.textContent),
            boxes: [...svg.querySelectorAll('rect,line,path')].map(element => { const box = element.getBBox(); return { tag: element.tagName, x: box.x, y: box.y, width: box.width, height: box.height }; }) };
    });
    assert.equal(data.viewBox, '0 0 210 297', 'Every paper uses A4 coordinates');
    assert.ok(Math.abs(data.width - 210 * 96 / 25.4) < .5 && Math.abs(data.height - 297 * 96 / 25.4) < .5, 'Paper dimensions are physically A4 before zoom');
    for (const box of data.boxes) assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 210.01 && box.y + box.height <= 297.01, `${type}: primitive remains inside A4: ${JSON.stringify(box)}`);
    if (type === 'kanji') {
        const cells = { '35': [35, 36], '84': [84, 20], '104': [104, 18] }[style];
        assert.equal(data.rects.length, cells[0]); assert.equal(data.lines.length, cells[0] * 2);
        for (const cell of data.rects) { assert.equal(Number(cell.width), cells[1]); assert.equal(Number(cell.height), cells[1]); }
        assert.ok(data.lines.every(line => line['stroke-dasharray'] === '1.5 1.5'), 'Every kanji cell retains its cross leader');
    } else if (type === 'grid5' || type === 'grid10') {
        assert.equal(data.rects.length, 1); assert.equal(Number(data.rects[0].width), 190); assert.equal(Number(data.rects[0].height), 270);
        assert.equal(data.lines.length, 90);
        assert.equal(data.lines.filter(line => line['stroke-dasharray']).length, type === 'grid10' ? 46 : 0, '10mm grid preserves alternating 5mm dotted subdivisions');
    } else if (type === 'english') {
        assert.equal(data.lines.length, 60); assert.equal(data.lines.filter(line => line.stroke === '#f87171').length, 15); assert.equal(data.lines.filter(line => line['stroke-dasharray']).length, 15);
        for (let row = 0; row < 15; row++) assert.ok(Math.abs(Number(data.lines[row * 4 + 3].y1) - Number(data.lines[row * 4].y1) - 5) < .0001, 'Each English four-line staff spans 5mm');
    } else if (type === 'music') {
        assert.equal(data.lines.length, 96); assert.equal(data.lines.filter(line => line.y1 === line.y2).length, 60); assert.equal(data.lines.filter(line => line.x1 === line.x2).length, 36);
    } else {
        const count = type === 'genko400' ? 400 : 200, side = type === 'genko400' ? 7 : 10;
        assert.equal(data.rects.length, count + 2); assert.equal(data.rects.filter(rect => Number(rect.width) === side && Number(rect.height) === side).length, count);
        assert.equal(data.paths.length, type === 'genko400' ? 2 : 0);
    }
    return data;
}
async function paperTypesSuite() {
    await runCase('seven-paper-types-three-kanji-grids', async (page, record) => {
        record.papers = [];
        for (const type of TYPES) {
            await selectPaper(page, type); assert.equal(await page.locator('.paper-sheet').count(), 1);
            record.papers.push({ type, geometry: await geometry(page, type) });
            await page.locator('#preview-container').scrollIntoViewIfNeeded(); await screenshot(page, `paper-${type}`);
        }
        await selectPaper(page, 'kanji');
        for (const style of ['35', '84', '104']) {
            const radio = page.locator(`input[name="kanji-style"][value="${style}"]`);
            await page.locator(`.kanji-style-btn:has(input[value="${style}"])`).click(); assert.equal(await radio.isChecked(), true);
            assert.equal(await page.locator('input[name="kanji-style"]:checked').count(), 1);
            record.papers.push({ type: 'kanji', style, geometry: await geometry(page, 'kanji', style) });
            await screenshot(page, `kanji-${style}`);
        }
        await selectPaper(page, 'music'); await selectPaper(page, 'kanji');
        assert.equal(await page.locator('input[name="kanji-style"][value="104"]').isChecked(), true, 'Kanji choice survives paper switching');
        await geometry(page, 'kanji', '104');
    }, {}, VIEWPORTS[3]);
}

async function zoomTo(page, direction, expected) {
    const button = page.locator(direction === 'in' ? '#zoom-in-btn' : '#zoom-out-btn');
    for (let count = 0; count < 20 && await button.isEnabled(); count++) await button.click();
    assert.equal(await button.isDisabled(), true, 'Zoom boundary is disabled');
    assert.equal(await button.getAttribute('aria-disabled'), 'true');
    await eventually(async () => Math.abs(await scale(page) - expected) < .00001, true, `Zoom settles at ${expected}`);
}
async function keyboardAndZoomSuite() {
    for (const viewport of VIEWPORTS) await runCase(`keyboard-mobile-preview-zoom-${viewport.width}`, async (page, record) => {
        await page.locator('[data-paper-type="kanji"]').focus();
        for (const [index, type] of TYPES.entries()) {
            if (index) await page.keyboard.press('Tab');
            await focusIs(page, `[data-paper-type="${type}"]`); await page.keyboard.press('Enter');
            assert.equal(await page.locator(`[data-paper-type="${type}"]`).getAttribute('aria-pressed'), 'true');
        }
        await page.keyboard.press('Tab'); await focusIs(page, '#load-draft-btn');
        await page.keyboard.press('Tab'); await focusIs(page, '#paper-draft-textarea');
        await enterDraft(page, 'あ'.repeat(850)); assert.equal(await page.locator('.paper-sheet').count(), 5);
        await reachable(page, '#zoom-in-btn', record); await zoomTo(page, 'in', 1.5);
        await paperEdges(page, record, 'max-zoom-five-pages'); await screenshot(page, `zoom-max-${viewport.width}`);
        await zoomTo(page, 'out', .3); await paperEdges(page, record, 'min-zoom-five-pages'); await screenshot(page, `zoom-min-${viewport.width}`);
        await page.locator('#zoom-in-btn').press('Enter');
        await eventually(async () => Math.abs(await scale(page) - .4) < .00001, true, 'Keyboard can zoom away from minimum');
        assert.equal(await page.locator('#zoom-out-btn').isEnabled(), true);
        await page.locator('#zoom-out-btn').focus(); await page.keyboard.press('Tab'); await focusIs(page, '#preview-container');
        // スクロール位置の初期化だけをDOMで行い、その後は実キー入力で確認する。
        await page.locator('#preview-container').evaluate(node => {
            node.scrollTo({ left: 0, top: 0, behavior: 'instant' });
            for (let parent = node.parentElement; parent; parent = parent.parentElement) if (parent.scrollHeight > parent.clientHeight + 1) parent.scrollTop = Math.max(0, parent.scrollTop + node.getBoundingClientRect().top - parent.getBoundingClientRect().top - 70);
        });
        const before = await scrollPositions(page); await page.keyboard.press('PageDown');
        await eventually(async () => (await scrollPositions(page)).some((entry, index) => entry.top > before[index].top + 1), true, 'Focused preview or its real scroll ancestor moves with PageDown');
        record.keyboardScroll = { before, after: await scrollPositions(page) };
        await noHorizontalOverflow(page, record);
    }, {}, viewport);
    await runCase('kanji-native-radio-arrow-navigation', async (page, record) => {
        const first = page.locator('input[name="kanji-style"][value="35"]'); await first.focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('input[name="kanji-style"][value="84"]').isChecked(), true); await geometry(page, 'kanji', '84');
        await page.keyboard.press('ArrowRight'); assert.equal(await page.locator('input[name="kanji-style"][value="104"]').isChecked(), true); await geometry(page, 'kanji', '104');
        record.focusIndicator = await page.locator('input[name="kanji-style"]:checked').evaluate(node => ({ focused: document.activeElement === node, outline: getComputedStyle(node.closest('label')).outlineStyle, width: getComputedStyle(node.closest('label')).outlineWidth }));
        assert.equal(record.focusIndicator.focused, true); assert.notEqual(record.focusIndicator.outline, 'none'); assert.ok(parseFloat(record.focusIndicator.width) >= 2);
        await screenshot(page, 'kanji-keyboard-focus');
    }, {}, VIEWPORTS[3]);
}
async function scrollPositions(page) {
    return page.evaluate(() => {
        const values = []; for (let node = document.querySelector('#preview-container'); node; node = node.parentElement) values.push({ id: node.id || node.tagName, top: node.scrollTop, left: node.scrollLeft }); return values;
    });
}

// Chromiumが出力したPDFのページ辞書を読む。CSSの値をPDF寸法として代用しない。
function inspectPDF(bytes) {
    const source = bytes.toString('latin1'); assert.ok(source.startsWith('%PDF-'), 'PDF bytes returned by Chromium');
    const objects = new Map([...source.matchAll(/(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/g)].map(match => [`${match[1]} ${match[2]}`, match[3]]));
    const pages = [...objects.entries()].filter(([, object]) => /\/Type\s*\/Page\b/.test(object));
    assert.ok(pages.length > 0, 'Real PDF page objects are readable; unsupported PDF object-stream format must not silently pass');
    const readMediaBox = (object, seen = new Set()) => {
        const direct = /\/MediaBox\s*\[([^\]]+)\]/.exec(object);
        if (direct) return direct[1].trim().split(/\s+/).map(Number);
        const indirect = /\/MediaBox\s+(\d+)\s+(\d+)\s+R/.exec(object);
        if (indirect) { const array = objects.get(`${indirect[1]} ${indirect[2]}`)?.match(/\[([^\]]+)\]/); if (array) return array[1].trim().split(/\s+/).map(Number); }
        const parent = /\/Parent\s+(\d+)\s+(\d+)\s+R/.exec(object), key = parent && `${parent[1]} ${parent[2]}`;
        assert.ok(key && !seen.has(key) && objects.has(key), 'Every PDF page resolves a finite MediaBox');
        seen.add(key); return readMediaBox(objects.get(key), seen);
    };
    return { bytes: bytes.length, sha256: sha256(bytes), pageCount: pages.length, pages: pages.map(([object, body]) => { const box = readMediaBox(body); assert.equal(box.length, 4); assert.ok(box.every(Number.isFinite)); return { object, mediaBox: box, widthPoints: box[2] - box[0], heightPoints: box[3] - box[1] }; }) };
}
async function savePDF(page, name, count, record) {
    // screenの明示エミュレーションを残すとprintToPDFも画面CSSになり、@pageを読まずLetterになる。
    // 自動メディアへ戻し、実beforeprintを起こす。入力待機タイマーは事前に進めない。
    await page.emulateMedia({ media: null });
    const bytes = await page.pdf({ path: path.join(artifactDir, `${name}.pdf`), printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    const pdf = inspectPDF(bytes); (record.pdf ||= []).push({ name, ...pdf });
    assert.equal(pdf.pageCount, count, 'PDF contains exactly the rendered pages, with no extra blank page');
    for (const sheet of pdf.pages) {
        assert.ok(Math.abs(sheet.widthPoints - 210 / 25.4 * 72) <= 1, `Actual PDF page width is A4: ${sheet.widthPoints}`);
        assert.ok(Math.abs(sheet.heightPoints - 297 / 25.4 * 72) <= 1, `Actual PDF page height is A4: ${sheet.heightPoints}`);
    }
    await writeJSON(`${name}-pdf.json`, pdf); return pdf;
}
async function settlePrintMedia(page, current) {
    await page.emulateMedia({ media: 'print' });
    if (current.options.clock) await page.clock.runFor(300);
    await eventually(() => page.evaluate(() => {
        const target = document.querySelector('#print-target'), sheets = [...document.querySelectorAll('.paper-sheet')];
        return matchMedia('print').matches && getComputedStyle(target).transform === 'none'
            && getComputedStyle(document.querySelector('header')).display === 'none'
            && getComputedStyle(document.querySelector('aside')).display === 'none'
            && sheets.every(node => getComputedStyle(node).boxShadow === 'none');
    }), true, 'Print media has settled to unscaled, shadowless paper with hidden controls');
}
async function printSuite() {
    for (const type of ['genko400', 'genko200']) for (const viewport of [VIEWPORTS[0], VIEWPORTS[3]]) await runCase(`actual-pdf-${type}-${viewport.width}`, async (page, record, current) => {
        await selectPaper(page, type);
        // デバウンスを進めずPDF化し、実beforeprintが最後の入力を反映するか検査する。
        await page.locator('#paper-draft-textarea').fill('あ'.repeat(850));
        const pages = type === 'genko400' ? 3 : 5;
        await savePDF(page, `${type}-${viewport.width}-latest-input`, pages, record);
        await page.clock.runFor(250);
        assert.equal(await draftText(page), 'あ'.repeat(850)); assert.equal((await readSlot(page)).formData.draftText, 'あ'.repeat(850));
        await paperEdges(page, record, 'native-afterprint-restored-screen');
        await settlePrintMedia(page, current);
        record.printStyles = await page.evaluate(() => ({ transform: getComputedStyle(document.querySelector('#print-target')).transform,
            header: getComputedStyle(document.querySelector('header')).display, aside: getComputedStyle(document.querySelector('aside')).display,
            sheets: [...document.querySelectorAll('.paper-sheet')].map(node => { const cs = getComputedStyle(node); return { width: parseFloat(cs.width), height: parseFloat(cs.height), shadow: cs.boxShadow, breakInside: cs.breakInside, breakAfter: cs.breakAfter, background: cs.backgroundColor }; }),
            clipped: [...document.querySelectorAll('#main-content,#paper-layout,#paper-workspace,#preview-container,#paper-preview-sizer')].filter(node => ['hidden', 'clip'].includes(getComputedStyle(node).overflowY)).map(node => node.id) }));
        assert.equal(record.printStyles.transform, 'none'); assert.equal(record.printStyles.header, 'none'); assert.equal(record.printStyles.aside, 'none'); assert.deepEqual(record.printStyles.clipped, []);
        for (const sheet of record.printStyles.sheets) { assert.ok(Math.abs(sheet.width - 210 * 96 / 25.4) < .5); assert.ok(Math.abs(sheet.height - 297 * 96 / 25.4) < .5); assert.equal(sheet.shadow, 'none'); assert.equal(sheet.background, 'rgb(255, 255, 255)'); }
        await screenshot(page, `print-media-${type}-${viewport.width}`); await page.emulateMedia({ media: 'screen' });
        await enterDraft(page, '短い原稿', current); await savePDF(page, `${type}-${viewport.width}-one-page`, 1, record);
    }, { clock: true }, viewport);
    await runCase('print-button-flushes-latest-input-before-os-boundary', async (page, record) => {
        await selectPaper(page, 'genko400'); await page.locator('#paper-draft-textarea').fill('印刷直前の最後の文字🧑🏽‍🚀');
        await page.locator('#print-paper-btn').press('Enter');
        const prints = await page.evaluate(() => window.__paperE2EBoundary.prints); assert.equal(prints.length, 1);
        assert.equal(prints[0].text, '印刷直前の最後の文字🧑🏽‍🚀'); assert.equal(JSON.parse(prints[0].storage.bookReportQuestData_slot_1).formData.draftText, '印刷直前の最後の文字🧑🏽‍🚀'); record.printBoundary = prints;
    }, { clock: true, observePrint: true });
}

async function renderingSuite() {
    await runCase('same-page-add-delete-unicode-and-escaping', async (page, record, current) => {
        await selectPaper(page, 'genko400');
        const payload = 'か\u3099葛\u{E0100}👨‍👩‍👧‍👦🧑🏽‍🚀<&>"\' <img src=x onerror=alert(1)>\n次の段落。';
        for (const value of ['甲乙', '甲乙丙丁', '甲', payload, '']) {
            await enterDraft(page, value, current);
            assert.equal(await page.locator('#print-target script,#print-target img,#print-target foreignObject').count(), 0, 'Input stays escaped text, never active markup');
            assert.equal(await page.locator('.paper-sheet').count(), 1);
        }
        await enterDraft(page, payload, current);
        record.glyphs = await page.locator('.genko-text').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, x: node.getAttribute('x'), y: node.getAttribute('y') })));
        assert.deepEqual(record.glyphs.slice(0, 4).map(glyph => glyph.text), ['か\u3099', '葛\u{E0100}', '👨‍👩‍👧‍👦', '🧑🏽‍🚀'], 'Dakuten, IVS and joined emoji occupy intact individual cells');
        assert.equal(new Set(record.glyphs.slice(0, 4).map(glyph => `${glyph.x},${glyph.y}`)).size, 4);
        await screenshot(page, 'unicode-and-escaped-input');
        for (const type of ['genko400', 'genko200']) {
            await selectPaper(page, type); const capacity = type === 'genko400' ? 400 : 200;
            await enterDraft(page, 'あ'.repeat(capacity - 1), current); assert.equal(await page.locator('.paper-sheet').count(), 1, 'Exactly filled manuscript has no trailing blank sheet');
            await enterDraft(page, 'あ'.repeat(capacity), current); assert.equal(await page.locator('.paper-sheet').count(), 2, 'Paragraph indentation counts toward page capacity');
        }
    }, { clock: true }, VIEWPORTS[3]);
    await runCase('unchanged-sheets-retained-correct-addition-and-removal', async (page, record, current) => {
        await selectPaper(page, 'genko400'); await enterDraft(page, 'あ'.repeat(450), current);
        assert.equal(await page.locator('.paper-sheet').count(), 2);
        const first = await page.locator('.paper-sheet').first().elementHandle();
        const oldSecond = await page.locator('.paper-sheet').nth(1).elementHandle();
        await enterDraft(page, 'あ'.repeat(450) + '追加の文字', current);
        assert.equal(await first.evaluate(node => node === document.querySelector('.paper-sheet')), true, 'Unchanged first page preserves its actual DOM node');
        assert.equal(await oldSecond.evaluate(node => node.isConnected), false, 'Changed second sheet is refreshed');
        await page.locator('#print-target').evaluate(node => { window.__paperE2EMutations = []; window.__paperE2EObserver = new MutationObserver(changes => window.__paperE2EMutations.push(...changes.map(change => ({ type: change.type, added: change.addedNodes.length, removed: change.removedNodes.length })))); window.__paperE2EObserver.observe(node, { childList: true, subtree: true }); });
        await selectPaper(page, 'genko400'); await page.clock.runFor(200);
        record.identicalReselectionMutations = await page.evaluate(() => { window.__paperE2EObserver.disconnect(); return window.__paperE2EMutations; });
        assert.deepEqual(record.identicalReselectionMutations, [], 'Identical paper reselection performs no child DOM mutation');
        await enterDraft(page, '短い', current); assert.equal(await page.locator('.paper-sheet').count(), 1); assert.equal(await draftText(page), '短い');
        await first.dispose(); await oldSecond.dispose(); await screenshot(page, 'page-removal-correct');
    }, { clock: true }, VIEWPORTS[3]);
}

async function verticalFormsSuite() {
    await runCase('vertical-punctuation-font-shaping-and-bounded-hanging', async (page, record, current) => {
        await selectPaper(page, 'genko400'); const sample = 'コーヒー「図書館」';
        await enterDraft(page, sample, current);
        await page.evaluate(() => document.fonts.ready);
        record.manuscriptFonts = await layoutMetrics(page); requireFonts(record.manuscriptFonts);
        assert.ok(record.manuscriptFonts.fontUsage.includes('Zen Maru Gothic'), 'Manuscript glyphs use the loaded handwriting font');
        record.glyphs = await page.locator('.genko-text').evaluateAll(nodes => nodes.map(node => {
            const box = node.getBBox(); return { text: node.textContent, writingMode: getComputedStyle(node).writingMode, orientation: getComputedStyle(node).textOrientation, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
        }));
        assert.equal(record.glyphs.length, graphemes(sample).length);
        for (const glyph of record.glyphs) {
            assert.equal(graphemes(glyph.text).length, 1, 'Every text element contains exactly one complete grapheme');
            if ('ー「」'.includes(glyph.text)) { assert.equal(glyph.writingMode, 'vertical-rl'); assert.equal(glyph.orientation, 'mixed'); }
            assert.ok(glyph.box.x >= 0 && glyph.box.y >= 0 && glyph.box.x + glyph.box.width <= 210 && glyph.box.y + glyph.box.height <= 297, 'Font-shaped glyph remains inside A4');
        }
        await page.locator('#preview-container').scrollIntoViewIfNeeded();
        await screenshot(page, 'vertical-coffee-library-full');
        const clip = await page.locator('.genko-text').evaluateAll(nodes => {
            const boxes = nodes.map(node => node.getBoundingClientRect()), left = Math.min(...boxes.map(box => box.left)) - 14, top = Math.min(...boxes.map(box => box.top)) - 14;
            return { x: Math.max(0, left), y: Math.max(0, top), width: Math.min(innerWidth, Math.max(...boxes.map(box => box.right)) + 14) - Math.max(0, left), height: Math.min(innerHeight, Math.max(...boxes.map(box => box.bottom)) + 14) - Math.max(0, top) };
        });
        assert.ok(clip.width > 0 && clip.height > 0); await page.screenshot({ path: path.join(artifactDir, 'vertical-coffee-library-closeup.png'), clip, animations: 'disabled' });
        const hanging = 'あ'.repeat(19) + '。）」』】' + '続き'; await enterDraft(page, hanging, current);
        assert.equal(await draftText(page), hanging, 'Repeated hanging punctuation is never lost');
        record.hanging = await page.locator('.genko-text').evaluateAll(nodes => nodes.map(node => { const box = node.getBBox(); return { text: node.textContent, x: box.x, y: box.y, width: box.width, height: box.height }; }));
        for (const box of record.hanging) assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 210 && box.y + box.height <= 297, 'Repeated hanging marks stay on the paper');
        await screenshot(page, 'bounded-hanging-punctuation');
    }, { clock: true }, VIEWPORTS[3]);
}

async function storageSuite() {
    await runCase('book-report-load-preserves-metadata-and-pagehide-flush', async (page, record, current) => {
        await selectPaper(page, 'genko400'); await page.locator('#load-draft-btn').click(); await page.clock.runFor(200);
        assert.equal(await page.locator('#paper-draft-textarea').inputValue(), '端末に保存済みの下書き');
        const latest = '離脱直前の最後の文字か\u3099'; await page.locator('#paper-draft-textarea').fill(latest);
        await page.goto('about:blank'); await ready(current, `${candidateUrl}?load_draft=true&type=genko400`);
        assert.equal(await page.locator('#paper-draft-textarea').inputValue(), latest, 'Actual pagehide persists pending input before navigation');
        const stored = await readSlot(page); assert.equal(stored.formData.draftText, latest); assert.equal(stored.draftText, latest);
        assert.equal(stored.step, 4); assert.equal(stored.formData.title, '保存済みの本'); assert.equal(stored.formData.author, '作者'); assert.equal(stored.unrelated, '保持する値'); record.storage = stored;
        await screenshot(page, 'book-report-restored-after-pagehide');
    }, { clock: true, storage: { [ACTIVE_SLOT]: '1', [slotKey('1')]: JSON.stringify(seedDraft()) } });

    await runCase('cross-tab-update-pending-save-and-active-slot-race', async (page, record, current) => {
        await selectPaper(page, 'genko400');
        const peer = await current.context.newPage(); current.observe(peer); await ready(current, candidateUrl, { page: peer });
        await page.locator('#paper-draft-textarea').fill('古い待機中の入力');
        await peer.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: slotKey('1'), data: seedDraft('別タブで保存した最新版') });
        await eventually(() => page.locator('#paper-draft-textarea').inputValue(), '別タブで保存した最新版', 'Real cross-tab storage event replaces stale pending input');
        await page.clock.runFor(300); assert.equal((await readSlot(page)).formData.draftText, '別タブで保存した最新版', 'Cancelled pending debounce cannot resurrect stale text');
        await page.locator('#paper-draft-textarea').fill('スロット1に属する新しい入力');
        await peer.evaluate(key => localStorage.setItem(key, '2'), ACTIVE_SLOT);
        await page.clock.runFor(200);
        assert.equal((await readSlot(page, '1')).formData.draftText, 'スロット1に属する新しい入力');
        assert.equal((await readSlot(page, '2')).formData.draftText, '別作品は維持');
        await page.locator('#paper-draft-textarea').fill('スロット2の入力'); await page.clock.runFor(200);
        assert.equal((await readSlot(page, '2')).formData.draftText, 'スロット2の入力');
        await page.evaluate(() => { window.__paperE2EInactiveAck = false; addEventListener('storage', event => { if (event.key === 'paperE2EInactiveAck') window.__paperE2EInactiveAck = true; }); });
        await peer.evaluate(({ key, value }) => { localStorage.setItem(key, value); localStorage.setItem('paperE2EInactiveAck', 'complete'); }, { key: slotKey('1'), value: JSON.stringify(seedDraft('非アクティブ作品からの更新')) });
        await eventually(() => page.evaluate(() => window.__paperE2EInactiveAck), true, 'Cross-tab inactive-slot event and its following acknowledgement were delivered');
        assert.equal(await page.locator('#paper-draft-textarea').inputValue(), 'スロット2の入力', 'Inactive-slot updates do not replace current input');
        await peer.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: slotKey('2'), value: JSON.stringify({ formData: { draftText: '' }, draftText: '復活させてはいけない古い本文' }) });
        await eventually(() => page.locator('#paper-draft-textarea').inputValue(), '', 'Explicitly empty modern draft wins over stale legacy text');
        await page.clock.runFor(200); assert.equal(await draftText(page), '');
        await peer.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: slotKey('2'), value: JSON.stringify({ draftText: '旧形式からの更新' }) });
        await eventually(() => page.locator('#paper-draft-textarea').inputValue(), '旧形式からの更新', 'Legacy string draft remains compatible');
        await peer.evaluate(key => localStorage.removeItem(key), slotKey('2'));
        await eventually(() => page.locator('#paper-draft-textarea').inputValue(), '', 'Cross-tab deletion clears the visible manuscript');
        record.slots = { one: await readSlot(page, '1'), two: await readSlot(page, '2') }; await peer.close();
    }, { clock: true, storage: { [ACTIVE_SLOT]: '1', [slotKey('1')]: JSON.stringify(seedDraft()), [slotKey('2')]: JSON.stringify(seedDraft('別作品は維持')) } }, VIEWPORTS[3]);

    await runCase('malformed-cross-tab-data-does-not-coerce-or-clobber', async (page, record, current) => {
        await selectPaper(page, 'genko400'); await enterDraft(page, '画面上の原稿を守る', current);
        const peer = await current.context.newPage(); current.observe(peer); await ready(current, candidateUrl, { page: peer });
        // マーカー用イベントを最後に届けて、それ以前の実storageイベントの処理完了を待つ。
        await page.evaluate(() => { window.__paperE2EStorageAck = null; addEventListener('storage', event => { if (event.key === 'paperE2EStorageAck') window.__paperE2EStorageAck = event.newValue; }); });
        record.rejectedPayloads = [];
        for (const [index, payload] of ['{', '[]', '42', '"文字列ルート"', '{"formData":{"draftText":123}}', '{"formData":{"draftText":{"bad":true}},"draftText":false}'].entries()) {
            await peer.evaluate(({ key, payload, ack }) => { localStorage.setItem(key, payload); localStorage.setItem('paperE2EStorageAck', ack); }, { key: slotKey('1'), payload, ack: String(index) });
            await eventually(() => page.evaluate(() => window.__paperE2EStorageAck), String(index), 'Malformed storage event and its following acknowledgement were delivered');
            assert.equal(await page.locator('#paper-draft-textarea').inputValue(), '画面上の原稿を守る'); assert.equal(await draftText(page), '画面上の原稿を守る'); record.rejectedPayloads.push(payload);
        }
        await peer.close();
    }, { clock: true, expectedConsole: [/Failed to parse storage update in paper_gen/] });

    for (const mode of ['missing', 'empty-modern', 'malformed', 'wrong-shape']) await runCase(`book-report-load-${mode}`, async (page, record, current) => {
        await selectPaper(page, 'genko400'); await page.locator('#load-draft-btn').click();
        await consumeAlert(current, mode === 'missing' ? /見つかりません/ : mode === 'empty-modern' ? /からっぽ/ : /エラー|形式/, record);
        assert.equal(await page.locator('#paper-draft-textarea').inputValue(), '');
        assert.equal(await page.locator('.paper-sheet').count(), 1); await selectPaper(page, 'music'); await geometry(page, 'music');
    }, { storage: { [ACTIVE_SLOT]: '1', ...(mode === 'missing' ? {} : { [slotKey('1')]: mode === 'empty-modern' ? JSON.stringify({ formData: { draftText: '' }, draftText: '古い本文' }) : mode === 'malformed' ? '{' : '[]' }) }, expectedConsole: [/Failed to load from book report/] });

    for (const mode of ['denied', 'quota', 'malformed-save']) await runCase(`storage-failure-${mode}-remains-usable`, async (page, record, current) => {
        await selectPaper(page, 'genko400');
        await enterDraft(page, '保存失敗でも印刷できるか\u3099', current); await consumeAlert(current, /保存できません/, record);
        await enterDraft(page, '二度目の編集も表示する', current); assert.deepEqual(current.dialogs, [], 'Repeated save failures do not repeatedly interrupt editing');
        await page.locator('#print-paper-btn').click();
        const printed = await page.evaluate(() => window.__paperE2EBoundary.prints); assert.equal(printed.at(-1).text, '二度目の編集も表示する');
        await selectPaper(page, 'grid10'); await geometry(page, 'grid10'); await screenshot(page, `storage-failure-${mode}`);
        if (mode === 'malformed-save') assert.equal(await page.evaluate(key => localStorage.getItem(key), slotKey('1')), '{', 'Malformed stored data is not silently destroyed');
    }, { clock: true, observePrint: true, denyStorage: mode === 'denied', quotaExceeded: mode === 'quota', storage: mode === 'malformed-save' ? { [slotKey('1')]: '{' } : undefined,
        expectedConsole: [/Failed to apply portal settings/, /Failed to autosave draft from paper_gen/, /下書き保存エラー/] });
    await runCase('invalid-active-slot-stays-within-three-slot-contract', async (page, record, current) => {
        await selectPaper(page, 'genko200'); await enterDraft(page, '安全な保存先', current);
        assert.equal((await readSlot(page, '1')).formData.draftText, '安全な保存先');
        record.keys = await page.evaluate(() => Object.keys(localStorage)); assert.equal(record.keys.includes('bookReportQuestData_slot_../../invalid'), false);
    }, { clock: true, storage: { [ACTIVE_SLOT]: '../../invalid' } });
}

async function shareSuite() {
    const saved = JSON.stringify(seedDraft());
    const shared = '共有された原稿か\u3099葛\u{E0100}👨‍👩‍👧‍👦<&>"\'';
    await runCase('shared-url-view-print-navigation-never-autosaves', async (page, record, current) => {
        assert.equal(await page.locator('#paper-draft-textarea').inputValue(), shared); assert.equal(await draftText(page), nonblank(shared));
        assert.equal(await page.evaluate(key => localStorage.getItem(key), slotKey('1')), saved);
        await page.locator('#print-paper-btn').click(); await page.clock.runFor(1000);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), slotKey('1')), saved, 'Viewing and printing a shared URL never overwrite a local draft');
        await page.goto('about:blank'); await ready(current, `${candidateUrl}?type=genko400&load_draft=true`);
        assert.equal(await page.locator('#paper-draft-textarea').inputValue(), '端末に保存済みの下書き', 'Pagehide of a shared-only view also preserves local work');
        await ready(current, `${candidateUrl}?type=genko200&draft=${encodeURIComponent(shared)}`);
        await enterDraft(page, shared + ' 自分で編集', current);
        assert.equal((await readSlot(page)).formData.draftText, shared + ' 自分で編集', 'Only an actual user edit saves a shared draft');
        record.shared = shared;
    }, { clock: true, observePrint: true, url: `${candidateUrl}?type=genko200&draft=${encodeURIComponent(shared)}`, storage: { [slotKey('1')]: saved } });

    for (const method of ['native', 'fallback']) await runCase(`share-${method}-url-roundtrip-grapheme-limit`, async (page, record, current) => {
        await selectPaper(page, 'genko400'); const long = 'あ'.repeat(998) + 'か\u3099' + '👨‍👩‍👧‍👦' + '終';
        await page.locator('#paper-draft-textarea').fill(long); await page.locator('#share-paper-btn').click();
        await consumeAlert(current, /1000文字|リンクの長さ/, record);
        const observed = await page.evaluate(() => window.__paperE2EBoundary); let url;
        if (method === 'native') { assert.equal(observed.shares.length, 1); url = new URL(observed.shares[0].url); }
        else {
            assert.equal(observed.opens.length, 1); const [address, target, features] = observed.opens[0];
            assert.ok(address.length < 7500, 'Nested LINE URL stays below the request-line budget'); const line = new URL(address); assert.equal(line.origin, 'https://social-plugins.line.me'); assert.equal(line.pathname, '/lineit/share'); assert.equal(target, '_blank'); assert.match(features, /noopener/); url = new URL(line.searchParams.get('url'));
        }
        assert.equal(url.origin, new URL(candidateUrl).origin); assert.equal(url.pathname, new URL(candidateUrl).pathname); assert.equal(url.searchParams.get('type'), 'genko400');
        assert.equal(sharedDraft(url), graphemes(long).slice(0, 1000).join('')); assert.equal(graphemes(sharedDraft(url)).length, 1000); assert.ok(sharedDraft(url).endsWith('か\u3099👨‍👩‍👧‍👦'));
        record.share = { method, url: url.href, graphemeCount: 1000 };
        const recipient = await createCase(VIEWPORTS[0], { url: url.href, storage: { [slotKey('1')]: saved }, observePrint: true });
        try { await ready(recipient, url.href); assert.equal(await recipient.page.locator('#paper-draft-textarea').inputValue(), sharedDraft(url)); assert.equal(await recipient.page.evaluate(key => localStorage.getItem(key), slotKey('1')), saved); assert.deepEqual(recipient.errors, []); assert.deepEqual(recipient.requestFailures, []); }
        finally { await recipient.context.close(); }
        await selectPaper(page, 'kanji'); await page.locator('.kanji-style-btn:has(input[value="84"])').click(); await page.locator('#share-paper-btn').click();
        const last = await page.evaluate(() => window.__paperE2EBoundary); const kanjiUrl = new URL(method === 'native' ? last.shares.at(-1).url : new URL(last.opens.at(-1)[0]).searchParams.get('url'));
        assert.equal(kanjiUrl.searchParams.get('type'), 'kanji'); assert.equal(kanjiUrl.searchParams.get('kanji'), '84'); assert.equal(sharedDraft(kanjiUrl), null, 'Non-manuscript share never leaks text left in the disabled draft input');
        await ready(current, kanjiUrl.href); assert.equal(await page.locator('input[name="kanji-style"][value="84"]').isChecked(), true); await geometry(page, 'kanji', '84');
    }, { clock: true, share: method }, VIEWPORTS[3]);

    for (const [name, value, truncated] of [['japanese1000', 'あ'.repeat(1000), false], ['supplementary1000', '𠮷'.repeat(1000), false], ['family1000', '👨‍👩‍👧‍👦'.repeat(1000), true]]) await runCase(`compact-share-${name}`, async (page, record, current) => {
        await selectPaper(page, 'genko400'); await page.locator('#paper-draft-textarea').fill(value); await page.locator('#share-paper-btn').click();
        if (truncated) await consumeAlert(current, /1000文字|リンクの長さ|省略|一部/, record);
        else assert.deepEqual(current.dialogs, [], '1000 Japanese or supplementary characters are shared completely');
        const [lineUrl] = await page.evaluate(() => window.__paperE2EBoundary.opens.at(-1));
        assert.ok(lineUrl.length < 7500, 'Actual nested LINE request stays below 7500 characters');
        const url = new URL(new URL(lineUrl).searchParams.get('url')), decoded = sharedDraft(url);
        assert.equal(url.searchParams.has('draft64'), true, 'Long Unicode draft uses compact compatible encoding');
        assert.equal(await page.locator('#paper-draft-textarea').inputValue(), value, 'Sharing never truncates the editor');
        if (truncated) { assert.ok(graphemes(decoded).length > 0 && graphemes(decoded).length < 1000); assert.equal(decoded, graphemes(value).slice(0, graphemes(decoded).length).join('')); }
        else assert.equal(decoded, value);
        record.compact = { urlLength: url.href.length, lineUrlLength: lineUrl.length, graphemeCount: graphemes(decoded).length, bytes: Buffer.byteLength(decoded), truncated };
        const recipient = await createCase(VIEWPORTS[1], { url: url.href, storage: { [slotKey('1')]: saved } });
        try { await ready(recipient, url.href); assert.equal(await recipient.page.locator('#paper-draft-textarea').inputValue(), decoded); assert.equal(await draftText(recipient.page), decoded); assert.equal(await recipient.page.evaluate(key => localStorage.getItem(key), slotKey('1')), saved); assert.deepEqual(recipient.errors, []); assert.deepEqual(recipient.requestFailures, []); }
        finally { await recipient.context.close(); }
    }, { clock: true, share: 'fallback' }, VIEWPORTS[3]);
    await runCase('malformed-compact-share-preserves-local-draft', async (page, record, current) => {
        await consumeAlert(current, /共有リンク.*読み込めません/, record);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), slotKey('1')), saved); assert.equal(await page.locator('#paper-draft-textarea').inputValue(), '');
        await selectPaper(page, 'grid5'); await geometry(page, 'grid5');
    }, { url: `${candidateUrl}?type=genko400&draft64=%%%invalid`, storage: { [slotKey('1')]: saved } });

    for (const [query, expected] of [['?type=not-real&kanji=999', 'kanji'], ['?draft=短い共有文&type=not-real', 'genko200'], [`?draft=${encodeURIComponent('あ'.repeat(201))}&type=not-real`, 'genko400']]) await runCase(`url-invalid-state-${expected}-${query.includes('999') ? 'empty' : 'draft'}`, async (page) => {
        assert.equal(await page.locator(`[data-paper-type="${expected}"]`).getAttribute('aria-pressed'), 'true');
        if (expected === 'kanji') assert.equal(await page.locator('input[name="kanji-style"][value="35"]').isChecked(), true);
    }, { url: candidateUrl + query });
}

async function dialogSuite() {
    for (const viewport of [VIEWPORTS[0], VIEWPORTS[3]]) await runCase(`dialog-open-escape-reopen-${viewport.width}`, async (page, record) => {
        const opener = page.locator('[data-action="parents-modal-open"]'), dialog = page.locator('#parents-modal');
        for (let cycle = 0; cycle < 3; cycle++) {
            await opener.focus(); await page.keyboard.press('Enter');
            assert.equal(await dialog.evaluate(node => node.open), true); assert.equal(await opener.getAttribute('aria-expanded'), 'true');
            assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true, 'Native dialog moves focus inside');
            for (let tab = 0; tab < 4; tab++) {
                await page.keyboard.press('Tab');
                const focus = await page.evaluate(() => {
                    const dialog = document.querySelector('#parents-modal'), active = document.activeElement;
                    return { inside: dialog.contains(active), documentRoot: active === document.body || active === document.documentElement, tag: active?.tagName, id: active?.id || '', label: active?.getAttribute('aria-label'), nativeModal: dialog.matches(':modal') };
                });
                (record.focusRoute ||= []).push({ cycle, tab, ...focus });
                assert.equal(focus.nativeModal, true, 'Dialog remains a native modal with an inert background');
                assert.ok(focus.inside || focus.documentRoot, 'Tab never focuses a background page control');
                if (!focus.inside) {
                    // ネイティブdialogのTab末尾はブラウザUIへ移ることがある。次のTabで戻ることを確認する。
                    await page.keyboard.press('Tab');
                    const returned = await dialog.evaluate(node => ({ inside: node.contains(document.activeElement), tag: document.activeElement?.tagName, id: document.activeElement?.id || '' }));
                    record.focusRoute.push({ cycle, tab, browserWrapReturn: true, ...returned });
                    assert.equal(returned.inside, true, 'The next Tab returns from browser UI into the native dialog');
                }
            }
            await page.locator('[data-paper-type="kanji"]').evaluate(node => node.focus());
            assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true, 'Native modal prevents even programmatic focus on a background control');
            if (cycle === 1) await dialog.locator('[data-action="parents-modal-close"]').last().click();
            else await page.keyboard.press('Escape');
            await eventually(() => dialog.evaluate(node => node.open), false, 'Dialog closes');
            await eventually(() => opener.getAttribute('aria-expanded'), 'false', 'Queued native close event synchronizes expanded state after Escape or explicit close'); await focusIs(page, '[data-action="parents-modal-open"]');
        }
        await opener.click(); await screenshot(page, `parents-dialog-reopened-${viewport.width}`); await page.keyboard.press('Escape');
        await eventually(() => opener.getAttribute('aria-expanded'), 'false', 'Reopened dialog completes its native close event'); await focusIs(page, '[data-action="parents-modal-open"]');
        await page.keyboard.press('Tab'); assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), false, 'Closed dialog does not trap focus');
        record.cycles = 4;
    }, {}, viewport);
    await runCase('dark-open-dialog-multipage-pdf-and-afterprint', async (page, record, current) => {
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-night')), true);
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('reduce-motion')), true);
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('text-large')), true);
        record.darkContrast = await page.evaluate(() => {
            const parse = color => { const values = color.match(/[\d.]+/g).map(Number); return [...values.slice(0, 3), values[3] ?? 1]; };
            const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]));
            const luminance = color => color.map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
            return ['.kanji-style-btn:has(input:checked) .text-xs.font-black', '.paper-btn[aria-pressed="true"] .paper-btn__desc', '#paper-actions p', '[data-action="parents-modal-open"] > span:last-child', '#paper-workspace > .no-print > span'].map(selector => {
                const node = document.querySelector(selector), layers = []; for (let parent = node; parent; parent = parent.parentElement) layers.unshift(getComputedStyle(parent).backgroundColor);
                let background = [255, 255, 255]; for (const layer of layers) background = blend(parse(layer), background);
                const color = getComputedStyle(node).color, foreground = blend(parse(color), background), a = luminance(foreground), b = luminance(background);
                return { selector, color, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
            });
        });
        for (const sample of record.darkContrast) assert.ok(sample.ratio >= 4.5, `${sample.selector}: dark text contrast ${sample.ratio.toFixed(2)} meets AA`);
        await screenshot(page, 'dark-initial-controls-contrast');
        await selectPaper(page, 'genko400'); await page.locator('#zoom-in-btn').click(); await page.clock.runFor(250); const originalScale = await scale(page);
        await page.locator('#paper-draft-textarea').fill('夜'.repeat(850));
        await page.locator('[data-action="parents-modal-open"]').click();
        await savePDF(page, 'dark-open-dialog-three-pages', 3, record); await page.clock.runFor(250);
        assert.ok(Math.abs(await scale(page) - originalScale) < .00001, 'Native afterprint preserves the selected zoom');
        await settlePrintMedia(page, current);
        assert.equal(await page.locator('#parents-modal').evaluate(node => getComputedStyle(node).display), 'none', 'An open dialog is absent from printed pages');
        assert.equal(await page.locator('.paper-sheet').first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
        await page.emulateMedia({ media: 'screen' }); await page.keyboard.press('Escape'); await page.clock.runFor(250);
        await paperEdges(page, record, 'afterprint-dark-three-pages'); await screenshot(page, 'dark-afterprint-preview');
        await enterDraft(page, 'もう一度編集', current); assert.equal(await page.locator('.paper-sheet').count(), 1);
    }, { clock: true, storage: { [PROFILE]: JSON.stringify({ darkMode: true, textSize: 'large', reduceMotion: true }) } }, VIEWPORTS[3]);
}

async function nativeSuite() {
    for (const viewport of VIEWPORTS) await runCase(`native-fonts-first-reload-${viewport.width}`, async (page, record, current) => {
        record.loads = [];
        for (let pass = 0; pass < 2; pass++) {
            if (pass) await ready(current, candidateUrl, { reload: true });
            const metrics = await layoutMetrics(page); requireFonts(metrics); record.loads.push(metrics);
            assert.equal(await page.locator('.paper-btn[aria-pressed="true"]').getAttribute('data-paper-type'), 'kanji');
            assert.equal(await page.locator('.paper-sheet rect').count(), 35); await noHorizontalOverflow(page, record);
            await screenshot(page, `native-${viewport.width}-${pass ? 'reload' : 'first'}`);
        }
        record.serviceWorker = await page.evaluate(() => ({ supported: 'serviceWorker' in navigator, controller: navigator.serviceWorker?.controller?.scriptURL || null }));
        record.method = 'Actual browser fonts and service workers; no routes, clock, storage seeds or boundary replacements';
    }, { native: true }, viewport);
}
async function productionSuite() {
    const url = new URL(productionUrl); assert.equal(url.protocol, 'https:'); assert.equal(url.search, ''); assert.equal(url.hash, '');
    assert.ok(url.pathname.endsWith('/paper_gen/'), 'Production URL is the untouched normal Paper Gen directory URL');
    const publicRoot = new URL('../', url), expected = manifests.get('candidate').manifest;
    const expectedByPath = new Map(expected.files.map(entry => [entry.path, entry]));
    for (const viewport of VIEWPORTS) await runCase(`production-native-first-reload-${viewport.width}`, async (page, record, current) => {
        const reference = await createCase(viewport, { native: true }); let local;
        try { await ready(reference); local = await layoutMetrics(reference.page); requireFonts(local); }
        finally { await reference.context.close(); }
        record.loads = [];
        for (let pass = 0; pass < 2; pass++) {
            const pending = [], received = new Map(), captureErrors = [];
            const listener = response => {
                const address = new URL(response.url());
                if (address.origin !== publicRoot.origin || !address.pathname.startsWith(publicRoot.pathname)) return;
                let relative = decodeURIComponent(address.pathname.slice(publicRoot.pathname.length)); if (relative.endsWith('/')) relative += 'index.html';
                const target = expectedByPath.get(relative); if (!target || !/\.(?:html|m?js|css)$/.test(relative)) return;
                pending.push((async () => {
                    try { const bytes = await response.body(); received.set(relative, { path: relative, status: response.status(), bytes: bytes.length, sha256: sha256(bytes), expectedSHA256: target.sha256, fromServiceWorker: response.fromServiceWorker(), url: response.url() }); }
                    catch (error) { captureErrors.push({ path: relative, error: error.message }); }
                })());
            };
            page.on('response', listener);
            try {
                await ready(current, url.href, { reload: pass > 0 });
                const references = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(node => node.src || node.href));
                await Promise.all(pending);
                const required = ['paper_gen/index.html', ...references.filter(value => value.startsWith(publicRoot.href)).map(value => decodeURIComponent(new URL(value).pathname.slice(publicRoot.pathname.length)))];
                const metrics = await layoutMetrics(page); requireFonts(metrics); await noHorizontalOverflow(page, record);
                const load = { pass: pass ? 'reload' : 'first', url: page.url(), assets: [...received.values()], required, captureErrors, metrics }; record.loads.push(load);
                await writeJSON(`production-${viewport.width}-loads.json`, record.loads);
                for (const relative of new Set(required)) {
                    assert.ok(expectedByPath.has(relative), `${relative}: deployed asset belongs to candidate manifest`);
                    const actual = received.get(relative); assert.ok(actual, `${relative}: actual normal-URL response captured`);
                    assert.equal(actual.status, 200); assert.equal(actual.sha256, actual.expectedSHA256, `${relative}: deployed bytes match final build`);
                }
                assert.deepEqual(captureErrors, []); assert.equal(page.url(), url.href, 'No cache-busting query or route workaround');
                const comparable = value => { const copy = structuredClone(value); delete copy.fonts; return copy; };
                assert.deepEqual(comparable(metrics), comparable(local), 'Live initial DOM, controls, SVG and computed layout match the final build');
                await screenshot(page, `production-${viewport.width}-${pass ? 'reload' : 'first'}`);
            } finally { page.off('response', listener); }
        }
        await selectPaper(page, 'genko400');
        assert.equal(await page.locator('#paper-draft-textarea').isEnabled(), true);
        await geometry(page, 'genko400'); await paperEdges(page, record, 'production-manuscript-preview');
        await page.locator('[data-action="parents-modal-open"]').click(); await page.keyboard.press('Escape');
        await eventually(() => page.locator('[data-action="parents-modal-open"]').getAttribute('aria-expanded'), 'false', 'Production native close event synchronizes expanded state');
        await screenshot(page, `production-${viewport.width}-preview`);
        record.method = 'Fresh context per viewport; normal HTTPS URL initial/reload; real fonts and service workers; read-only local DOM/style/response hashing; ordinary non-saving paper selection and dialog; no route, init script, clock or storage fixture';
    }, { native: true, beforeReady: true, url: url.href }, viewport);
    const synthetic = 'あ'.repeat(1000), shareUrl = new URL(url.href);
    shareUrl.searchParams.set('type', 'genko400'); shareUrl.searchParams.set('draft64', Buffer.from(synthetic).toString('base64url'));
    await runCase('production-compact-japanese1000-actual-navigation', async (page, record, current) => {
        const before = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
        await ready(current, shareUrl.href);
        assert.equal(await page.locator('#paper-draft-textarea').inputValue(), synthetic); assert.equal(await text(page, '#draft-char-count'), '1000'); assert.equal(await draftText(page), synthetic);
        assert.equal(await page.locator('.paper-sheet').count(), 3);
        const after = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
        assert.deepEqual(after, before, 'Real production compact URL does not autosave');
        await page.goto(url.href, { waitUntil: 'load' });
        assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))), before, 'Leaving the real shared URL does not save it');
        record.share = { url: shareUrl.href, graphemeCount: 1000, method: 'Actual HTTPS navigation with synthetic text; no fixtures or app mutation' };
    }, { native: true, url: url.href }, VIEWPORTS[1]);

}
async function imageReview() {
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    await writeJSON('image-review-manifest.json', { pairs: imagePairs, note: 'These are PNG evidence artifacts, not a claim of human review. Initial semantic content, computed styles and bounded geometry are asserted independently.' });
    const files = await readdir(artifactDir), images = files.filter(name => name.endsWith('.png')).sort(), pdfs = files.filter(name => name.endsWith('.pdf')).sort();
    await writeFile(path.join(artifactDir, 'index.htm'), `<!doctype html><html lang="ja"><meta charset="utf-8"><title>用紙ジェネレーター 実ビルド検証</title><style>body{font-family:system-ui;margin:24px;background:#e2e8f0;color:#0f172a}section{padding:16px;background:white;margin:24px 0;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{max-width:100%;border:1px solid #94a3b8}figure{margin:0;min-width:0}.overlay{position:relative}.overlay img+img{position:absolute;left:0;top:0;opacity:.5}</style><h1>用紙ジェネレーター 実ビルド検証</h1><p>左：変更前、右：変更後。既知のプレビュー修正を除く初期内容・見た目は実測JSONで検査します。実PDFのページ数・A4寸法も別途検査します。</p>${imagePairs.map(pair => `<section><h2>${escape(pair.name)}</h2><a href="${escape(pair.metrics)}">実測JSON</a><div class="pair"><figure>${pair.before ? `<img loading="lazy" src="${escape(pair.before)}">` : '<p>基準未指定</p>'}</figure><figure><img loading="lazy" src="${escape(pair.after)}"></figure></div>${pair.before ? `<details><summary>50%重ね合わせ</summary><div class="overlay"><img loading="lazy" src="${escape(pair.before)}"><img loading="lazy" src="${escape(pair.after)}"></div></details>` : ''}</section>`).join('')}<h2>実印刷PDF</h2><ul>${pdfs.map(name => `<li><a href="${escape(name)}">${escape(name)}</a></li>`).join('')}</ul><h2>操作・障害・本番の画像</h2>${images.map(name => `<details><summary>${escape(name)}</summary><img loading="lazy" src="${escape(name)}"></details>`).join('')}</html>`);
}

try {
    assert.ok(['browser', 'api'].includes(fontMode), 'PAPER_GEN_FONT_MODE must be browser or api');
    await mkdir(artifactDir, { recursive: true }); candidateUrl = await serveDist(dist); await manifestAssets(dist, 'candidate');
    if (baselineDist) { assert.notEqual(dist, baselineDist); baselineUrl = await serveDist(baselineDist); await manifestAssets(baselineDist, 'baseline'); }
    else console.log('[INFO] PAPER_GEN_BASELINE_ROOT unset: baseline comparison explicitly skipped.');
    await writeJSON('asset-verification-before.json', await Promise.all([...manifests.keys()].map(verifyAssets)));
    browser = await chromium.launch({ headless: true });
    await writeJSON('run-metadata.json', { browser: 'Chromium', version: browser.version(), dist, baselineDist, productionUrl, fontMode, viewports: VIEWPORTS,
        method: 'Actual immutable Vite build; no imported app runtime, app-state mutation or patched app responses. Storage, OS-print and outbound-share fixtures are explicitly labeled. Browser clock only controls lifecycle/debounce tests. Native and production passes use no fixtures. Real PDF bytes are inspected for every page MediaBox and count.' });
    if (productionUrl) await productionSuite();
    else { await initialSuite(); await paperTypesSuite(); await keyboardAndZoomSuite(); await renderingSuite(); await verticalFormsSuite(); await printSuite(); await storageSuite(); await shareSuite(); await dialogSuite(); await nativeSuite(); }
    if (failures.length) throw new AggregateError(failures, `Paper Gen E2E: ${failures.length}/${results.length} cases failed; see ${artifactDir}/results.json`);
    console.log(`[OK] Paper Gen E2E: ${results.length} cases passed. Artifacts: ${artifactDir}`);
} catch (error) {
    await writeJSON('run-error.json', { error: error.stack || String(error), completedCases: results.length }).catch(() => {}); throw error;
} finally {
    try {
        await writeJSON('asset-verification-after.json', await Promise.all([...manifests.keys()].map(verifyAssets))); await imageReview(); await writeJSON('results.json', results);
        await writeJSON('summary.json', { total: results.length, passed: results.filter(result => result.status === 'passed').length, failed: failures.length,
            baselineComparison: baselineDist ? 'requested' : 'explicitly skipped', mode: productionUrl ? 'production-native-verification' : 'local-built-e2e', artifactDir });
    } finally { await browser?.close(); for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

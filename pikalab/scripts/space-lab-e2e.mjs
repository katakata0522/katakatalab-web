import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 実ビルドを変更せず配信する。アプリ内部の状態・関数・回答表は読み込まない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const baselineDist = process.env.SPACE_LAB_BASELINE_ROOT ? path.resolve(process.env.SPACE_LAB_BASELINE_ROOT) : null;
const artifactDir = path.resolve(process.env.SPACE_LAB_ARTIFACT_DIR || path.join(root, 'visual-guard-artifacts', 'space'));
const VIEWPORTS = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];
const PROFILE = 'wonder_school_profile_v2';
const KEYS = { visited: 'pikalab_spacelab_visited', solved: 'pikalab_spacelab_solved_quizzes', muted: 'pikalab_spacelab_bgm_muted', read: 'pikalab_spacelab_read_secrets', badge: 'pikalab_badge_space-lab' };
const PLANETS = [
    { id: 'sun', name: '太陽 (Sun)', answers: [['光球', '約6,000度'], ['何というガス', '水素とヘリウム'], ['黒点', '周りより温度が低い']] },
    { id: 'mercury', name: '水星 (Mercury)', answers: [['温度差', '熱を運ぶ厚い大気がほとんどないから'], ['1周', '約88日'], ['デコボコ', 'クレーター']] },
    { id: 'venus', name: '金星 (Venus)', answers: [['ガス', '二酸化炭素'], ['別名', '明けの明星・宵の明星'], ['自転', '多くの惑星と逆方向に回っている']] },
    { id: 'earth', name: '地球 (Earth)', answers: [['海で', '約70%'], ['空が青く', '短い波長の青い光が大気で強く散乱されるから'], ['衛星', '1つ']] },
    { id: 'mars', name: '火星 (Mars)', answers: [['赤っぽく', '鉄のサビ'], ['山の名前', 'オリンポス山'], ['重力', '地球の約3分の1']] },
    { id: 'jupiter', name: '木星 (Jupiter)', answers: [['大赤斑', '巨大な嵐'], ['主に何', '水素とヘリウムを中心とするガスや流体'], ['自転', '約10時間']] },
    { id: 'saturn', name: '土星 (Saturn)', answers: [['環（わ）', '氷や岩のつぶ'], ['思考実験', '平均密度'], ['タイタン', '分厚い大気がある']] },
    { id: 'uranus', name: '天王星 (Uranus)', answers: [['自転', '軸が横に倒れている'], ['青緑色', 'メタン'], ['巨大氷惑星', 'いいえ、内部では高温・高圧の流体として存在すると考えられる']] },
    { id: 'neptune', name: '海王星 (Neptune)', answers: [['1周', '約165年'], ['風は', '時速2,000kmを超える'], ['青緑色', 'メタン']] },
];
const SECRETS = ['blackhole', 'alien', 'outside', 'time', 'universe', 'darkmatter', 'exoplanet'];
const MODALS = ['planet-detail-modal', 'secret-modal', 'ufo-modal', 'celebration-overlay'];
const servers = [], results = [], failures = [], imagePairs = [], manifests = new Map();
let browser, candidateUrl, baselineUrl;
let resultWrites = Promise.resolve();
const productionUrl = process.env.SPACE_LAB_PRODUCTION_URL ? new URL(process.env.SPACE_LAB_PRODUCTION_URL).href : null;
const writeJSON = (name, data) => writeFile(path.join(artifactDir, name), `${JSON.stringify(data, null, 2)}\n`);
const content = async (page, selector) => (await page.locator(selector).textContent()).trim();
const screenshot = (page, name) => page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' });

async function serveDist(directory) {
    await access(path.join(directory, 'space_lab/index.html'));
    assert.ok((await stat(path.join(directory, 'assets'))).isDirectory(), 'An actual Vite dist/assets directory is required');
    const entry = await readFile(path.join(directory, 'space_lab/index.html'), 'utf8');
    assert.match(entry, /(?:\.\.\/|\/)assets\/[^"']+\.js/, 'Actual bundled Vite entry is required');
    assert.match(entry, /(?:\.\.\/|\/)assets\/[^"']+\.css/, 'Actual bundled Vite CSS is required');
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
    return `http://127.0.0.1:${server.address().port}/space_lab/`;
}
async function manifestAssets(directory, name) {
    const origin = 'http://space-build.invalid', pending = [new URL('/space_lab/index.html', origin)], files = new Map();
    async function includeTree(folder) {
        for (const entry of await readdir(folder, { withFileTypes: true })) {
            const file = path.join(folder, entry.name);
            if (entry.isDirectory()) await includeTree(file);
            else pending.push(new URL(`/${path.relative(directory, file).split(path.sep).join('/')}`, origin));
        }
    }
    await includeTree(path.join(directory, 'space_lab'));
    while (pending.length) {
        const url = pending.shift(); if (url.origin !== origin) continue;
        const relative = decodeURIComponent(url.pathname).replace(/^\//, ''); if (files.has(relative)) continue;
        const file = path.resolve(directory, relative); assert.ok(file.startsWith(directory + path.sep));
        const bytes = await readFile(file), source = bytes.toString('utf8'), references = [];
        files.set(relative, { path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
        if (file.endsWith('.html')) for (const m of source.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) references.push(m[1].replaceAll('&amp;', '&'));
        if (file.endsWith('.css')) {
            for (const m of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) references.push(m[1]);
            for (const m of source.matchAll(/@import\s+["']([^"']+)["']/gi)) references.push(m[1]);
        }
        if (/\.m?js$/.test(file)) {
            for (const m of source.matchAll(/\b(?:import|export)\s*(?:[^;'"\n]*?\bfrom\s*)?["']([^"']+)["']/g)) references.push(m[1]);
            for (const m of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) references.push(m[1]);
        }
        for (const ref of references) {
            if (/^(?:data:|#)/.test(ref)) continue;
            const next = new URL(ref, url); if (next.origin === origin) pending.push(next);
        }
    }
    assert.ok([...files.keys()].some(file => file.startsWith('assets/')));
    const manifest = { entry: 'space_lab/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
    manifests.set(name, { directory, manifest }); await writeJSON(`${name}-asset-manifest.json`, manifest);
}
async function verifyAssets(name) {
    const { directory, manifest } = manifests.get(name);
    for (const entry of manifest.files) {
        const bytes = await readFile(path.join(directory, entry.path));
        assert.equal(bytes.length, entry.bytes, `${name}: immutable size ${entry.path}`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${name}: immutable bytes ${entry.path}`);
    }
    return { name, files: manifest.files.length, manifestSHA256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex') };
}

// 明示した障害・観測ケースだけでブラウザ環境境界を操作する。アプリDOMや内部関数は置換しない。
function browserEnvironment(options) {
    for (const [key, value] of Object.entries(options.storage || {})) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    if (options.denyStorage) for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
    if (options.quotaExceeded) Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    const observations = { clears: {}, audioContexts: 0, audioResumes: 0, audioSuspends: 0, ufoIntervals: 0 };
    if (options.observe) {
        Object.defineProperty(window, '__spaceE2EObservation', { value: observations });
        const clear = CanvasRenderingContext2D.prototype.clearRect;
        CanvasRenderingContext2D.prototype.clearRect = function (...args) {
            if (this.canvas.id) observations.clears[this.canvas.id] = (observations.clears[this.canvas.id] || 0) + 1;
            return Reflect.apply(clear, this, args);
        };
        const NativeAudio = window.AudioContext || window.webkitAudioContext;
        if (NativeAudio) {
            const WrappedAudio = new Proxy(NativeAudio, { construct(target, args) {
                observations.audioContexts++; const ctx = Reflect.construct(target, args);
                for (const [method, count] of [['resume', 'audioResumes'], ['suspend', 'audioSuspends']]) {
                    const original = ctx[method]; ctx[method] = function (...values) { observations[count]++; return Reflect.apply(original, this, values); };
                }
                return ctx;
            } });
            if (window.AudioContext) window.AudioContext = WrappedAudio; else window.webkitAudioContext = WrappedAudio;
        }
    }
    if (options.forceUFO) {
        const interval = window.setInterval;
        window.setInterval = function (callback, delay, ...args) {
            if (delay !== 10000 || typeof callback !== 'function') return interval(callback, delay, ...args);
            return interval(function (...values) {
                observations.ufoIntervals++;
                const random = Math.random; Math.random = () => 0.05;
                try { return Reflect.apply(callback, this, values); } finally { Math.random = random; }
            }, delay, ...args);
        };
    }
}
async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const context = await browser.newContext({ viewport, hasTouch: true, locale: 'ja-JP', timezoneId: 'UTC', colorScheme: options.theme || 'light',
        reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference', serviceWorkers: options.native ? 'allow' : 'block' });
    if (options.storage || options.denyStorage || options.quotaExceeded || options.observe || options.forceUFO) await context.addInitScript(browserEnvironment, options);
    const page = await context.newPage(), errors = [], requestFailures = [], expectedFailures = [], externalFailures = [], dialogs = [];
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    const failure = (url, label) => {
        if (!url.startsWith('http://127.0.0.1:')) externalFailures.push(label);
        else if (options.failImages && /\.(?:png|jpe?g|webp)(?:\?|$)/.test(url)) expectedFailures.push(label);
        else requestFailures.push(label);
    };
    page.on('response', response => { if (response.status() >= 400) failure(response.url(), `${response.status()} ${response.url()}`); });
    page.on('requestfailed', request => failure(request.url(), `${request.failure()?.errorText} ${request.url()}`));
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    if (options.failImages) await context.route(/\.(?:png|jpe?g|webp)(?:\?|$)/, async route => {
        if (!route.request().url().startsWith('http://127.0.0.1:')) return route.continue();
        if (options.failImages === 'timeout') await new Promise(resolve => setTimeout(resolve, 6500));
        try { await route.abort('failed'); } catch { /* タイムアウトで先に終了した要求だけを許容する。 */ }
    });
    return { context, page, options, errors, requestFailures, expectedFailures, externalFailures, dialogs };
}
async function ready(current, url = candidateUrl, { reload = false } = {}) {
    const response = reload ? await current.page.reload({ waitUntil: 'domcontentloaded' }) : await current.page.goto(url, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await current.page.waitForFunction(() => document.querySelector('#loading-overlay')?.classList.contains('hidden'), null, { timeout: 22_000 });
    await current.page.waitForFunction(() => document.querySelectorAll('#a11y-container button').length === 9 && document.querySelectorAll('#minimap-markers button').length === 9);
    await current.page.evaluate(async () => {
        await document.fonts.ready;
        // 使用文字のサブセット読込と再レイアウト完了後に基準版と比較する。
        // fonts.readyだけでは、直前に表示した見出しのswapが次フレームへ残る。
        const anchors = document.querySelectorAll('header, header h1, header a, header button');
        await Promise.all([...anchors].map(node => document.fonts.load(getComputedStyle(node).font, node.textContent || ' ')));
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
}
async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const record = { name, viewport, theme: options.theme || 'light', status: 'passed' }, began = Date.now(); let current;
    try {
        current = await createCase(viewport, options);
        if (!options.beforeReady) await ready(current);
        await work(current.page, record, current);
        assert.deepEqual(current.errors, [], 'No unhandled browser exceptions');
        assert.deepEqual(current.requestFailures, [], 'All actual local build assets load');
        assert.deepEqual(current.dialogs, [], 'No unexpected browser alert');
        console.log(`[OK] Space Lab: ${name}`);
    } catch (error) {
        record.status = 'failed'; record.error = error.stack || String(error); failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Space Lab: ${name}: ${error.message}`);
        if (current?.page) {
            try { await screenshot(current.page, `${name}-failure`); record.failureGeometry = await overflowGeometry(current.page); }
            catch (captureError) { record.captureError = captureError.message; }
        }
    } finally {
        Object.assign(record, { durationMs: Date.now() - began, pageErrors: current?.errors || [], requestFailures: current?.requestFailures || [],
            expectedFailures: current?.expectedFailures || [], externalFailures: current?.externalFailures || [], dialogs: current?.dialogs || [] });
        await current?.context.close(); results.push(record);
        resultWrites = resultWrites.then(() => writeJSON('results.json', results)); await resultWrites;
    }
}
async function isOpen(page, id) {
    return page.locator(`#${id}`).evaluate(node => node instanceof HTMLDialogElement ? node.open : !node.classList.contains('opacity-0') && !node.hidden && !node.classList.contains('hidden'));
}
async function waitOpen(page, id, open = true) {
    await page.waitForFunction(({ id, open }) => {
        const node = document.getElementById(id);
        const actual = node instanceof HTMLDialogElement ? node.open : !node.classList.contains('opacity-0') && !node.hidden && !node.classList.contains('hidden');
        const expandedSettled = id !== 'parents-modal' || open
            || document.querySelector('[data-action="parents-modal-open"]')?.getAttribute('aria-expanded') === 'false';
        return actual === open && expandedSettled;
    }, { id, open });
}
async function resizeViewport(page, viewport) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(({ width, height }) => {
        const canvas = document.querySelector('#space-canvas'), box = canvas?.getBoundingClientRect();
        return innerWidth === width && innerHeight === height && canvas
            && canvas.width === Math.floor(width * devicePixelRatio) && canvas.height === Math.floor(height * devicePixelRatio)
            && Math.abs(box.width - width) < .5 && Math.abs(box.height - height) < .5;
    }, viewport);
}
async function focusInside(page, id) { await page.waitForFunction(id => document.getElementById(id)?.contains(document.activeElement), id); }
async function assertFocus(page, selector) { await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, selector); }
async function openPlanet(page, index, method = 'minimap') {
    if (method === 'keyboard') {
        const target = page.locator('#a11y-container button').nth(index); await target.focus(); await target.press('Enter');
    } else if (method === 'canvas' || method === 'touch') {
        const target = page.locator('#a11y-container button').nth(index); await target.focus(); await page.locator('#bgm-toggle-btn').focus();
        const box = await target.boundingBox(); assert.ok(box && box.width > 0);
        if (method === 'touch') await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else await page.locator('#minimap-markers button').nth(index).click();
    await waitOpen(page, 'planet-detail-modal');
    await page.waitForFunction(name => document.querySelector('#detail-name')?.textContent === name, PLANETS[index].name);
    await focusInside(page, 'planet-detail-modal');
}
async function closePlanet(page, method = 'escape') {
    if (method === 'escape') await page.keyboard.press('Escape');
    else await page.locator(method === 'bottom' ? '#close-modal-bottom-btn' : '#close-modal-btn').click();
    await waitOpen(page, 'planet-detail-modal', false);
}
async function openSecret(page) { await page.locator('#header-badge-btn').click(); await waitOpen(page, 'secret-modal'); await focusInside(page, 'secret-modal'); }
async function closeSecret(page, method = 'escape') {
    if (method === 'escape') await page.keyboard.press('Escape'); else await page.locator('#btn-close-secret').click();
    await waitOpen(page, 'secret-modal', false);
}
async function storage(page) { return page.evaluate(keys => Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, localStorage.getItem(key)])), KEYS); }
async function hiddenDialogsAreInert(page) {
    for (const id of MODALS) {
        if (await isOpen(page, id)) continue;
        const state = await page.locator(`#${id}`).evaluate(node => ({ inert: node.inert || !!node.closest('[inert]'), hidden: node.hidden || getComputedStyle(node).display === 'none', ariaHidden: node.getAttribute('aria-hidden') }));
        assert.ok(state.inert || state.hidden, `${id}: closed controls must be inert or display:none (${JSON.stringify(state)})`);
    }
}
async function trapFocus(page, id) {
    await focusInside(page, id);
    for (let count = 0; count < 18; count++) {
        await page.keyboard.press(count < 9 ? 'Tab' : 'Shift+Tab');
        assert.equal(await page.locator(`#${id}`).evaluate(node => node.contains(document.activeElement)), true, `${id}: keyboard focus stays inside`);
    }
}
async function overflowGeometry(page) {
    return page.evaluate(() => {
        const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
        const key = node => node.id ? `#${node.id}` : `${node.tagName.toLowerCase()}.${[...node.classList].slice(0, 3).join('.')}`;
        return { viewport: { width: innerWidth, height: innerHeight }, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
            offenders: [...document.querySelectorAll('body *')].filter(node => {
                const r = node.getBoundingClientRect(), s = getComputedStyle(node);
                return r.width && r.height && s.display !== 'none' && (r.right > innerWidth + 1 || r.left < -1);
            }).map(node => ({ key: key(node), box: box(node), position: getComputedStyle(node).position, overflow: getComputedStyle(node).overflow,
                opacity: getComputedStyle(node).opacity, transform: getComputedStyle(node).transform,
                parents: [...function* () { for (let p = node.parentElement; p; p = p.parentElement) yield p; }()].slice(0, 5).map(parent => ({ key: key(parent), overflowX: getComputedStyle(parent).overflowX, box: box(parent) })) })) };
    });
}
async function noOverflow(page, record, label) {
    const sample = { label, ...await overflowGeometry(page) }; (record.overflow ||= []).push(sample);
    assert.ok(sample.document <= sample.viewport.width + 1 && sample.body <= sample.viewport.width + 1,
        `${label}: page overflow ${sample.document - sample.viewport.width}px (full offenders recorded)`);
}
async function reachable(page, selector, record) {
    const node = page.locator(selector); await node.scrollIntoViewIfNeeded(); await node.click({ trial: true });
    const sample = await node.evaluate(node => {
        const r = node.getBoundingClientRect(), clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }, ancestors = [];
        const key = element => element.id ? `#${element.id}` : element.tagName.toLowerCase();
        const establishesFixedContainingBlock = style => style.transform !== 'none' || style.perspective !== 'none'
            || style.filter !== 'none' || (style.backdropFilter && style.backdropFilter !== 'none')
            || /(?:layout|paint|strict|content)/.test(style.contain) || /(?:transform|perspective|filter)/.test(style.willChange);
        let viewportFixed = getComputedStyle(node).position === 'fixed';
        for (let p = node.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p), b = p.getBoundingClientRect();
            // root/bodyのoverflowはviewportへ伝播する。通常フローの高さ0/75pxでfixed子孫を切らない。
            // fixed要素より外側の通常祖先は、fixed containing blockを作らない限りクリップしない。
            const root = p === document.body || p === document.documentElement;
            if (viewportFixed && !root && establishesFixedContainingBlock(s)) viewportFixed = false;
            const ignored = root ? 'viewport overflow propagation' : viewportFixed ? 'outside fixed containing block' : null;
            ancestors.push({ key: key(p), overflowX: s.overflowX, overflowY: s.overflowY, ignored });
            if (!ignored) {
                if (/^(?:auto|scroll|hidden|clip)$/.test(s.overflowX)) { clip.left = Math.max(clip.left, b.left + p.clientLeft); clip.right = Math.min(clip.right, b.left + p.clientLeft + p.clientWidth); }
                if (/^(?:auto|scroll|hidden|clip)$/.test(s.overflowY)) { clip.top = Math.max(clip.top, b.top + p.clientTop); clip.bottom = Math.min(clip.bottom, b.top + p.clientTop + p.clientHeight); }
            }
            if (p instanceof HTMLDialogElement && p.open) break; // top layerはDOM上の外側祖先にクリップされない。
            if (s.position === 'fixed') viewportFixed = true;
        }
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, clip, ancestors, hit: !!hit && (node === hit || node.contains(hit)) };
    });
    (record.reachability ||= []).push({ selector, ...sample });
    assert.ok(sample.hit && sample.width > 0 && sample.height > 0 && sample.left >= sample.clip.left - 1 && sample.right <= sample.clip.right + 1 && sample.top >= sample.clip.top - 1 && sample.bottom <= sample.clip.bottom + 1, `${selector}: control is fully reachable ${JSON.stringify(sample)}`);
}

async function initialGeometry(page) {
    return page.evaluate(() => {
        const selectors = ['header', 'header h1', 'header a', '#header-badge-btn', '#bgm-toggle-btn', '[data-action="parents-modal-open"]', '#minimap-container', '#space-canvas', '#scroll-hint'];
        const round = value => Math.round(value * 100) / 100;
        const read = (node, key) => { const r = node.getBoundingClientRect(), s = getComputedStyle(node); return { key,
            box: { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) },
            style: Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'gap', 'color', 'backgroundColor'].map(key => [key, s[key]])) }; };
        return [...selectors.map(selector => read(document.querySelector(selector), selector)),
            ...[...document.querySelectorAll('#a11y-container button')].map((node, index) => read(node, `planet-hit-area-${index}`)),
            ...[...document.querySelectorAll('#minimap-markers button')].map((node, index) => read(node, `minimap-marker-${index}`))];
    });
}
function compareInitialGeometry(candidate, baseline, viewport) {
    const actual = structuredClone(candidate), expected = structuredClone(baseline), exceptions = [];
    if (viewport.width === 360) {
        const keys = ['header', 'header h1', 'header a', '#header-badge-btn', '#bgm-toggle-btn', '[data-action="parents-modal-open"]'];
        const title = candidate.find(item => item.key === 'header h1');
        assert.equal(title.style.fontSize, '16px', '360px title uses the approved compact font');
        assert.equal(title.style.lineHeight, '24px'); assert.equal(title.style.letterSpacing, '0.64px');
        assert.ok(title.box.height <= 48, '360px title occupies at most two lines');
        assert.ok(candidate.find(item => item.key === 'header').box.height <= 80, '360px header ends above the minimap');
        for (const key of keys) {
            const a = actual.find(item => item.key === key), b = expected.find(item => item.key === key);
            for (const field of ['y', 'height']) {
                if (a.box[field] !== b.box[field]) exceptions.push({ key, field: `box.${field}`, baseline: b.box[field], candidate: a.box[field], reason: '360px live-font title previously wrapped to four lines and covered minimap controls' });
                b.box[field] = a.box[field];
            }
            if (key === 'header h1') for (const field of ['fontSize', 'lineHeight', 'letterSpacing']) {
                if (a.style[field] !== b.style[field]) exceptions.push({ key, field: `style.${field}`, baseline: b.style[field], candidate: a.style[field], reason: 'Approved360px-only two-line title correction' });
                b.style[field] = a.style[field];
            }
        }
    }
    return { actual, expected, exceptions };
}
async function layoutSuite() {
    await parallel(VIEWPORTS.flatMap(viewport => ['light', 'dark'].map(theme => ({ viewport, theme }))), async ({ viewport, theme }) => {
        const name = `initial-${viewport.width}-${theme}`;
        await runCase(name, async (page, record) => {
            const candidate = await initialGeometry(page); await noOverflow(page, record, 'initial');
            await screenshot(page, name); let baseline = null;
            if (baselineUrl) {
                const prior = await createCase(viewport, { theme });
                try { await ready(prior, baselineUrl); baseline = await initialGeometry(prior.page); await screenshot(prior.page, `${name}-baseline`); }
                finally { await prior.context.close(); }
            }
            const compared = baseline ? compareInitialGeometry(candidate, baseline, viewport) : null;
            const comparison = { candidate, baseline, exceptions: compared?.exceptions || [],
                rationale: 'Visible initial anchors are exact except the explicitly bounded360px title-font and header/control vertical correction. Horizontal positions/widths, all minimap anchors, canvas/hit areas and every other viewport remain exact. Canvas pixels are animated review artifacts.' };
            record.geometry = `${name}-geometry.json`; await writeJSON(record.geometry, comparison);
            imagePairs.push({ name, candidate: `${name}.png`, baseline: baseline ? `${name}-baseline.png` : null, geometry: record.geometry });
            if (compared) assert.deepEqual(compared.actual, compared.expected, 'Initial anchors remain exact outside the bounded360px header correction');
            for (let index = 0; index < PLANETS.length; index++) await reachable(page, `#minimap-markers button:nth-child(${index + 1})`, record);
            await hiddenDialogsAreInert(page);
        }, { theme }, viewport);
    });
}
async function navigationSuite() {
    await parallel(VIEWPORTS, async viewport => runCase(`navigation-inputs-${viewport.width}`, async (page, record, current) => {
        for (const selector of ['header a', '#header-badge-btn', '#bgm-toggle-btn', '[data-action="parents-modal-open"]']) await reachable(page, selector, record);
        for (let index = 0; index < PLANETS.length; index++) {
            await openPlanet(page, index, index === 0 ? 'canvas' : index === 1 ? 'touch' : index % 2 ? 'keyboard' : 'minimap');
            for (const selector of ['#detail-name', '#detail-desc', '#detail-size', '#detail-distance', '#detail-temp', '#detail-trivia', '#detail-credit']) assert.ok((await content(page, selector)).length > 1, `${selector}: populated ${PLANETS[index].id}`);
            const photo = page.locator('#real-photo-btn');
            assert.match(await photo.getAttribute('href'), /^https:\/\//); assert.match(await photo.getAttribute('rel'), /noopener/);
            assert.equal(await page.locator('#detail-image').evaluate(img => img.complete && img.naturalWidth > 0), true, 'Processed planet image is decoded');
            await noOverflow(page, record, `planet-${PLANETS[index].id}`);
            if (index === 0 || index === 8) await screenshot(page, `detail-${PLANETS[index].id}-${viewport.width}`);
            await closePlanet(page, ['escape', 'top', 'bottom'][index % 3]); await hiddenDialogsAreInert(page);
        }
        const indicator = () => page.locator('#minimap-indicator').evaluate(node => parseFloat(node.style.left));
        const minimap = await page.locator('#minimap-container').boundingBox(); assert.ok(minimap);
        const dragStart = await page.locator('#minimap-container').evaluate(node => {
            const r = node.getBoundingClientRect(); let marker = null;
            for (const fraction of [.5, .4, .6, .25, .75, .1, .9]) {
                const x = r.x + r.width * fraction, y = r.y + r.height / 2, hit = document.elementFromPoint(x, y);
                if (!hit || !node.contains(hit)) continue;
                const button = hit.closest('button');
                if (!button) return { x, y, origin: 'background' };
                marker ||= { x, y, origin: 'marker', label: button.getAttribute('aria-label') };
            }
            // 狭い画面では40pxタッチ領域がバー全体を覆うため、実際のマーカー上からドラッグする。
            return marker;
        });
        assert.ok(dragStart, 'A native minimap background or marker drag origin is reachable');
        record.minimapDrag = dragStart;
        await page.mouse.move(dragStart.x, dragStart.y);
        await page.mouse.down(); await page.mouse.move(minimap.x + 5, minimap.y + minimap.height / 2, { steps: 8 }); await page.mouse.up();
        await page.waitForFunction(() => parseFloat(document.querySelector('#minimap-indicator').style.left) < 2);
        assert.equal(await isOpen(page, 'planet-detail-modal'), false, 'Minimap drag does not open a planet');
        assert.equal(await page.locator('#warp-overlay').evaluate(node => node.classList.contains('opacity-0')), true, 'Marker-start drag suppresses the synthetic click/warp');
        const y = viewport.height * .76;
        await page.mouse.move(viewport.width * .8, y); await page.mouse.down(); await page.mouse.move(viewport.width * .2, y, { steps: 12 }); await page.mouse.up();
        await page.waitForTimeout(250); assert.ok(await indicator() > 1, 'Native canvas drag moves the map');
        const beforeWheel = await indicator(); await page.mouse.move(viewport.width / 2, y); await page.mouse.wheel(0, 160); await page.waitForTimeout(150);
        assert.ok(await indicator() >= beforeWheel, 'Native wheel moves forward');
        const cdp = await current.context.newCDPSession(page);
        try {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: viewport.width * .8, y }] });
            for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: viewport.width * (.8 - .6 * i / 8), y }] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } finally { await cdp.detach(); }
        assert.equal(await isOpen(page, 'planet-detail-modal'), false, 'Touch swipe does not open a planet');
        await page.waitForTimeout(700); await noOverflow(page, record, 'after-wheel-mouse-touch');
        await page.locator('#a11y-container button').last().focus();
        const last = await page.locator('#a11y-container button').last().boundingBox();
        assert.ok(last.x >= -1 && last.x + last.width <= viewport.width + 1, 'Keyboard focus brings the outer planet into view');
        await page.keyboard.press('Enter'); await waitOpen(page, 'planet-detail-modal'); await closePlanet(page);
        await resizeViewport(page, { width: viewport.width + 31, height: viewport.height - 23 });
        assert.equal(await page.locator('#a11y-container button').count(), 9); assert.equal(await page.locator('#minimap-markers button').count(), 9);
        assert.equal(await page.locator('#space-canvas').evaluate(node => node.width), viewport.width + 31);
        await resizeViewport(page, viewport); await noOverflow(page, record, 'resize-restored');
        record.inputs = ['native keyboard/Enter/Escape', 'native canvas mouse and touch taps', 'native wheel and mouse drag', 'CDP trusted touch swipe', 'minimap drag', 'viewport resize'];
    }, {}, viewport));
}
async function quizAnswer(page, planet, record, { wrongFirst = false } = {}) {
    const question = await content(page, '#quiz-question'), matches = planet.answers.filter(([token]) => question.includes(token));
    assert.equal(matches.length, 1, `Exactly one independent expected answer for ${planet.id}: ${question}`);
    const [token, answer] = matches[0];
    const answers = page.locator('#quiz-options button'); assert.equal(await answers.count(), 3);
    const texts = await answers.allTextContents(), correct = texts.findIndex(value => value.trim() === answer);
    assert.ok(correct >= 0, `Expected public answer is offered: ${answer}`);
    if (wrongFirst) {
        const wrong = (correct + 1) % 3; await answers.nth(wrong).click();
        assert.equal(await answers.nth(wrong).isDisabled(), true); assert.equal(await answers.nth(correct).isDisabled(), false);
        assert.match(await content(page, '#quiz-result-text'), /ちがう/); assert.match(await content(page, '#quiz-result-explanation'), /ヒント/);
        assert.equal(await page.locator('#quiz-continue-btn').isVisible(), false, 'Wrong answer cannot advance');
    }
    await answers.nth(correct).click();
    assert.equal(await page.locator('#quiz-options button:disabled').count(), 3);
    assert.match(await content(page, '#quiz-result-text'), /大正解/); assert.ok((await content(page, '#quiz-result-explanation')).length > 10);
    assert.equal(await page.locator('#quiz-result').getAttribute('inert'), null);
    (record.questions ||= []).push({ planet: planet.id, token, question, answer, wrongFirst });
    return token;
}
async function nextQuestion(page) {
    const previous = await content(page, '#quiz-question'); await page.locator('#quiz-continue-btn').click();
    await page.waitForFunction(previous => document.querySelector('#quiz-question').textContent !== previous && document.querySelectorAll('#quiz-options button:not(:disabled)').length === 3, previous);
    assert.notEqual(await page.locator('#quiz-result').getAttribute('inert'), null, 'Unanswered result is inert');
}
async function quizzesAndCompletionSuite() {
    await runCase('all-27-quizzes-wrong-correct-next-review-and-completion', async (page, record, current) => {
        record.completedPlanets = [];
        for (let index = 0; index < PLANETS.length; index++) {
            const planet = PLANETS[index]; await openPlanet(page, index, index % 2 ? 'keyboard' : 'minimap');
            const seen = new Set();
            for (let quiz = 0; quiz < 3; quiz++) {
                const token = await quizAnswer(page, planet, record, { wrongFirst: true });
                assert.equal(seen.has(token), false, 'No already-solved question repeats'); seen.add(token);
                const stored = await storage(page); assert.equal(JSON.parse(stored.solved)[planet.id].length, quiz + 1);
                assert.match(await content(page, '#quiz-section h3'), new RegExp(`${quiz + 1}/3`));
                if (quiz < 2) await nextQuestion(page);
            }
            assert.equal(seen.size, 3);
            const stored = await storage(page); assert.ok(JSON.parse(stored.visited).includes(planet.id), 'Completion is persisted immediately before the stamp timer');
            record.completedPlanets.push(planet.id);
            if (index < PLANETS.length - 1) {
                await page.waitForTimeout(2100); await screenshot(page, `quiz-complete-${planet.id}`); await closePlanet(page);
            }
        }
        assert.equal(record.questions.length, 27);
        await waitOpen(page, 'celebration-overlay'); await focusInside(page, 'celebration-overlay'); await trapFocus(page, 'celebration-overlay');
        await reachable(page, '#close-celebration-btn', record); await screenshot(page, 'all-complete-celebration'); await noOverflow(page, record, 'celebration');
        await page.locator('#close-celebration-btn').click(); await waitOpen(page, 'celebration-overlay', false);
        assert.equal((await storage(page)).badge, 'true');
        if (await isOpen(page, 'planet-detail-modal')) await closePlanet(page);
        const beforeReview = await storage(page);
        for (let index = 0; index < PLANETS.length; index++) {
            await openPlanet(page, index, 'keyboard');
            assert.match(await content(page, '#quiz-result-text'), /復習/); assert.equal(await page.locator('#quiz-options button:disabled').count(), 3);
            const previous = await content(page, '#quiz-question'); await page.locator('#quiz-continue-btn').click();
            await page.waitForFunction(previous => document.querySelector('#quiz-question').textContent !== previous, previous);
            assert.equal(await page.locator('#quiz-options button:disabled').count(), 3);
            assert.equal(await page.locator('#quiz-result').getAttribute('inert'), null, 'Review explanation stays visible after another question');
            assert.equal(await page.locator('#warp-next-btn').isVisible(), false);
            await closePlanet(page);
        }
        assert.equal((await storage(page)).solved, beforeReview.solved, 'Review cannot duplicate solved indexes');
        await openSecret(page); assert.match(await content(page, '#badge-status-container'), /100%/);
        for (let index = 0; index < SECRETS.length; index++) {
            await page.locator('#secret-tabs-container button').nth(index).click();
            assert.match(await content(page, '#secret-content-area'), /TRANSMISSION OK/);
            assert.match(await content(page, '#secret-content-area'), new RegExp(`SC-${SECRETS[index].toUpperCase()}`));
        }
        const read = JSON.parse((await storage(page)).read); assert.deepEqual([...read].sort(), [...SECRETS].sort());
        await screenshot(page, 'secrets-all-read'); await closeSecret(page);
        await ready(current, candidateUrl, { reload: true });
        assert.equal(await isOpen(page, 'celebration-overlay'), false, 'Seen completion does not reappear on reload');
        await openSecret(page); assert.match(await content(page, '#badge-status-container'), /100%/);
        assert.equal(await page.locator('#secret-tabs-container button .animate-pulse').count(), 0, 'Read notification dots persist as dismissed');
        await closeSecret(page); await hiddenDialogsAreInert(page);
    });
}
async function modalSuite() {
    await parallel(VIEWPORTS, async viewport => runCase(`modal-focus-hidden-and-locked-secrets-${viewport.width}`, async (page, record) => {
        await hiddenDialogsAreInert(page);
        await openPlanet(page, 0, 'keyboard'); await assertFocus(page, '#close-modal-btn'); await trapFocus(page, 'planet-detail-modal');
        assert.notEqual(await page.locator('#quiz-result').getAttribute('inert'), null);
        await closePlanet(page); await assertFocus(page, '#a11y-container button');
        await openSecret(page); await assertFocus(page, '#btn-close-secret'); await trapFocus(page, 'secret-modal');
        assert.equal(await page.locator('#secret-tabs-container button').count(), SECRETS.length);
        for (let index = 0; index < SECRETS.length; index++) {
            await page.locator('#secret-tabs-container button').nth(index).click();
            assert.match(await content(page, '#secret-content-area'), /DATA STREAM ENCRYPTED/);
            assert.match(await content(page, '#secret-content-area'), new RegExp(`${index + 1}個`));
        }
        await screenshot(page, `secrets-locked-${viewport.width}`); await noOverflow(page, record, 'locked-secret');
        await closeSecret(page); await assertFocus(page, '#header-badge-btn');
        const opener = page.locator('[data-action="parents-modal-open"]'); await opener.click(); await waitOpen(page, 'parents-modal');
        assert.equal(await opener.getAttribute('aria-expanded'), 'true'); await trapFocus(page, 'parents-modal');
        await screenshot(page, `parents-${viewport.width}`); await page.keyboard.press('Escape'); await waitOpen(page, 'parents-modal', false);
        assert.equal(await opener.getAttribute('aria-expanded'), 'false'); await assertFocus(page, '[data-action="parents-modal-open"]');
        await opener.click(); await page.locator('[data-action="parents-modal-close"]').last().click(); await waitOpen(page, 'parents-modal', false);
        for (let repeat = 0; repeat < 4; repeat++) {
            await openSecret(page); await closeSecret(page, 'button');
            // 再オープンをcloseアニメーションの300ms内に入れ、古いhideタイマーを検出する。
            await openSecret(page); await page.waitForTimeout(400); assert.equal(await isOpen(page, 'secret-modal'), true); await closeSecret(page);
        }
        await hiddenDialogsAreInert(page); await noOverflow(page, record, 'after-repeated-close-reopen');
    }, {}, viewport));
}
async function interruptionSuite() {
    await runCase('interrupted-quiz-navigation-and-rapid-input', async (page, record) => {
        await openPlanet(page, 0, 'keyboard'); await quizAnswer(page, PLANETS[0], record);
        await page.locator('#quiz-continue-btn').click(); await page.keyboard.press('Escape');
        await waitOpen(page, 'planet-detail-modal', false); await openPlanet(page, 4, 'keyboard');
        const question = await content(page, '#quiz-question'); await page.waitForTimeout(900);
        assert.equal(await content(page, '#detail-name'), PLANETS[4].name); assert.equal(await content(page, '#quiz-question'), question, 'Old next-question timer cannot overwrite another planet');
        assert.equal(await page.locator('#quiz-options button:not(:disabled)').count(), 3); await closePlanet(page);
        // ワープ中の背景はinert。連打の2回目は無視され、最初に受理した移動だけが完了する。
        const first = await page.locator('#minimap-markers button').nth(1).boundingBox();
        const last = await page.locator('#minimap-markers button').nth(8).boundingBox();
        await page.mouse.click(first.x + first.width / 2, first.y + first.height / 2);
        await page.mouse.click(last.x + last.width / 2, last.y + last.height / 2);
        await waitOpen(page, 'planet-detail-modal');
        await page.waitForFunction(name => document.querySelector('#detail-name').textContent === name, PLANETS[1].name);
        await page.waitForTimeout(1100); assert.equal(await content(page, '#detail-name'), PLANETS[1].name, 'Rapid clicks during inert warp cannot schedule duplicate navigation');
        await closePlanet(page);
        await openPlanet(page, 0, 'keyboard'); await quizAnswer(page, PLANETS[0], record); await nextQuestion(page); await quizAnswer(page, PLANETS[0], record);
        await page.keyboard.press('Escape'); await waitOpen(page, 'planet-detail-modal', false);
        await openPlanet(page, 3, 'keyboard'); await page.waitForTimeout(1800);
        assert.equal(await content(page, '#detail-name'), PLANETS[3].name); assert.equal(await page.locator('#stamp-effect').evaluate(node => node.classList.contains('opacity-0')), true, 'A cancelled completion stamp cannot linger over a new planet');
        const data = await storage(page); assert.deepEqual([...JSON.parse(data.solved).sun].sort(), [0, 1, 2]); assert.deepEqual(JSON.parse(data.visited), ['sun']);
        await closePlanet(page); await openSecret(page);
        assert.match(await content(page, '#secret-content-area'), /TRANSMISSION OK/); await page.locator('#secret-tabs-container button').nth(1).click();
        assert.match(await content(page, '#secret-content-area'), /DATA STREAM ENCRYPTED/);
        await closeSecret(page); await noOverflow(page, record, 'interruptions-finished');
    });
}

async function loadingAndStorageSuite() {
    await runCase('native-loading-progress-and-fallbacks', async (page, record, current) => {
        const began = Date.now(); await page.goto(candidateUrl, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.locator('#loading-overlay').isVisible(), true); await screenshot(page, 'native-loading');
        await page.waitForFunction(() => document.querySelector('#loading-overlay')?.classList.contains('hidden'), null, { timeout: 22_000 });
        record.loadingMs = Date.now() - began; assert.ok(record.loadingMs < 22_000);
        await openPlanet(page, 0, 'keyboard'); await quizAnswer(page, PLANETS[0], record); await closePlanet(page);
        assert.deepEqual(current.expectedFailures, []);
    }, { beforeReady: true });
    await parallel(['abort', 'timeout'], async mode => runCase(`image-failure-${mode}-remains-usable`, async (page, record, current) => {
        assert.ok(current.expectedFailures.length >= 1, 'Explicit image failure fixture was exercised');
        await openPlanet(page, 0, 'canvas'); await quizAnswer(page, PLANETS[0], record); await closePlanet(page);
        await noOverflow(page, record, 'image-fallback'); await screenshot(page, `image-failure-${mode}`);
    }, { failImages: mode }));
    const fixtures = [
        ['malformed', { [KEYS.visited]: '{bad', [KEYS.solved]: '[bad', [KEYS.read]: 'null', [PROFILE]: '{bad' }],
        ['wrong-types', { [KEYS.visited]: '42', [KEYS.solved]: '[]', [KEYS.read]: '{}', [PROFILE]: 'null' }],
        ['untrusted-items', { [KEYS.visited]: '["not-a-planet",null,42]', [KEYS.solved]: '{"sun":[-1,3,"1",null],"invalid":[0,1,2]}', [KEYS.read]: '["not-a-secret",null]', [PROFILE]: '{"isMuted":"false","keep":"unchanged"}' }],
    ];
    await parallel(fixtures, async ([name, values]) => runCase(`storage-${name}`, async (page, record) => {
        await openSecret(page); assert.match(await content(page, '#badge-status-container'), /0\s*\/\s*9/);
        assert.match(await content(page, '#secret-content-area'), /DATA STREAM ENCRYPTED/); await closeSecret(page);
        await openPlanet(page, 0, 'keyboard'); await quizAnswer(page, PLANETS[0], record); await closePlanet(page);
        const data = await storage(page); record.saved = data;
        assert.equal(JSON.parse(data.solved).sun.length, 1); assert.deepEqual(JSON.parse(data.visited), []); assert.deepEqual(JSON.parse(data.read), []);
    }, { storage: values }));
    await parallel(['denyStorage', 'quotaExceeded'], async failure => runCase(`${failure}-in-memory-continuity`, async (page, record) => {
        await toggleMute(page); const muted = await page.locator('#bgm-icon-off').isVisible();
        await toggleMute(page); assert.notEqual(await page.locator('#bgm-icon-off').isVisible(), muted);
        await openPlanet(page, 0, 'keyboard'); await quizAnswer(page, PLANETS[0], record); await closePlanet(page);
        await openPlanet(page, 0, 'keyboard'); assert.match(await content(page, '#quiz-section h3'), /1\/3/); await closePlanet(page);
        await openSecret(page); await closeSecret(page); await hiddenDialogsAreInert(page);
    }, { [failure]: true }));
    await runCase('mute-persistence-and-shared-profile-preservation', async (page, record, current) => {
        assert.equal(await page.locator('#bgm-icon-off').isVisible(), true);
        await toggleMute(page); assert.equal(await page.locator('#bgm-icon-on').isVisible(), true);
        const profile = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE);
        assert.equal(profile.isMuted, false); assert.equal(profile.darkMode, true); assert.deepEqual(profile.unrelatedLab, { keep: 'space-fixture', count: 17 });
        assert.equal((await storage(page)).muted, 'false'); record.savedProfile = profile;
        await ready(current, candidateUrl, { reload: true }); assert.equal(await page.locator('#bgm-icon-on').isVisible(), true);
        await toggleMute(page); assert.equal(await page.locator('#bgm-icon-off').isVisible(), true);
        await ready(current, candidateUrl, { reload: true }); assert.equal(await page.locator('#bgm-icon-off').isVisible(), true);
    }, { storage: { [PROFILE]: JSON.stringify({ isMuted: true, darkMode: true, unrelatedLab: { keep: 'space-fixture', count: 17 } }) } });
}
async function toggleMute(page) {
    const before = await page.locator('#bgm-icon-off').isVisible(); await page.locator('#bgm-toggle-btn').click();
    await page.waitForFunction(before => !document.querySelector('#bgm-icon-off').classList.contains('hidden') !== before, before);
}
async function observations(page) { return page.evaluate(() => structuredClone(window.__spaceE2EObservation)); }
async function frameSample(page, milliseconds = 180) {
    const before = await observations(page); await page.waitForTimeout(milliseconds); const after = await observations(page);
    return { before, after, mapFrames: (after.clears['space-canvas'] || 0) - (before.clears['space-canvas'] || 0),
        loaderFrames: (after.clears['warp-loader-canvas'] || 0) - (before.clears['warp-loader-canvas'] || 0),
        warpFrames: (after.clears['warp-canvas'] || 0) - (before.clears['warp-canvas'] || 0) };
}
async function setVisibility(page, hidden) {
    await page.evaluate(hidden => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: hidden ? 'hidden' : 'visible' });
        Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await page.waitForTimeout(100);
}
async function lifecycleSuite() {
    await runCase('canvas-audio-visibility-page-lifecycle', async (page, record) => {
        record.samples = [];
        const active = await frameSample(page); record.samples.push({ label: 'active', ...active }); assert.ok(active.mapFrames > 1); assert.equal(active.loaderFrames, 0);
        await toggleMute(page); await toggleMute(page);
        await openPlanet(page, 2, 'keyboard');
        const modal = await frameSample(page); record.samples.push({ label: 'modal', ...modal }); assert.equal(modal.mapFrames, 0, 'Map pauses behind a modal'); assert.equal(modal.warpFrames, 0);
        await setVisibility(page, true); const hiddenModal = await frameSample(page); record.samples.push({ label: 'hidden-modal', ...hiddenModal }); assert.equal(hiddenModal.mapFrames, 0);
        await setVisibility(page, false); const shownModal = await frameSample(page); record.samples.push({ label: 'visible-modal', ...shownModal }); assert.equal(shownModal.mapFrames, 0, 'Returning to a modal does not resume the map behind it');
        await closePlanet(page); await setVisibility(page, true);
        const hidden = await frameSample(page); record.samples.push({ label: 'hidden-map', ...hidden }); assert.equal(hidden.mapFrames, 0);
        const resumesBefore = hidden.after.audioResumes; await page.waitForTimeout(350);
        assert.equal((await observations(page)).audioResumes, resumesBefore, 'Hidden callbacks cannot resume AudioContext');
        await setVisibility(page, false); const resumed = await frameSample(page); record.samples.push({ label: 'resumed', ...resumed }); assert.ok(resumed.mapFrames > 1);
        await page.locator('#minimap-markers button').nth(4).click();
        await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
        await page.waitForTimeout(100); const pageHidden = await frameSample(page); record.samples.push({ label: 'pagehide', ...pageHidden }); assert.equal(pageHidden.mapFrames, 0); assert.equal(pageHidden.warpFrames, 0);
        await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
        await page.waitForTimeout(2300); assert.equal(await isOpen(page, 'planet-detail-modal'), false, 'Aborted navigation cannot open after BFCache-style restore');
        assert.ok((await frameSample(page)).mapFrames > 1);
        const vp = page.viewportSize(); await page.mouse.move(vp.width * .8, vp.height * .75); await page.mouse.down(); await page.mouse.move(vp.width * .3, vp.height * .75);
        await setVisibility(page, true); await page.mouse.up(); await setVisibility(page, false);
        const first = await page.locator('#minimap-indicator').evaluate(node => parseFloat(node.style.left)); await page.mouse.move(vp.width * .7, vp.height * .75); await page.waitForTimeout(250);
        const last = await page.locator('#minimap-indicator').evaluate(node => parseFloat(node.style.left)); assert.ok(Math.abs(first - last) < .5, 'Cancelled drag cannot continue after visibility restore');
        assert.equal((await observations(page)).audioContexts, 1, 'All gestures reuse one native AudioContext');
        record.method = 'Read-only canvas clearRect/audio method counters. Explicit browser visibility property fixture and persisted page events exercise handlers; this is not a claim of a real BFCache navigation.';
    }, { observe: true });
}
async function ufoSuite() {
    await runCase('deterministic-ufo-outbound-overflow-comparison', async (page, record) => {
        await page.waitForFunction(() => !document.querySelector('#ufo-btn').classList.contains('opacity-0'), null, { timeout: 13_000 });
        // 実CSS遷移の出発・中間・画面外を観測する。アプリのstyleや時計は書き換えない。
        const samples = [];
        for (let index = 0; index < 3; index++) { samples.push({ label: `flight-${index}`, ...await overflowGeometry(page) }); await page.waitForTimeout(index === 0 ? 6500 : 3500); }
        await page.waitForFunction(() => document.querySelector('#ufo-btn').getBoundingClientRect().left >= innerWidth, null, { timeout: 7000 });
        record.candidate = await overflowGeometry(page); await noOverflow(page, record, 'ufo-outbound');
        await page.screenshot({ path: path.join(artifactDir, 'ufo-outbound-candidate.png'), fullPage: true, animations: 'allow' }); record.samples = samples;
        if (baselineUrl) {
            const prior = await createCase(VIEWPORTS[3], { theme: 'dark', forceUFO: true });
            try {
                await ready(prior, baselineUrl); await prior.page.waitForFunction(() => !document.querySelector('#ufo-btn').classList.contains('opacity-0'), null, { timeout: 13_000 });
                await prior.page.waitForFunction(() => document.querySelector('#ufo-btn').getBoundingClientRect().left >= innerWidth, null, { timeout: 16_000 });
                record.baseline = await overflowGeometry(prior.page);
                await prior.page.screenshot({ path: path.join(artifactDir, 'ufo-outbound-baseline.png'), fullPage: true, animations: 'allow' });
                record.overflowReductionPx = Math.max(record.baseline.document, record.baseline.body) - Math.max(record.candidate.document, record.candidate.body);
                assert.ok(record.overflowReductionPx >= 0, 'UFO overflow must not get worse when the baseline already includes a fix');
                imagePairs.push({ name: 'UFO outbound overflow', candidate: 'ufo-outbound-candidate.png', baseline: 'ufo-outbound-baseline.png', geometry: 'ufo-overflow.json' });
            } finally { await prior.context.close(); }
        }
        record.method = 'Math.random fixed to0.05 only during the existing10000ms interval callback. Real time, native CSS flight, no app state or layout substitution. Full overflow offenders/ancestor clips recorded.';
        await writeJSON('ufo-overflow.json', record);
    }, { theme: 'dark', forceUFO: true }, VIEWPORTS[3]);
    await runCase('reduced-motion-ufo-keyboard-close-and-inert', async (page, record) => {
        await page.waitForFunction(() => document.querySelector('#ufo-btn').getAttribute('tabindex') === '0', null, { timeout: 13_000 });
        await page.locator('#ufo-btn').focus(); await page.keyboard.press('Enter'); await waitOpen(page, 'ufo-modal'); await focusInside(page, 'ufo-modal');
        await trapFocus(page, 'ufo-modal'); await noOverflow(page, record, 'ufo-modal'); await screenshot(page, 'ufo-dialog-mobile');
        await page.keyboard.press('Escape'); await waitOpen(page, 'ufo-modal', false); await hiddenDialogsAreInert(page);
        assert.equal(await page.locator('#ufo-btn').getAttribute('tabindex'), '-1');
    }, { forceUFO: true, reducedMotion: true });
}
async function nativeFontSmokeSuite() {
    await parallel(VIEWPORTS, async viewport => runCase(`native-fonts-pwa-${viewport.width}`, async (page, record) => {
        record.fonts = await page.evaluate(() => [...document.fonts].map(face => ({ family: face.family, status: face.status })));
        assert.ok(record.fonts.some(face => face.family.includes('M PLUS Rounded 1c') && face.status === 'loaded'), 'Actual Japanese web font loaded');
        assert.ok(record.fonts.some(face => face.family.includes('Material Symbols Rounded') && face.status === 'loaded'), 'Actual icon web font loaded');
        record.serviceWorkers = await page.evaluate(async () => 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).map(item => ({ scope: item.scope, active: item.active?.scriptURL || null })) : []);
        await openPlanet(page, 0, 'touch'); await quizAnswer(page, PLANETS[0], record, { wrongFirst: true }); await noOverflow(page, record, 'native-font-quiz');
        await screenshot(page, `native-fonts-detail-${viewport.width}`); await closePlanet(page); await openSecret(page);
        await noOverflow(page, record, 'native-font-secret'); await screenshot(page, `native-fonts-secret-${viewport.width}`); await closeSecret(page);
        record.environment = 'Fresh native context; no routes, init scripts, clock, random or API interception; real fonts and serviceWorkers allow';
    }, { native: true, theme: viewport.width >= 768 ? 'dark' : 'light' }, viewport));
}
async function metrics(cdp) { const { metrics } = await cdp.send('Performance.getMetrics'); return Object.fromEntries(metrics.map(item => [item.name, item.value])); }
async function retention(page, cdp) {
    await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(75); await cdp.send('HeapProfiler.collectGarbage');
    return { connected: await page.evaluate(() => {
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL), byType = {}; let count = 0;
        do { count++; byType[walker.currentNode.nodeType] = (byType[walker.currentNode.nodeType] || 0) + 1; } while (walker.nextNode());
        return { count, byType, elements: document.querySelectorAll('*').length };
    }), dom: await cdp.send('Memory.getDOMCounters'), metrics: await metrics(cdp) };
}
async function workflowBatch(page, count) {
    for (let index = 0; index < count; index++) {
        await openPlanet(page, 0, 'keyboard'); await closePlanet(page);
        await openSecret(page); await closeSecret(page);
        await page.locator('[data-action="parents-modal-open"]').click(); await waitOpen(page, 'parents-modal');
        await page.keyboard.press('Escape'); await waitOpen(page, 'parents-modal', false);
    }
    await page.locator('#header-badge-btn').focus(); await page.waitForTimeout(1100);
}
async function performanceSuite() {
    await runCase('same-state-warmed-repeated-session-retention', async (page, record, current) => {
        const cdp = await current.context.newCDPSession(page); await cdp.send('Performance.enable');
        record.checkpoints = []; record.violations = [];
        try {
            await workflowBatch(page, 4); record.warm = await retention(page, cdp);
            for (let batch = 0; batch < 3; batch++) { await workflowBatch(page, 4); record.checkpoints.push(await retention(page, cdp)); await writeJSON('performance.json', record); }
            for (const [index, sample] of record.checkpoints.entries()) {
                const fail = (condition, label) => { if (!condition) record.violations.push({ batch: index + 1, label }); };
                fail(JSON.stringify(sample.connected) === JSON.stringify(record.warm.connected), 'Same UI retains identical connected DOM');
                fail(sample.dom.jsEventListeners <= record.warm.dom.jsEventListeners, 'Retained listeners do not grow after warmup');
                fail(sample.dom.nodes <= record.warm.dom.nodes, 'Retained DOM/native nodes do not grow after warmup');
                fail(sample.dom.documents === record.warm.dom.documents, 'No document growth');
                fail(sample.metrics.DetachedScriptStates === record.warm.metrics.DetachedScriptStates, 'No detached script-state growth');
            }
            record.method = 'One4-workflow warmup, three4-workflow batches, same focus/UI with completed transitions, double V8/Blink garbage collection per sample. Timing and heap are recorded evidence, not noisy pass thresholds.';
            if (record.violations.length) {
                await screenshot(page, 'retention-failure');
                await writeJSON('retention-dom-snapshot.json', await cdp.send('DOMSnapshot.captureSnapshot', { computedStyles: ['display', 'transform'], includeDOMRects: true }));
                const chunks = [], listener = ({ chunk }) => chunks.push(chunk); cdp.on('HeapProfiler.addHeapSnapshotChunk', listener);
                try { await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false }); await writeFile(path.join(artifactDir, 'retention-failure.heapsnapshot'), chunks.join('')); }
                finally { cdp.off('HeapProfiler.addHeapSnapshotChunk', listener); }
            }
            assert.deepEqual(record.violations, [], 'Same-state warmed sessions must retain bounded nodes and listeners');
        } finally { await cdp.detach(); await writeJSON('performance.json', record); }
    }, {}, VIEWPORTS[3]);
    await runCase('resize-node-reuse-allocation-comparison', async (page, record, current) => {
        async function sample(subject) {
            const observer = await subject.page.evaluateHandle(() => {
                const counts = { added: 0, removed: 0 }, initial = [...document.querySelectorAll('#a11y-container button,#minimap-markers button')];
                const add = records => { for (const item of records) { counts.added += item.addedNodes.length; counts.removed += item.removedNodes.length; } };
                const observer = new MutationObserver(add);
                for (const selector of ['#a11y-container', '#minimap-markers']) observer.observe(document.querySelector(selector), { subtree: true, childList: true });
                return { finish() { add(observer.takeRecords()); observer.disconnect(); return { ...counts, reused: initial.filter(node => node.isConnected).length, initial: initial.length }; } };
            });
            for (let index = 0; index < 10; index++) { await resizeViewport(subject.page, { width: index % 2 ? 1440 : 1410, height: 900 }); }
            const result = await observer.evaluate(value => value.finish()); await observer.dispose(); return result;
        }
        record.candidate = await sample(current);
        if (baselineUrl) {
            const baseline = await createCase(VIEWPORTS[3]);
            try { await ready(baseline, baselineUrl); record.baseline = await sample(baseline); }
            finally { await baseline.context.close(); }
            record.savedAllocations = record.baseline.added - record.candidate.added;
            assert.ok(record.savedAllocations >= 0, 'Resize must not allocate more hit-area/minimap nodes than the baseline');
        }
        await writeJSON('resize-allocation.json', record);
    }, {}, VIEWPORTS[3]);
}
async function shortScreenSuite() {
    await runCase('short-landscape-modal-reachability', async (page, record) => {
        await openPlanet(page, 0, 'keyboard');
        await reachable(page, '#close-modal-btn', record); await reachable(page, '#warp-next-btn', record);
        await quizAnswer(page, PLANETS[0], record, { wrongFirst: true });
        // 結果パネルの展開と先行する選択肢のborder変化が終わってから、ネイティブスクロールで到達性を調べる。
        // 対象ボタンだけの2フレーム安定では祖先・兄弟のtransition完了を保証できない。時間固定や許容幅の緩和はしない。
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => {
            const section = document.querySelector('#quiz-section');
            return section && document.fonts.status === 'loaded' && section.getAnimations({ subtree: true }).every(animation =>
                !animation.pending && (animation.playState === 'finished' || animation.playState === 'idle'));
        });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        record.quizLayoutBeforeScroll = await page.locator('#quiz-result').evaluate(result => ({
            maxHeight: getComputedStyle(result).maxHeight, clientHeight: result.clientHeight, scrollHeight: result.scrollHeight,
            scrollTop: document.querySelector('#modal-body').scrollTop,
            animations: document.querySelector('#quiz-section').getAnimations({ subtree: true }).map(animation => ({
                property: animation.transitionProperty || animation.animationName, pending: animation.pending, playState: animation.playState,
            })),
        }));
        await reachable(page, '#quiz-continue-btn', record); await reachable(page, '#close-modal-bottom-btn', record);
        await noOverflow(page, record, 'short-planet'); await screenshot(page, 'short-landscape-planet');
        await closePlanet(page, 'bottom'); await openSecret(page);
        await reachable(page, '#btn-close-secret', record);
        await page.locator('#secret-tabs-container button').last().click();
        await noOverflow(page, record, 'short-secret'); await screenshot(page, 'short-landscape-secret');
        await closeSecret(page); await page.locator('[data-action="parents-modal-open"]').click();
        await waitOpen(page, 'parents-modal'); await reachable(page, '[data-action="parents-modal-close"]:not([aria-label])', record);
        await screenshot(page, 'short-landscape-parents'); await page.keyboard.press('Escape');
        await hiddenDialogsAreInert(page);
    }, {}, { width: 667, height: 375 });
}
async function productionSuite() {
    const url = new URL(productionUrl); assert.equal(url.protocol, 'https:', 'Production verification uses HTTPS');
    assert.equal(url.search, '', 'Production verification uses the normal URL without a cache-buster');
    const publicRoot = new URL('../', url), expected = manifests.get('candidate').manifest;
    await parallel(VIEWPORTS, async viewport => runCase(`production-native-first-reload-${viewport.width}`, async (page, record, current) => {
        record.loads = [];
        for (let pass = 0; pass < 2; pass++) {
            const pending = [], received = new Map();
            const listener = response => {
                const address = new URL(response.url());
                if (address.origin !== publicRoot.origin || !address.pathname.startsWith(publicRoot.pathname)) return;
                let relative = decodeURIComponent(address.pathname.slice(publicRoot.pathname.length));
                if (relative.endsWith('/')) relative += 'index.html';
                const target = expected.files.find(file => file.path === relative);
                if (!target || !/\.(?:html|m?js|css)$/.test(relative)) return;
                pending.push((async () => {
                    const bytes = await response.body();
                    received.set(relative, { path: relative, status: response.status(), bytes: bytes.length,
                        sha256: createHash('sha256').update(bytes).digest('hex'), expectedSHA256: target.sha256,
                        fromServiceWorker: response.fromServiceWorker(), url: response.url() });
                })());
            };
            page.on('response', listener);
            try {
                await ready(current, url.href, { reload: pass > 0 });
                const required = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(node => node.src || node.href));
                await Promise.all(pending);
                const localRequired = ['space_lab/index.html', ...required.filter(value => value.startsWith(publicRoot.href)).map(value => decodeURIComponent(new URL(value).pathname.slice(publicRoot.pathname.length)))];
                const load = { pass: pass ? 'reload' : 'first', url: page.url(), assets: [...received.values()], required: localRequired };
                load.fonts = await page.evaluate(() => [...document.fonts].map(face => ({ family: face.family, status: face.status })));
                assert.ok(load.fonts.some(face => face.family.includes('M PLUS Rounded 1c') && face.status === 'loaded'), 'Production Japanese web font loaded');
                assert.ok(load.fonts.some(face => face.family.includes('Material Symbols Rounded') && face.status === 'loaded'), 'Production symbol font loaded');
                record.loads.push(load); await writeJSON(`production-${viewport.width}-assets.json`, record.loads);
                for (const relative of new Set(localRequired)) {
                    const actual = received.get(relative); assert.ok(actual, `${relative}: actual normal-URL browser response captured`);
                    assert.equal(actual.status, 200); assert.equal(actual.sha256, actual.expectedSHA256, `${relative}: deployed bytes match local final build`);
                }
                assert.equal(page.url(), url.href, 'No production query-string workaround');
                await openPlanet(page, 0, 'touch'); await quizAnswer(page, PLANETS[0], record, { wrongFirst: true });
                await noOverflow(page, record, `production-${pass ? 'reload' : 'first'}`);
                await screenshot(page, `production-${viewport.width}-${pass ? 'reload' : 'first'}`); await closePlanet(page);
            } finally { page.off('response', listener); }
        }
        record.method = 'Fresh context per viewport; actual normal production URL, initial and reload response SHA256 compared with local final build, native fonts and service worker enabled, no routes/init scripts/clock changes';
    }, { beforeReady: true, native: true }, viewport));
}
async function parallel(items, work, concurrency = 2) {
    const queue = [...items]; await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length) await work(queue.shift());
    }));
}
async function imageReview() {
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    await writeJSON('image-review-manifest.json', { images: imagePairs, note: 'Review artifacts, not a claim of human review. Animated canvas pixels are not exact pixel assertions; initial DOM anchor geometry is independently strict.' });
    const screenshots = (await readdir(artifactDir)).filter(name => name.endsWith('.png')).sort();
    await writeFile(path.join(artifactDir, 'index.htm'), `<!doctype html><html lang="ja"><meta charset="utf-8"><title>Space Lab 実ビルド検証</title><style>body{font-family:system-ui;margin:24px;background:#e2e8f0;color:#0f172a}section{padding:16px;background:white;margin:24px 0;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{max-width:100%;border:1px solid #94a3b8}figure{margin:0;min-width:0}.overlay{position:relative}.overlay img+img{position:absolute;left:0;top:0;opacity:.5}a{color:#1d4ed8}</style><h1>Space Lab 実ビルド検証</h1><p>左：基準、右：候補。初期レイアウトは厳密比較。UFOの画面外飛行はoverflow実測を比較。すべてのJSONと画像は同じフォルダ内。</p>${imagePairs.map(pair => `<section><h2>${escape(pair.name)}</h2><p><a href="${escape(pair.geometry)}">実測JSON</a></p><div class="pair"><figure>${pair.baseline ? `<img loading="lazy" src="${escape(pair.baseline)}">` : '<p>基準未指定</p>'}</figure><figure><img loading="lazy" src="${escape(pair.candidate)}"></figure></div>${pair.baseline ? `<details><summary>50%重ね合わせ</summary><div class="overlay"><img loading="lazy" src="${escape(pair.baseline)}"><img loading="lazy" src="${escape(pair.candidate)}"></div></details>` : ''}</section>`).join('')}<h2>操作・モーダル・実フォント画像</h2>${screenshots.map(name => `<details><summary>${escape(name)}</summary><img loading="lazy" src="${escape(name)}"></details>`).join('')}</html>`);
}

try {
    await mkdir(artifactDir, { recursive: true }); candidateUrl = await serveDist(dist); await manifestAssets(dist, 'candidate');
    if (baselineDist) { assert.notEqual(dist, baselineDist); baselineUrl = await serveDist(baselineDist); await manifestAssets(baselineDist, 'baseline'); }
    else console.log('[INFO] SPACE_LAB_BASELINE_ROOT unset: baseline comparison explicitly skipped; candidate functionality still runs.');
    await writeJSON('asset-verification-before.json', await Promise.all([...manifests.keys()].map(verifyAssets)));
    browser = await chromium.launch({ headless: true });
    await writeJSON('run-metadata.json', { browser: 'Chromium', version: browser.version(), candidateDist: dist, baselineDist, viewports: VIEWPORTS,
        mainEnvironment: 'Native fonts/time/input; no local asset substitution. Explicit storage/image/UFO/lifecycle fixtures are individually labeled. No imported application runtime, forced app transitions or exposed app state.',
        nativeSmoke: 'Four untouched contexts with actual network fonts and PWA enabled', initialGeometry: 'Exact initial visible anchors in light/dark preferences; only360px title font and header/control y/height have an explicitly checked two-line/minimap-clearance correction' });
    if (productionUrl) await productionSuite();
    else {
        await layoutSuite(); await navigationSuite(); await quizzesAndCompletionSuite(); await modalSuite(); await shortScreenSuite(); await interruptionSuite();
        await loadingAndStorageSuite(); await lifecycleSuite(); await ufoSuite(); await nativeFontSmokeSuite(); await performanceSuite();
    }
    if (failures.length) throw new AggregateError(failures, `Space Lab built E2E: ${failures.length}/${results.length} failed; see ${artifactDir}/results.json`);
    console.log(`[OK] Space Lab built E2E: ${results.length} cases passed. Screenshots, geometry, native fonts, overflow, retention and immutable assets: ${artifactDir}`);
} catch (error) {
    await writeJSON('run-error.json', { error: error.stack || String(error), completedCases: results.length }).catch(() => {}); throw error;
} finally {
    try {
        await writeJSON('asset-verification-after.json', await Promise.all([...manifests.keys()].map(verifyAssets))); await imageReview();
        await writeJSON('results.json', results);
        await writeJSON('summary.json', { total: results.length, passed: results.filter(item => item.status === 'passed').length, failed: failures.length,
            baselineComparison: baselineDist ? 'requested' : 'explicitly skipped', artifactDir });
    } finally { await browser?.close(); for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

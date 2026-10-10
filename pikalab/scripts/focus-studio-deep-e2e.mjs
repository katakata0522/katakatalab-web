import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 確定済みビルドを無加工で配信する。アプリ内部の状態・関数は参照も置換もしない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const baselineDist = process.env.FOCUS_STUDIO_BASELINE_ROOT ? path.resolve(process.env.FOCUS_STUDIO_BASELINE_ROOT) : null;
const artifactDir = path.resolve(process.env.FOCUS_STUDIO_ARTIFACT_DIR || path.join(root, 'visual-guard-artifacts', 'focus'));
const productionUrl = process.env.FOCUS_STUDIO_PRODUCTION_URL || null;
const VIEWPORTS = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];
const SOUNDS = ['brown', 'pink', 'rain', 'cafe', 'white'];
const KEYS = { task: 'focusStudioTask', count: 'focusStudioCompletedCount', volume: 'focusStudioChimeVolume', dark: 'focusStudioDarkMode' };
const EPOCH = new Date('2026-01-02T12:00:00.000Z');
const TONE_REQUEST = /\/tone(?:-[\d.]+)?(?:\.min)?\.js(?:\?|$)/;
const servers = [], manifests = new Map(), results = [], failures = [], imagePairs = [];
let browser, candidateUrl, baselineUrl;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJSON = (name, value) => writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
const text = async (page, selector) => (await page.locator(selector).textContent()).trim();
const screenshot = (page, name) => page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' });
const parseTime = value => { const match = /^(\d+):(\d{2})$/.exec(value.trim()); assert.ok(match, `Timer text: ${value}`); return Number(match[1]) * 60 + Number(match[2]); };
const seconds = async page => parseTime(await text(page, '#timer-display'));

async function serveDist(directory) {
    const entry = await readFile(path.join(directory, 'focus_studio/index.html'), 'utf8');
    assert.ok((await stat(path.join(directory, 'assets'))).isDirectory(), 'Actual build assets are required');
    assert.match(entry, /(?:\.\.\/|\/)assets\/[^"']+\.css/, 'Serve a real Vite build, not source HTML');
    await access(path.join(directory, 'focus_studio/runtime-hardening.js'));
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
    return `http://127.0.0.1:${server.address().port}/focus_studio/`;
}

async function manifestAssets(directory, name) {
    const origin = 'https://focus-build.invalid', pending = [new URL('/focus_studio/index.html', origin)], files = new Map();
    async function includeTree(folder) {
        for (const entry of await readdir(folder, { withFileTypes: true })) {
            const file = path.join(folder, entry.name);
            if (entry.isDirectory()) await includeTree(file);
            else pending.push(new URL(`/${path.relative(directory, file).split(path.sep).join('/')}`, origin));
        }
    }
    await includeTree(path.join(directory, 'focus_studio'));
    // 遅延ロードの音声ライブラリも公開物の同一性検証に含める。
    for (const relative of ['assets/tone-14.8.49.js', 'pwa-runtime.js']) {
        await access(path.join(directory, relative)); pending.push(new URL(`/${relative}`, origin));
    }
    while (pending.length) {
        const url = pending.shift(); if (url.origin !== origin) continue;
        const relative = decodeURIComponent(url.pathname).replace(/^\//, ''); if (files.has(relative)) continue;
        const file = path.resolve(directory, relative); assert.ok(file.startsWith(directory + path.sep));
        const bytes = await readFile(file), source = bytes.toString('utf8'), references = [];
        files.set(relative, { path: relative, bytes: bytes.length, sha256: sha256(bytes) });
        if (file.endsWith('.html')) for (const match of source.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) references.push(match[1].replaceAll('&amp;', '&'));
        if (file.endsWith('.css')) {
            for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) references.push(match[1]);
            for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gi)) references.push(match[1]);
        }
        if (/\.m?js$/.test(file)) {
            for (const match of source.matchAll(/\b(?:import|export)\s*(?:[^;'"\n]*?\bfrom\s*)?["']([^"']+)["']/g)) references.push(match[1]);
            for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) references.push(match[1]);
        }
        for (const reference of references) {
            if (/^(?:data:|#)/.test(reference)) continue;
            const next = new URL(reference, url); if (next.origin === origin) pending.push(next);
        }
    }
    const manifest = { entry: 'focus_studio/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
    manifests.set(name, { directory, manifest }); await writeJSON(`${name}-asset-manifest.json`, manifest);
}

async function verifyAssets(name) {
    const { directory, manifest } = manifests.get(name);
    for (const entry of manifest.files) {
        const bytes = await readFile(path.join(directory, entry.path));
        assert.equal(bytes.length, entry.bytes, `${name}: immutable size ${entry.path}`);
        assert.equal(sha256(bytes), entry.sha256, `${name}: immutable bytes ${entry.path}`);
    }
    return { name, files: manifest.files.length, manifestSHA256: sha256(JSON.stringify(manifest)) };
}

// 障害ケースだけでStorage/Web Audioの環境境界を操作する。Toneやアプリ関数は触らない。
function browserEnvironment(options) {
    for (const [key, value] of Object.entries(options.storage || {})) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    if (options.denyStorage) for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
    if (options.quotaExceeded) Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    if (options.rejectAudioResume) for (const Constructor of new Set([window.AudioContext, window.webkitAudioContext].filter(Boolean))) {
        Constructor.prototype.resume = () => Promise.reject(new DOMException('Audio unavailable', 'NotAllowedError'));
    }
    if (options.observeAudio) {
        const loops = new Map(), observation = { starts: 0, stops: 0, activeLoops: 0, activeNonHelperLoops: 0, activeHelperLoops: 0, helperStarts: 0, helperEvidence: [] };
        Object.defineProperty(window, '__focusBrowserObservation', { value: observation });
        const refresh = () => {
            observation.activeLoops = loops.size;
            observation.activeHelperLoops = [...loops.values()].filter(value => value !== null).length;
            observation.activeNonHelperLoops = observation.activeLoops - observation.activeHelperLoops;
        };
        // 同梱Tone.getConstantだけが作るmono/128フレーム/全0または全1のDCバッファを識別する。
        // 通常のノイズや他のループは、名前や個数では除外しない。全128サンプルを実測する。
        const helperConstant = source => {
            const buffer = source.buffer;
            if (!buffer || buffer.numberOfChannels !== 1 || buffer.length !== 128) return null;
            const samples = buffer.getChannelData(0), value = samples[0];
            if ((value !== 0 && value !== 1) || !samples.every(sample => sample === value)) return null;
            observation.helperStarts++;
            observation.helperEvidence.push({ sourceId: observation.starts, constant: value, channels: buffer.numberOfChannels, frames: buffer.length,
                sampleRate: buffer.sampleRate, verifiedSampleCount: samples.length, minimum: Math.min(...samples), maximum: Math.max(...samples),
                firstEight: [...samples.slice(0, 8)], lastEight: [...samples.slice(-8)] });
            return value;
        };
        const prototype = window.AudioBufferSourceNode?.prototype;
        if (prototype) {
            const start = prototype.start, stop = prototype.stop;
            prototype.start = function (...args) {
                const result = Reflect.apply(start, this, args); observation.starts++;
                if (this.loop) { loops.set(this, helperConstant(this)); refresh(); this.addEventListener('ended', () => { loops.delete(this); refresh(); }, { once: true }); }
                return result;
            };
            prototype.stop = function (...args) {
                const result = Reflect.apply(stop, this, args); observation.stops++; loops.delete(this); refresh(); return result;
            };
        }
    }
}

async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const context = await browser.newContext({ viewport, locale: 'ja-JP', timezoneId: 'UTC', colorScheme: options.theme || 'light',
        isMobile: Boolean(options.touch), hasTouch: Boolean(options.touch),
        reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference', serviceWorkers: options.native ? 'allow' : 'block' });
    if (options.storage || options.denyStorage || options.quotaExceeded || options.rejectAudioResume || options.observeAudio) await context.addInitScript(browserEnvironment, options);
    const current = { context, options, errors: [], requestFailures: [], externalFailures: [], expectedFailures: [], dialogs: [], consoleErrors: [], audioRequests: 0 };
    current.observe = page => {
        page.setDefaultTimeout(15_000);
        page.on('pageerror', error => current.errors.push(error.stack || error.message));
        page.on('console', message => { if (message.type() === 'error') current.consoleErrors.push(message.text()); });
        const failure = (url, label) => {
            if (options.failAudio && TONE_REQUEST.test(url)) current.expectedFailures.push(label);
            else if (new URL(url).origin === new URL(options.url || candidateUrl).origin) current.requestFailures.push(label);
            else current.externalFailures.push(label);
        };
        page.on('response', response => { if (response.status() >= 400) failure(response.url(), `${response.status()} ${response.url()}`); });
        page.on('requestfailed', request => failure(request.url(), `${request.failure()?.errorText} ${request.url()}`));
        page.on('dialog', async dialog => { current.dialogs.push(dialog.message()); await dialog.dismiss(); });
    };
    current.page = await context.newPage(); current.observe(current.page);
    if (options.clock) { await current.page.clock.install({ time: EPOCH }); await current.page.clock.pauseAt(EPOCH); }
    if (options.failAudio || options.delayAudio) {
        let release; const gate = new Promise(resolve => { release = resolve; }); current.releaseAudio = release;
        await context.route(TONE_REQUEST, async route => {
            current.audioRequests++;
            if (options.delayAudio) await gate;
            if (options.failAudio) await route.abort('failed'); else await route.continue();
        });
    }
    return current;
}

async function ready(current, url = candidateUrl, { reload = false, page = current.page } = {}) {
    const response = reload ? await page.reload({ waitUntil: 'domcontentloaded' }) : await page.goto(url, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.locator('#timer-display').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelectorAll('#sound-container button[aria-pressed]').length === 5);
    await page.evaluate(() => document.fonts.ready);
    if (!current.options.clock) {
        // DOM初期化で25分選択・暗色へ切り替えた直後は、computed styleが前フレームの場合がある。
        // スクリーンショットの副作用や固定待機時間に頼らず、有限の実CSS遷移が終わってから比較する。
        await page.evaluate(async () => {
            const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
            await frame(); await frame();
            const finite = document.getAnimations().filter(animation =>
                Number.isFinite(animation.effect?.getComputedTiming().endTime));
            await Promise.all(finite.map(animation => animation.finished.catch(() => {})));
            await frame(); await frame();
        });
    }
}

async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const record = { name, viewport, theme: options.theme || 'light', status: 'passed' }, began = Date.now(); let current;
    try {
        current = await createCase(viewport, options);
        if (!options.beforeReady) await ready(current, options.url || candidateUrl);
        await work(current.page, record, current);
        assert.deepEqual(current.errors, [], 'No unhandled browser exceptions');
        assert.deepEqual(current.requestFailures, [], 'Actual same-origin build assets load');
        assert.deepEqual(current.dialogs, [], 'No unexpected browser dialogs');
        console.log(`[OK] Focus Studio: ${name}`);
    } catch (error) {
        record.status = 'failed'; record.error = error.stack || String(error); failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Focus Studio: ${name}: ${error.message}`);
        try { if (current?.page) { await screenshot(current.page, `${name}-failure`); record.failureMetrics = await layoutMetrics(current.page); } }
        catch (captureError) { record.captureError = captureError.message; }
    } finally {
        current?.releaseAudio?.();
        Object.assign(record, { durationMs: Date.now() - began, pageErrors: current?.errors || [], requestFailures: current?.requestFailures || [],
            externalFailures: current?.externalFailures || [], expectedFailures: current?.expectedFailures || [], dialogs: current?.dialogs || [], consoleErrors: current?.consoleErrors || [] });
        await current?.context.close(); results.push(record); await writeJSON('results.json', results);
    }
}

async function eventually(read, expected, label, timeout = 12_000) {
    const deadline = Date.now() + timeout; let actual;
    do { actual = await read(); if (Object.is(actual, expected)) return actual; await new Promise(resolve => setTimeout(resolve, 30)); } while (Date.now() < deadline);
    assert.equal(actual, expected, label);
}
const icon = page => text(page, '#icon-timer');
const pressMain = page => page.locator('#btn-main-action').press('Enter');
const selectFocus = (page, value = 5) => page.locator(`.timer-preset[data-mode="focus"][data-value="${value}"]`).press('Enter');
const selectBreak = (page, value = 5) => page.locator(`.timer-preset[data-mode="break"][data-value="${value}"]`).press('Enter');
async function assertTimer(page, time, running, label) {
    assert.equal(await seconds(page), time, label);
    assert.equal(await icon(page), running ? 'pause' : 'play_arrow', `${label}: running state`);
    assert.equal(await page.title(), running ? `(${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}) Focus Studio` : 'Focus Studio', `${label}: document title follows visible state`);
}
async function advanceUntil(page, read, expected, maximumMs = 18_000) {
    for (let elapsed = 0; elapsed <= maximumMs; elapsed += 250) {
        if (await read() === expected) return elapsed;
        await page.clock.runFor(250);
    }
    assert.equal(await read(), expected, `Transition must settle within ${maximumMs} ms`);
}
async function storage(page) { return page.evaluate(keys => Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, localStorage.getItem(key)])), KEYS); }
async function soundState(page, id, active) {
    await eventually(() => page.locator(`#btn-${id}`).getAttribute('aria-pressed'), String(active), `${id}: pressed state`);
    assert.equal(await page.locator(`#vol-${id}`).isDisabled(), !active, `${id}: volume availability`);
    assert.equal(await text(page, `#btn-${id} span`), active ? 'pause' : 'play_arrow', `${id}: visible icon`);
}
async function allSoundsStopped(page) {
    for (const id of SOUNDS) await soundState(page, id, false);
    assert.equal(await page.locator('#sound-badge').isVisible(), false, 'No active sound badge after all sounds stop');
}

async function layoutMetrics(page) {
    return page.evaluate(() => {
        const selectors = ['header', 'header h1', '#task-input', '#complete-count-badge', '#dark-mode-toggle-btn', '[data-action="parents-modal-open"]', '#open-sound-drawer-btn',
            '#main-content', '#main-content .glass', '#timer-label', '#timer-display', '#btn-main-action', '#restart-btn', '#next-break-display', '#sound-drawer', '#parents-modal'];
        const round = value => Math.round(value * 100) / 100;
        const read = (node, key) => {
            const box = node.getBoundingClientRect(), style = getComputedStyle(node);
            let left = 0, top = 0, parent = node;
            while (parent instanceof HTMLElement) { left += parent.offsetLeft; top += parent.offsetTop; parent = parent.offsetParent; }
            return { key, text: node.matches('input') ? '' : node.innerText?.trim().replace(/\s+/g, ' '),
                box: { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) },
                layout: { left, top, width: node.offsetWidth, height: node.offsetHeight },
                style: Object.fromEntries(['display', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'gap', 'color', 'backgroundColor', 'backgroundImage', 'borderRadius'].map(name => [name, style[name]])) };
        };
        return { title: document.title, viewport: { width: innerWidth, height: innerHeight }, dark: document.documentElement.classList.contains('dark'),
            overflow: { document: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth },
            content: { main: document.querySelector('#main-content')?.innerText.replace(/\s+/g, ' ').trim(),
                controls: [...document.querySelectorAll('button,input,summary')].map(node => ({ tag: node.tagName, id: node.id, text: node.innerText?.trim().replace(/\s+/g, ' ') || '', label: node.getAttribute('aria-label'), type: node.getAttribute('type'), min: node.getAttribute('min'), max: node.getAttribute('max'), placeholder: node.getAttribute('placeholder') })) },
            anchors: [...selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(node => read(node, selector))),
                ...[...document.querySelectorAll('.timer-preset,.preset-btn')].map((node, index) => read(node, `preset-${index}`))],
            fonts: [...document.fonts].map(face => ({ family: face.family, status: face.status })) };
    });
}
function comparableMetrics(metrics, { animated = false } = {}) {
    const value = structuredClone(metrics); delete value.fonts;
    if (animated) for (const anchor of value.anchors) delete anchor.box;
    return value;
}
function initialComparison(candidate, baseline) {
    const actual = comparableMetrics(candidate), expected = comparableMetrics(baseline), exceptions = [];
    const drawerAnchor = expected.anchors.find(anchor => anchor.key === '#sound-drawer');
    if (drawerAnchor?.text?.includes('しゅみれーしょん')) {
        exceptions.push({ selector: '#sound-drawer', field: 'text', before: 'しゅみれーしょん', after: 'シミュレーション', reason: 'Approved spelling correction in the rain description only' });
        drawerAnchor.text = drawerAnchor.text.replace('しゅみれーしょん', 'シミュレーション');
    }
    if (candidate.dark) {
        const actualButton = actual.anchors.find(anchor => anchor.key === '#open-sound-drawer-btn');
        const expectedButton = expected.anchors.find(anchor => anchor.key === '#open-sound-drawer-btn');
        assert.equal(actualButton.style.color, 'rgb(51, 65, 85)', 'Approved dark-mode sound control color');
        if (actualButton.style.color !== expectedButton.style.color) {
            exceptions.push({ selector: '#open-sound-drawer-btn', field: 'style.color', before: expectedButton.style.color, after: actualButton.style.color, reason: 'Approved dark-mode icon contrast correction only; geometry and text remain exact' });
            expectedButton.style.color = actualButton.style.color;
        }
    }
    return { actual, expected, exceptions };
}
async function darkHeaderContrast(page, record) {
    const samples = await page.evaluate(() => {
        const parse = css => { const values = css.match(/[\d.]+/g).map(Number); return [...values.slice(0, 3), values[3] ?? 1]; };
        const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]));
        const luminance = color => color.map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const targets = [
            { selector: 'header > .cursor-pointer > .bg-white .material-symbols-rounded', minimum: 3 },
            { selector: '#open-sound-drawer-btn .material-symbols-rounded', minimum: 3 },
            { selector: '#complete-count-badge .text-kawaii-text', minimum: 4.5 },
            { selector: '#complete-count', minimum: 4.5 }
        ];
        return targets.map(target => {
            const node = document.querySelector(target.selector), chain = []; let ancestor = node;
            while (ancestor instanceof Element) { chain.unshift({ selector: ancestor.id || ancestor.tagName, background: getComputedStyle(ancestor).backgroundColor }); ancestor = ancestor.parentElement; }
            let background = [255, 255, 255];
            for (const layer of chain) background = blend(parse(layer.background), background);
            const color = getComputedStyle(node).color, foreground = blend(parse(color), background), a = luminance(foreground), b = luminance(background);
            return { ...target, color, backgroundLayers: chain, compositedBackground: background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
        });
    });
    record.darkHeaderContrast = samples;
    for (const sample of samples) assert.ok(sample.ratio >= sample.minimum, `${sample.selector}: contrast ${sample.ratio.toFixed(2)} must be >= ${sample.minimum}`);
}
async function noOverflow(page, record, label) {
    const metrics = await layoutMetrics(page); (record.layouts ||= []).push({ label, metrics });
    assert.ok(metrics.overflow.document <= 1 && metrics.overflow.body <= 1, `${label}: no horizontal overflow ${JSON.stringify(metrics.overflow)}`);
    return metrics;
}
async function reachable(page, selector, record) {
    const target = page.locator(selector); await target.scrollIntoViewIfNeeded();
    const sample = await target.evaluate(node => {
        const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return { width: box.width, height: box.height, x: box.x, y: box.y, right: box.right, bottom: box.bottom,
            viewportWidth: innerWidth, viewportHeight: innerHeight, hit: hit === node || node.contains(hit) };
    });
    (record.reachability ||= []).push({ selector, ...sample });
    assert.ok(sample.hit && sample.width > 0 && sample.height > 0 && sample.x >= -1 && sample.right <= sample.viewportWidth + 1 && sample.y >= -1 && sample.bottom <= sample.viewportHeight + 1, `${selector}: visible and reachable ${JSON.stringify(sample)}`);
}
async function drawer(page, open) {
    await page.locator(open ? '#open-sound-drawer-btn' : '#sound-drawer-close-btn').press('Enter');
    assert.equal(await page.locator('#open-sound-drawer-btn').getAttribute('aria-expanded'), String(open));
    assert.equal(await page.locator('#sound-drawer').getAttribute('aria-hidden'), String(!open));
    assert.equal(await page.locator('#sound-drawer').evaluate(node => node.inert), !open);
}
async function focusIs(page, selector) { assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true, `${selector}: focus restored`); }

async function layoutSuite() {
    for (const viewport of VIEWPORTS) for (const theme of ['light', 'dark']) {
        const name = `initial-${viewport.width}-${theme}`;
        await runCase(name, async (page, record) => {
            const candidate = await noOverflow(page, record, 'initial'); await screenshot(page, `${name}-after`); let baseline = null;
            if (baselineUrl) {
                const prior = await createCase(viewport, { theme, reducedMotion: true });
                try { await ready(prior, baselineUrl); baseline = await layoutMetrics(prior.page); await screenshot(prior.page, `${name}-before`); assert.deepEqual(prior.errors, []); }
                finally { await prior.context.close(); }
            }
            record.comparison = `${name}-comparison.json`; const comparison = baseline ? initialComparison(candidate, baseline) : null;
            await writeJSON(record.comparison, { baseline, candidate, exceptions: comparison?.exceptions || [], policy: 'Exact initial content, computed styles and geometry under the same browser reduced-motion preference, apart from the explicitly recorded rain-description spelling and dark sound-button color corrections; no CSS or asset substitution.' });
            imagePairs.push({ name, before: baseline ? `${name}-before.png` : null, after: `${name}-after.png`, metrics: record.comparison });
            if (comparison) assert.deepEqual(comparison.actual, comparison.expected, 'Initial UI/content/layout preserved outside the explicitly recorded spelling and dark icon-color corrections');
            if (theme === 'dark') {
                await darkHeaderContrast(page, record);
                await page.locator('#restart-btn').hover();
                // 入力直後の旧スタイルではなく、hover反映と実際の遷移完了後を測定する。
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                await page.waitForFunction(() => {
                    const button = document.getElementById('restart-btn');
                    return button.matches(':hover') && button.getAnimations({ subtree: true }).every(animation =>
                        !animation.pending && (animation.playState === 'finished' || animation.playState === 'idle'));
                });
                record.darkResetHover = await page.locator('#restart-btn').evaluate(node => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }));
                assert.equal(record.darkResetHover.color, 'rgb(51, 65, 85)', 'Reset hover retains a readable foreground');
                await page.mouse.move(0, 0);
            }
            for (const selector of ['#task-input', '#dark-mode-toggle-btn', '[data-action="parents-modal-open"]', '#open-sound-drawer-btn', '#btn-main-action', '#restart-btn', '.timer-preset[data-mode="focus"][data-value="60"]']) await reachable(page, selector, record);
            await drawer(page, true); await noOverflow(page, record, 'drawer');
            for (const selector of ['#sound-drawer-close-btn', '#chime-volume-slider', '#stop-all-sounds-btn', '#btn-brown', '#vol-white']) await reachable(page, selector, record);
            await screenshot(page, `drawer-${viewport.width}-${theme}`); await page.keyboard.press('Escape');
            await page.locator('[data-action="parents-modal-open"]').press('Enter');
            assert.equal(await page.locator('#parents-modal').evaluate(node => node.open), true);
            await noOverflow(page, record, 'parents'); await screenshot(page, `parents-${viewport.width}-${theme}`);
            await page.keyboard.press('Escape');
        }, { theme, reducedMotion: true }, viewport);
    }
}

async function portalThemeSuite() {
    // ポータルから引き継ぐ夜間テーマは白い面も暗色になる。単独Focusの白地補正を混同しない。
    for (const viewport of [VIEWPORTS[1], VIEWPORTS[3]]) await runCase(`portal-night-header-contrast-${viewport.width}`, async (page, record) => {
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-night')), true);
        await darkHeaderContrast(page, record);
        await noOverflow(page, record, 'portal-night');
        await screenshot(page, `portal-night-${viewport.width}`);
    }, { theme: 'dark', reducedMotion: true, storage: { wonder_school_profile_v2: JSON.stringify({ darkMode: true }) } }, viewport);
}

async function timerSuite() {
    await runCase('timer-complete-focus-break-native-audio', async (page, record) => {
        // 時間を進める前に実ライブラリと実AudioContextの準備完了を公開UIで確かめる。
        await drawer(page, true); await page.locator('#btn-brown').press('Enter'); await soundState(page, 'brown', true);
        await page.locator('#btn-brown').press('Enter'); await soundState(page, 'brown', false); await drawer(page, false);
        await selectFocus(page); await selectBreak(page); await pressMain(page);
        await assertTimer(page, 300, true, 'Start selected focus duration');
        await page.clock.fastForward(300_000);
        await eventually(() => text(page, '#complete-count'), '1', 'Exactly one completed focus');
        record.transitionDelayMs = await advanceUntil(page, () => text(page, '#timer-label'), 'きゅうけい！');
        assert.equal(await icon(page), 'pause', 'Break auto-starts');
        assert.ok(await seconds(page) >= 299 && await seconds(page) <= 300);
        await page.clock.fastForward(300_000);
        await eventually(() => text(page, '#timer-label'), 'しゅうちゅう！', 'Break returns to focus');
        await assertTimer(page, 300, false, 'Focus ready after complete break');
        assert.equal(await text(page, '#complete-count'), '1', 'Break does not increase completed focus count');
        assert.equal((await storage(page)).count, '1');
        await page.clock.runFor(20_000); await assertTimer(page, 300, false, 'No stale completion restarts timer');
        await screenshot(page, 'completed-cycle');
    }, { clock: true, reducedMotion: true });

    await runCase('timer-quarter-second-pause-resume', async (page, record) => {
        await selectFocus(page); record.samples = [];
        for (let index = 1; index <= 24; index++) {
            await pressMain(page); await page.clock.runFor(250); await pressMain(page);
            const expected = Math.ceil((300_000 - index * 250) / 1000), remaining = await seconds(page);
            record.samples.push({ cycle: index, activeMs: index * 250, remaining, expected });
            await assertTimer(page, expected, false, `Quarter-second pause ${index} preserves elapsed milliseconds`);
            await page.clock.runFor(750); await assertTimer(page, expected, false, 'Paused wall time must not consume or restore focus time');
        }
        await pressMain(page); await page.clock.fastForward(1000); await pressMain(page);
        await assertTimer(page, 293, false, 'Six fractional seconds plus one full second elapsed');
    }, { clock: true, failAudio: true, reducedMotion: true });

    await runCase('timer-sleep-background-elapsed', async (page, record, current) => {
        await selectFocus(page); await pressMain(page); await page.clock.runFor(1250);
        const other = await current.context.newPage(); current.observe(other); await other.goto('about:blank'); await other.bringToFront();
        // fastForwardはスリープ・停止したイベントループ相当。期限から経過時間を復元する。
        await page.clock.fastForward(90_750); await page.bringToFront(); await pressMain(page);
        await assertTimer(page, 208, false, 'Background/sleep accounts for 92 elapsed seconds exactly once');
        record.backgroundPage = 'Separate real browser tab plus Playwright event-loop sleep';
        await page.clock.fastForward(60_000); await assertTimer(page, 208, false, 'Paused sleep remains paused');
        await pressMain(page); await page.clock.fastForward(400_000);
        await eventually(() => text(page, '#complete-count'), '1', 'Elapsed focus completes only once');
        await advanceUntil(page, () => text(page, '#timer-label'), 'きゅうけい！');
        assert.equal(await icon(page), 'pause'); assert.equal(await text(page, '#complete-count'), '1');
        await page.clock.fastForward(400_000);
        await eventually(() => text(page, '#timer-label'), 'しゅうちゅう！', 'Long sleep also accounts for the completed break');
        await assertTimer(page, 300, false, 'Sleep past focus and break returns to idle focus');
        assert.equal(await text(page, '#complete-count'), '1', 'No duplicate completion after long sleep');
        await other.close();
    }, { clock: true, failAudio: true, reducedMotion: true });

    for (const action of ['reset', 'mode']) await runCase(`timer-pending-transition-${action}`, async (page, record, current) => {
        await selectFocus(page); await pressMain(page);
        await eventually(() => current.audioRequests > 0, true, 'Audio request is genuinely pending');
        await page.clock.fastForward(300_000); await eventually(() => text(page, '#complete-count'), '1', 'Focus completion began');
        if (action === 'reset') await page.locator('#restart-btn').press('Enter'); else await selectFocus(page, 60);
        const expected = action === 'reset' ? 300 : 3600;
        current.releaseAudio(); await page.clock.runFor(20_000);
        await assertTimer(page, expected, false, 'Interrupted transition cannot start a stale break');
        assert.equal(await text(page, '#timer-label'), 'しゅうちゅう！'); assert.equal(await text(page, '#complete-count'), '1');
        record.interruption = action;
    }, { clock: true, delayAudio: true, reducedMotion: true });

    await runCase('timer-reset-and-presets', async page => {
        await selectFocus(page); await selectBreak(page, 10);
        assert.match(await text(page, '#next-break-display'), /10/); await assertTimer(page, 300, false, 'Break choice does not switch focus mode');
        await pressMain(page); await page.clock.runFor(5750); await page.locator('#restart-btn').press('Enter');
        await assertTimer(page, 300, false, 'Reset restores full selected focus');
        await pressMain(page); await page.clock.fastForward(300_000);
        await advanceUntil(page, () => text(page, '#timer-label'), 'きゅうけい！');
        await selectBreak(page, 15); await assertTimer(page, 900, false, 'Changing active break stops and resets it');
        await pressMain(page); await page.clock.runFor(1250); await page.locator('#restart-btn').press('Enter');
        await assertTimer(page, 900, false, 'Reset preserves break mode'); assert.equal(await text(page, '#timer-label'), 'きゅうけい！');
        await selectFocus(page, 25); await assertTimer(page, 1500, false, 'Focus selection interrupts break');
        for (const preset of await page.locator('.preset-btn').all()) {
            const focus = Number(await preset.getAttribute('data-focus')), rest = Number(await preset.getAttribute('data-break'));
            await preset.press('Enter'); await assertTimer(page, focus * 60, false, 'Recommended preset updates focus');
            assert.match(await text(page, '#next-break-display'), new RegExp(`${rest}分`));
        }
    }, { clock: true, failAudio: true, reducedMotion: true });
}

async function soundSuite() {
    await runCase('sound-native-start-stop-volume-rapid', async (page, record) => {
        await drawer(page, true);
        for (const id of SOUNDS) {
            await page.locator(`#btn-${id}`).click(); await soundState(page, id, true);
            const before = Number(await page.locator(`#vol-${id}`).inputValue());
            await page.locator(`#vol-${id}`).press('ArrowRight'); assert.equal(Number(await page.locator(`#vol-${id}`).inputValue()), before + 1);
            await page.locator(`#btn-${id}`).click(); await soundState(page, id, false);
        }
        await eventually(() => page.evaluate(() => window.__focusBrowserObservation.activeNonHelperLoops), 0, 'Warmup leaves no non-helper audio loops');
        record.audioWarmup = await page.evaluate(() => structuredClone(window.__focusBrowserObservation));
        assert.ok(record.audioWarmup.helperEvidence.some(item => item.constant === 0), 'Observe Tone mono128 zero helper sample evidence');
        assert.ok(record.audioWarmup.helperEvidence.some(item => item.constant === 1), 'Observe Tone mono128 one helper sample evidence');
        record.repeatedAudioCycles = [];
        for (let cycle = 0; cycle < 3; cycle++) {
            for (const id of SOUNDS) { await page.locator(`#btn-${id}`).press('Enter'); await soundState(page, id, true); }
            await page.locator('#stop-all-sounds-btn').press('Enter'); await allSoundsStopped(page);
            await eventually(() => page.evaluate(() => window.__focusBrowserObservation.activeNonHelperLoops), 0, 'Repeated stop-all leaves no noise loops');
            const sample = await page.evaluate(() => structuredClone(window.__focusBrowserObservation)); record.repeatedAudioCycles.push(sample);
            assert.equal(sample.helperStarts, record.audioWarmup.helperStarts, 'Context-wide helper creation count is stable across repeated cycles');
            assert.deepEqual(sample.helperEvidence, record.audioWarmup.helperEvidence, 'The original proven helper sources are reused');
            assert.equal(sample.activeHelperLoops, record.audioWarmup.activeHelperLoops, 'Helper retention remains bounded to the warmed context');
        }
        for (const id of SOUNDS) await page.locator(`#btn-${id}`).press('Enter');
        for (const id of SOUNDS) await soundState(page, id, true);
        await page.locator('#stop-all-sounds-btn').press('Enter'); await allSoundsStopped(page);
        for (let index = 0; index < 20; index++) await page.locator('#btn-brown').press('Enter');
        await soundState(page, 'brown', false);
        await page.locator('#btn-rain').press('Enter'); await page.locator('#stop-all-sounds-btn').press('Enter'); await allSoundsStopped(page);
        await eventually(() => page.evaluate(() => window.__focusBrowserObservation.activeNonHelperLoops), 0, 'No native looping noise remains after stop');
        record.audio = await page.evaluate(() => structuredClone(window.__focusBrowserObservation));
        assert.ok(record.audio.starts > 0, 'Native Web Audio sources were actually created');
        assert.equal(record.audio.helperStarts, record.audioWarmup.helperStarts, 'Rapid toggling creates no additional DC helper sources');
        await screenshot(page, 'sound-native-stopped');
    }, { observeAudio: true, reducedMotion: true });

    for (const scenario of ['double-toggle', 'stop-all', 'multiple-stop-all']) await runCase(`sound-pending-${scenario}`, async (page, record, current) => {
        await drawer(page, true); await page.locator('#btn-brown').press('Enter');
        await eventually(() => current.audioRequests > 0, true, 'Actual audio network request held');
        if (scenario === 'double-toggle') await page.locator('#btn-brown').press('Enter');
        else {
            if (scenario === 'multiple-stop-all') for (const id of ['pink', 'rain', 'cafe', 'white']) await page.locator(`#btn-${id}`).press('Enter');
            await page.locator('#stop-all-sounds-btn').press('Enter');
        }
        current.releaseAudio();
        // 別の再生要求を完了させ、保留していた音声初期化が解決したことをUIで確認する。
        await page.locator('#btn-pink').press('Enter'); await soundState(page, 'pink', true);
        await page.locator('#btn-pink').press('Enter'); await allSoundsStopped(page);
        record.audioRequests = current.audioRequests;
        await eventually(() => page.evaluate(() => window.__focusBrowserObservation.activeNonHelperLoops), 0, 'Cancelled pending sounds leave no non-helper native audio loop');
        record.audio = await page.evaluate(() => structuredClone(window.__focusBrowserObservation));
    }, { delayAudio: true, observeAudio: true, reducedMotion: true });
}

async function keyboardAndDrawerSuite() {
    await runCase('mobile-touch-timer-and-sound-controls', async page => {
        await page.locator('.timer-preset[data-mode="focus"][data-value="5"]').tap();
        await page.locator('#btn-main-action').tap();
        await page.clock.runFor(1250);
        await assertTimer(page, 299, true, 'Touch starts timer without waiting for audio');
        await page.locator('#btn-main-action').tap();
        await page.clock.runFor(2000);
        await assertTimer(page, 299, false, 'Touch pauses exactly once despite touchend and click');
        await page.locator('#open-sound-drawer-btn').tap(); await page.clock.runFor(20);
        assert.equal(await page.locator('#sound-drawer').getAttribute('aria-hidden'), 'false');
        await page.locator('#btn-brown').tap(); await soundState(page, 'brown', true);
        await page.locator('#stop-all-sounds-btn').tap(); await allSoundsStopped(page);
        await page.locator('#sound-drawer-close-btn').tap();
        assert.equal(await page.locator('#sound-drawer').getAttribute('aria-hidden'), 'true');
        await screenshot(page, 'mobile-touch-stopped');
    }, { clock: true, touch: true, reducedMotion: true });
    await runCase('keyboard-repeat-interactive-parent-modal', async page => {
        await selectFocus(page); await page.locator('#timer-display').click();
        await page.keyboard.down('Space'); assert.equal(await icon(page), 'pause');
        for (let repeat = 0; repeat < 5; repeat++) { await page.keyboard.down('Space'); assert.equal(await icon(page), 'pause', 'Held Space repeat cannot toggle timer'); }
        await page.keyboard.up('Space'); await page.keyboard.press('Space'); assert.equal(await icon(page), 'play_arrow');
        await page.locator('#task-input').fill('宿題'); await page.locator('#task-input').press('Space');
        assert.equal(await page.locator('#task-input').inputValue(), '宿題 '); assert.equal(await icon(page), 'play_arrow');
        await page.locator('#dark-mode-toggle-btn').press('Space'); assert.equal(await icon(page), 'play_arrow');
        await page.locator('.timer-preset[data-mode="focus"][data-value="60"]').press('Space'); await assertTimer(page, 3600, false, 'Space activates focused preset only');
        await page.locator('#btn-main-action').press('Space'); assert.equal(await icon(page), 'pause', 'Focused main button toggles once');
        await page.locator('#btn-main-action').press('Space'); assert.equal(await icon(page), 'play_arrow');
        await page.locator('[data-action="parents-modal-open"]').press('Space');
        assert.equal(await page.locator('#parents-modal').evaluate(node => node.open), true);
        await page.locator('#parents-modal h2').click(); await page.keyboard.press('Space');
        assert.equal(await icon(page), 'play_arrow', 'Space on noninteractive modal content cannot start background timer');
        await page.keyboard.press('Escape');
        // native dialogのcloseイベントはopen属性の変更後にキューで届く。復元ハンドラーの完了を待つ。
        await page.waitForFunction(() => !document.querySelector('#parents-modal').open &&
            document.querySelector('[data-action="parents-modal-open"]').getAttribute('aria-expanded') === 'false', null, { timeout: 5000 });
        assert.equal(await page.locator('#parents-modal').evaluate(node => node.open), false);
        assert.equal(await page.locator('[data-action="parents-modal-open"]').getAttribute('aria-expanded'), 'false');
        await focusIs(page, '[data-action="parents-modal-open"]');
        await drawer(page, true); await page.locator('#sound-drawer summary').press('Space');
        assert.equal(await page.locator('#sound-drawer details').getAttribute('open'), '');
        assert.equal(await icon(page), 'play_arrow');
        await page.locator('#chime-volume-slider').press('Space'); assert.equal(await icon(page), 'play_arrow');
        await page.locator('#sound-drawer a').last().focus(); await page.keyboard.press('Space'); assert.equal(await icon(page), 'play_arrow');
    }, { failAudio: true, reducedMotion: true });

    await runCase('drawer-focus-trap-close-reopen', async (page, record) => {
        await drawer(page, true); await focusIs(page, '#sound-drawer-close-btn');
        for (const selector of ['header', '#main-content', 'footer']) assert.equal(await page.locator(selector).evaluate(node => node.inert), true);
        const last = page.locator('#sound-drawer a').last();
        await last.focus(); await page.keyboard.press('Tab'); await focusIs(page, '#sound-drawer-close-btn');
        await page.keyboard.press('Shift+Tab'); assert.equal(await last.evaluate(node => node === document.activeElement), true);
        await page.keyboard.press('Escape'); await focusIs(page, '#open-sound-drawer-btn');
        await page.locator('#open-sound-drawer-btn').press('Enter');
        await page.clock.runFor(350);
        assert.equal(await page.locator('#drawer-overlay').isVisible(), true, 'Reopening cancels pending overlay hide');
        assert.equal(await page.locator('#sound-drawer').getAttribute('aria-modal'), 'true');
        await focusIs(page, '#sound-drawer-close-btn');
        await screenshot(page, 'drawer-reopened'); await drawer(page, false); await page.clock.runFor(350);
        assert.equal(await page.locator('#drawer-overlay').isVisible(), false);
        for (const selector of ['header', '#main-content', 'footer']) assert.equal(await page.locator(selector).evaluate(node => node.inert), false);
        for (let index = 0; index < 12; index++) { await page.keyboard.press('Tab'); assert.equal(await page.locator('#sound-drawer').evaluate(node => node.contains(document.activeElement)), false, 'Closed drawer is absent from tab order'); }
        record.reopenDelayMs = 350;
    }, { clock: true, failAudio: true, reducedMotion: true });
}

async function storageAndFailureSuite() {
    await runCase('task-save-reload-immediate-navigation-cross-tab', async (page, record, current) => {
        const task = 'E2E 宿題 <img src=x onerror=alert(1)> & 読書';
        await page.locator('#task-input').fill(task); await page.locator('#task-input').press('Enter');
        assert.equal((await storage(page)).task, task); await ready(current, candidateUrl, { reload: true });
        assert.equal(await page.locator('#task-input').inputValue(), task, 'Task is restored as plain input text');
        assert.equal(await page.locator('#task-input img').count(), 0);
        await page.locator('#task-input').fill('保存直前の入力');
        await ready(current, candidateUrl, { reload: true });
        assert.equal(await page.locator('#task-input').inputValue(), '保存直前の入力', 'Immediate navigation flushes pending debounce');
        const second = await current.context.newPage(); current.observe(second); await ready(current, candidateUrl, { page: second });
        assert.equal(await second.locator('#task-input').inputValue(), '保存直前の入力');
        await second.locator('#task-input').fill('別タブの新しい目標'); await second.locator('#task-input').press('Enter');
        await ready(current, candidateUrl, { reload: true });
        assert.equal(await page.locator('#task-input').inputValue(), '別タブの新しい目標', 'Clean stale tab must not overwrite another tab on unload');
        await ready(current, candidateUrl, { reload: true, page: second });
        assert.equal(await second.locator('#task-input').inputValue(), '別タブの新しい目標');
        record.storage = await storage(second); await second.close();
    }, { reducedMotion: true });

    await runCase('settings-dark-volume-persist', async (page, record, current) => {
        const initial = await page.locator('html').evaluate(node => node.classList.contains('dark'));
        await page.locator('#dark-mode-toggle-btn').click(); assert.equal(await page.locator('html').evaluate(node => node.classList.contains('dark')), !initial);
        await drawer(page, true); const slider = page.locator('#chime-volume-slider'); await slider.press('Home'); await slider.press('ArrowRight');
        const volume = await slider.inputValue(); assert.equal((await storage(page)).volume, volume);
        await ready(current, candidateUrl, { reload: true });
        assert.equal(await page.locator('html').evaluate(node => node.classList.contains('dark')), !initial);
        assert.equal(await slider.inputValue(), volume); record.storage = await storage(page);
    }, { reducedMotion: true });

    for (const mode of ['blocked-storage', 'storage-quota', 'missing-audio', 'audio-resume-rejected']) await runCase(`fallback-${mode}`, async (page, record) => {
        await page.locator('#task-input').fill('保存できなくても使える'); await page.locator('#task-input').press('Enter');
        await page.locator('#dark-mode-toggle-btn').press('Enter'); await drawer(page, true);
        await page.locator('#btn-brown').press('Enter'); await page.locator('#stop-all-sounds-btn').press('Enter');
        await drawer(page, false); await selectFocus(page); await pressMain(page); await page.clock.fastForward(300_000);
        await eventually(() => text(page, '#complete-count'), '1', 'Focus completion works despite missing browser capability');
        record.breakDelayMs = await advanceUntil(page, () => text(page, '#timer-label'), 'きゅうけい！');
        assert.equal(await icon(page), 'pause'); await page.clock.fastForward(300_000);
        await eventually(() => text(page, '#timer-label'), 'しゅうちゅう！', 'Break completes despite browser capability failure');
        await assertTimer(page, 300, false, 'Fallback returns to usable focus');
        assert.equal(await text(page, '#complete-count'), '1'); await screenshot(page, `fallback-${mode}`);
    }, { clock: true, reducedMotion: true, denyStorage: mode === 'blocked-storage', quotaExceeded: mode === 'storage-quota',
        failAudio: mode !== 'audio-resume-rejected', rejectAudioResume: mode === 'audio-resume-rejected' });
}

function requireFonts(metrics) {
    for (const family of ['M PLUS Rounded 1c', 'Material Symbols Rounded']) assert.ok(metrics.fonts.some(face => face.family.includes(family) && face.status === 'loaded'), `${family}: actual network font loaded`);
}
async function nativeSuite() {
    for (const viewport of VIEWPORTS) await runCase(`native-fonts-pwa-first-reload-${viewport.width}`, async (page, record, current) => {
        record.loads = [];
        for (let pass = 0; pass < 2; pass++) {
            if (pass) await ready(current, candidateUrl, { reload: true });
            const metrics = await noOverflow(page, record, pass ? 'reload' : 'first'); requireFonts(metrics); record.loads.push(metrics);
            await assertTimer(page, 1500, false, 'Untouched native initial state');
            await screenshot(page, `native-${viewport.width}-${pass ? 'reload' : 'first'}`);
        }
        record.serviceWorker = await page.evaluate(() => ({ supported: 'serviceWorker' in navigator, controller: navigator.serviceWorker?.controller?.scriptURL || null }));
    }, { native: true }, viewport);
}

async function productionSuite() {
    const url = new URL(productionUrl); assert.equal(url.protocol, 'https:'); assert.equal(url.search, '', 'Normal production URL only'); assert.equal(url.hash, '');
    assert.ok(url.pathname.endsWith('/focus_studio/'), 'Production URL must be the normal Focus Studio directory');
    const publicRoot = new URL('../', url), expected = manifests.get('candidate').manifest;
    const expectedByPath = new Map(expected.files.map(file => [file.path, file]));
    for (const viewport of VIEWPORTS) await runCase(`production-native-first-reload-${viewport.width}`, async (page, record, current) => {
        const reference = await createCase(viewport, { native: true }); let localMetrics;
        try { await ready(reference); localMetrics = await layoutMetrics(reference.page); requireFonts(localMetrics); }
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
                const required = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(node => node.src || node.href));
                await Promise.all(pending);
                const localRequired = ['focus_studio/index.html', ...required.filter(value => value.startsWith(publicRoot.href)).map(value => decodeURIComponent(new URL(value).pathname.slice(publicRoot.pathname.length)))];
                const metrics = await noOverflow(page, record, pass ? 'production-reload' : 'production-first'); requireFonts(metrics);
                const load = { pass: pass ? 'reload' : 'first', url: page.url(), assets: [...received.values()], captureErrors, required: localRequired, metrics };
                record.loads.push(load); await writeJSON(`production-${viewport.width}-loads.json`, record.loads);
                for (const relative of new Set(localRequired)) {
                    assert.ok(expectedByPath.has(relative), `${relative}: deployed asset belongs to candidate manifest`);
                    const actual = received.get(relative); assert.ok(actual, `${relative}: capture actual normal-URL browser response`);
                    assert.equal(actual.status, 200); assert.equal(actual.sha256, actual.expectedSHA256, `${relative}: deployed bytes match final build`);
                }
                assert.equal(page.url(), url.href, 'No cache-busting workaround');
                assert.deepEqual(comparableMetrics(metrics, { animated: true }), comparableMetrics(localMetrics, { animated: true }), 'Production initial DOM/content/computed style/layout matches final build');
                await assertTimer(page, 1500, false, 'Production fresh context/reload initial timer');
                await screenshot(page, `production-${viewport.width}-${pass ? 'reload' : 'first'}`);
            } finally { page.off('response', listener); }
        }
        record.method = 'Fresh context per viewport; untouched normal HTTPS URL initial/reload; real fonts and service workers; read-only DOM/style/response hashing; no routing, init scripts, clock or storage fixtures';
    }, { beforeReady: true, native: true, url: url.href }, viewport);
}

async function imageReview() {
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    await writeJSON('image-review-manifest.json', { pairs: imagePairs, note: 'PNG review artifacts, not a claim of human image review. Initial content/geometry/styles are asserted independently.' });
    const images = (await readdir(artifactDir)).filter(name => name.endsWith('.png')).sort();
    await writeFile(path.join(artifactDir, 'index.htm'), `<!doctype html><html lang="ja"><meta charset="utf-8"><title>Focus Studio 実ビルド検証</title><style>body{font-family:system-ui;margin:24px;background:#e2e8f0;color:#0f172a}section{padding:16px;background:white;margin:24px 0;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{max-width:100%;border:1px solid #94a3b8}figure{margin:0;min-width:0}.overlay{position:relative}.overlay img+img{position:absolute;left:0;top:0;opacity:.5}</style><h1>Focus Studio 実ビルド検証</h1><p>左：変更前、右：変更後。初期内容・レイアウト・計算済みCSSは別途JSONで比較します。</p>${imagePairs.map(pair => `<section><h2>${escape(pair.name)}</h2><a href="${escape(pair.metrics)}">実測JSON</a><div class="pair"><figure>${pair.before ? `<img loading="lazy" src="${escape(pair.before)}">` : '<p>基準未指定</p>'}</figure><figure><img loading="lazy" src="${escape(pair.after)}"></figure></div>${pair.before ? `<details><summary>50%重ね合わせ</summary><div class="overlay"><img loading="lazy" src="${escape(pair.before)}"><img loading="lazy" src="${escape(pair.after)}"></div></details>` : ''}</section>`).join('')}<h2>操作・フォールバック・本番画像</h2>${images.map(name => `<details><summary>${escape(name)}</summary><img loading="lazy" src="${escape(name)}"></details>`).join('')}</html>`);
}

try {
    await mkdir(artifactDir, { recursive: true }); candidateUrl = await serveDist(dist); await manifestAssets(dist, 'candidate');
    if (baselineDist) { assert.notEqual(dist, baselineDist); baselineUrl = await serveDist(baselineDist); await manifestAssets(baselineDist, 'baseline'); }
    else console.log('[INFO] FOCUS_STUDIO_BASELINE_ROOT unset: baseline comparison explicitly skipped.');
    await writeJSON('asset-verification-before.json', await Promise.all([...manifests.keys()].map(verifyAssets)));
    browser = await chromium.launch({ headless: true });
    await writeJSON('run-metadata.json', { browser: 'Chromium', version: browser.version(), dist, baselineDist, productionUrl, viewports: VIEWPORTS,
        method: 'Actual immutable build; public user controls only; no imported app runtime/eval/app mutation. Clock, Storage and Web Audio/network failure fixtures are explicitly labeled. Native and production passes do not install fixtures.' });
    if (productionUrl) await productionSuite();
    else { await layoutSuite(); await portalThemeSuite(); await timerSuite(); await soundSuite(); await keyboardAndDrawerSuite(); await storageAndFailureSuite(); await nativeSuite(); }
    if (failures.length) throw new AggregateError(failures, `Focus Studio deep E2E: ${failures.length}/${results.length} failed; see ${artifactDir}/results.json`);
    console.log(`[OK] Focus Studio deep E2E: ${results.length} cases passed. Artifacts: ${artifactDir}`);
} catch (error) {
    await writeJSON('run-error.json', { error: error.stack || String(error), completedCases: results.length }).catch(() => {}); throw error;
} finally {
    try {
        await writeJSON('asset-verification-after.json', await Promise.all([...manifests.keys()].map(verifyAssets))); await imageReview();
        await writeJSON('results.json', results);
        await writeJSON('summary.json', { total: results.length, passed: results.filter(result => result.status === 'passed').length,
            failed: failures.length, baselineComparison: baselineDist ? 'requested' : 'explicitly skipped', mode: productionUrl ? 'production-native-read-only' : 'local-built-e2e', artifactDir });
    } finally { await browser?.close(); for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}


import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 生ソースを配信しない。基準・候補の実ビルドを変更せず、通常の入力から検査する。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const baselineDist = process.env.FRACTION_LAB_BASELINE_ROOT ? path.resolve(process.env.FRACTION_LAB_BASELINE_ROOT) : null;
const artifactDir = path.join(root, 'visual-guard-artifacts', 'fraction');
const PROFILE = 'wonder_school_profile_v2';
const VIEWPORTS = [{ width: 320, height: 740 }, { width: 390, height: 844 },
    { width: 667, height: 375 }, { width: 1280, height: 900 }];
const TABS = ['whatis', 'visual', 'compare', 'calc', 'sub', 'secret'];
const servers = [], results = [], failures = [], imagePairs = [], manifests = new Map();
let browser, candidateUrl, baselineUrl;
const writeJSON = (name, data) => writeFile(path.join(artifactDir, name), `${JSON.stringify(data, null, 2)}\n`);
const text = async (page, selector) => (await page.locator(selector).textContent()).trim();
const screenshot = (page, name) => page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' });

async function serveDist(directory) {
    await access(path.join(directory, 'fraction_lab/index.html'));
    assert.ok((await stat(path.join(directory, 'assets'))).isDirectory(), 'An actual Vite dist/assets directory is required');
    const entry = await readFile(path.join(directory, 'fraction_lab/index.html'), 'utf8');
    assert.match(entry, /concept-evolution\.js/, 'The actual Vite HTML transform must have injected the concept quiz');
    assert.match(entry, /(?:\.\.\/|\/)assets\/[^"']+\.css/, 'The entry must reference built CSS rather than source-only HTML');
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript',
        '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
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
    return `http://127.0.0.1:${server.address().port}/fraction_lab/`;
}

async function manifestAssets(directory, name) {
    const origin = 'http://fraction-build.invalid', pending = [new URL('/fraction_lab/index.html', origin)], files = new Map();
    while (pending.length) {
        const url = pending.shift();
        if (url.origin !== origin) continue;
        const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        if (files.has(relative)) continue;
        const file = path.resolve(directory, relative);
        assert.ok(file.startsWith(directory + path.sep), 'Asset references must stay inside the build root');
        const bytes = await readFile(file), source = bytes.toString('utf8'), references = [];
        files.set(relative, { path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
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
    assert.ok([...files.keys()].some(file => file.startsWith('assets/')), 'At least one linked built asset must be checked');
    const manifest = { entry: 'fraction_lab/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
    manifests.set(name, { directory, manifest });
    await writeJSON(`${name}-asset-manifest.json`, manifest);
}
async function verifyAssets(name) {
    const { directory, manifest } = manifests.get(name);
    for (const entry of manifest.files) {
        const bytes = await readFile(path.join(directory, entry.path));
        assert.equal(bytes.length, entry.bytes, `${name}: immutable size ${entry.path}`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${name}: immutable built asset ${entry.path}`);
    }
    return { name, files: manifest.files.length, manifestSHA256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex') };
}

// ストレージ障害は環境境界だけで作る。アプリの状態・関数・回答・配信内容は置換しない。
function storageEnvironment(options) {
    for (const [key, value] of Object.entries(options.storage || {})) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    if (options.denyStorage) {
        for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
    } else if (options.quotaExceeded) {
        Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    }
}
async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const context = await browser.newContext({ viewport, hasTouch: true, locale: 'ja-JP', timezoneId: 'UTC',
        colorScheme: 'light', serviceWorkers: options.nativeEnvironment ? 'allow' : 'block' });
    if (!options.nativeEnvironment) {
        if (options.storage || options.denyStorage || options.quotaExceeded) await context.addInitScript(storageEnvironment, options);
        await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
        await context.route('https://fonts.gstatic.com/**', route => route.abort());
    }
    const page = await context.newPage(), errors = [], requestFailures = [], dialogs = [], externalFailures = [];
    page.setDefaultTimeout(12_000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('response', response => {
        if (response.url().startsWith('http://127.0.0.1:') && response.status() >= 400) requestFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    page.on('requestfailed', request => {
        const label = `${request.failure()?.errorText} ${request.url()}`;
        (request.url().startsWith('http://127.0.0.1:') ? requestFailures : externalFailures).push(label);
    });
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    return { context, page, errors, requestFailures, dialogs, externalFailures, options };
}
async function ready(current, url = candidateUrl) {
    assert.equal((await current.page.goto(url, { waitUntil: 'load' })).status(), 200);
    await current.page.locator('#fraction-check-question-area button').first().waitFor();
    await current.page.waitForFunction(() => document.querySelector('#vis-display')?.textContent.trim() === '1/4');
    await current.page.evaluate(() => document.fonts.ready);
    await current.page.waitForTimeout(450);
}
async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const record = { name, viewport, status: 'passed' }, began = Date.now();
    let current;
    try {
        current = await createCase(viewport, options); await ready(current);
        await work(current.page, record, current);
        assert.deepEqual(current.errors, [], 'No unhandled browser exceptions');
        assert.deepEqual(current.requestFailures, [], 'All actual local build assets load');
        assert.deepEqual(current.dialogs, [], 'No unexpected browser alert');
        console.log(`[OK] Fraction Lab: ${name}`);
    } catch (error) {
        record.status = 'failed'; record.error = error.stack || String(error);
        failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Fraction Lab: ${name}: ${error.message}`);
        if (current?.page) try { await screenshot(current.page, `${name}-failure`); } catch (captureError) { record.screenshotError = captureError.message; }
    } finally {
        Object.assign(record, { durationMs: Date.now() - began, pageErrors: current?.errors || [],
            requestFailures: current?.requestFailures || [], externalFailures: current?.externalFailures || [], dialogs: current?.dialogs || [] });
        await current?.context.close(); results.push(record); await writeJSON('results.json', results);
    }
}
async function assertFocus(page, selector) {
    await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, selector);
    assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true, `${selector} has keyboard focus`);
}
async function assertTab(page, id) {
    assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(), 1);
    assert.equal(await page.locator(`#tab-${id}`).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 1);
    assert.equal(await page.locator(`#tab-${id}`).getAttribute('tabindex'), '0');
    for (const tab of TABS) assert.equal(await page.locator(`#view-${tab}`).isVisible(), tab === id, `${tab} panel visibility`);
}
async function tab(page, id) { await page.locator(`#tab-${id}`).click(); await assertTab(page, id); }
async function range(page, selector, value) {
    const input = page.locator(selector), min = Number(await input.getAttribute('min'));
    assert.ok(value >= min && value <= Number(await input.getAttribute('max')), `${selector}: requested value inside UI range`);
    await input.focus(); await input.press('Home');
    for (let index = min; index < value; index++) await input.press('ArrowRight');
    assert.equal(Number(await input.inputValue()), value, `${selector}: native keyboard selection`);
}
async function numberInput(page, selector, value) {
    const input = page.locator(selector);
    await input.fill(String(value)); await input.press('Tab');
}
async function adjust(page, target, action) { await page.locator(`.btn-adjust[data-target="${target}"][data-action="${action}"]`).click(); }
async function scrollMainTop(page) {
    await page.locator('#main-content').hover({ position: { x: 12, y: 12 } });
    await page.mouse.wheel(0, -100_000); await page.waitForTimeout(100);
}
async function fullyReachable(page, selector, record) {
    const control = page.locator(selector);
    await control.scrollIntoViewIfNeeded(); await control.click({ trial: true });
    const measurement = await control.evaluate(node => {
        const rect = node.getBoundingClientRect(), clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }, ancestors = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
            const clipsX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX), clipsY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
            if (clipsX) { clip.left = Math.max(clip.left, box.left + parent.clientLeft); clip.right = Math.min(clip.right, box.left + parent.clientLeft + parent.clientWidth); }
            if (clipsY) { clip.top = Math.max(clip.top, box.top + parent.clientTop); clip.bottom = Math.min(clip.bottom, box.top + parent.clientTop + parent.clientHeight); }
            if (clipsX || clipsY) ancestors.push({ element: parent.id || parent.tagName, overflowX: style.overflowX, overflowY: style.overflowY });
        }
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { box: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
            clip, ancestors, reachable: !!hit && (hit === node || node.contains(hit)) };
    });
    (record.reachability ||= []).push({ selector, ...measurement });
    const { box, clip } = measurement;
    assert.ok(box.width > 0 && box.height > 0);
    assert.ok(box.left >= clip.left - 1 && box.right <= clip.right + 1 && box.top >= clip.top - 1 && box.bottom <= clip.bottom + 1,
        `${selector} is wholly reachable within its clipping ancestors: ${JSON.stringify(measurement)}`);
    assert.equal(measurement.reachable, true, `${selector} receives normal pointer input`);
    return measurement;
}
async function noHorizontalOverflow(page, record) {
    const geometry = await page.evaluate(() => {
        const main = document.querySelector('#main-content'), active = document.querySelector('[role="tabpanel"]:not(.hidden)');
        return { viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
            main: { client: main.clientWidth, scroll: main.scrollWidth }, panel: { client: active.clientWidth, scroll: active.scrollWidth } };
    });
    (record.overflow ||= []).push(geometry);
    assert.ok(geometry.document <= geometry.viewport + 1 && geometry.body <= geometry.viewport + 1, `No page horizontal overflow: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.main.scroll <= geometry.main.client + 1 && geometry.panel.scroll <= geometry.panel.client + 1, `No clipped panel content: ${JSON.stringify(geometry)}`);
}

async function tabAndRangeSuite() {
    for (const viewport of VIEWPORTS) await runCase(`navigation-native-input-${viewport.width}x${viewport.height}`, async (page, record) => {
        await assertTab(page, 'whatis'); await page.locator('#tab-whatis').focus();
        for (const id of ['visual', 'compare', 'calc', 'sub', 'secret', 'whatis']) {
            await page.keyboard.press('ArrowRight'); await assertTab(page, id); await assertFocus(page, `#tab-${id}`);
        }
        await page.keyboard.press('ArrowLeft'); await assertTab(page, 'secret');
        await page.keyboard.press('Home'); await assertTab(page, 'whatis'); await assertFocus(page, '#tab-whatis');
        await page.keyboard.press('End'); await assertTab(page, 'secret'); await assertFocus(page, '#tab-secret');
        await page.keyboard.press('Home'); await page.locator('.btn-navigate-visual').focus(); await page.keyboard.press('Enter');
        await assertTab(page, 'visual'); await assertFocus(page, '#tab-visual');
        await range(page, '#vis-denom', 4); await range(page, '#vis-numer', 0);
        await adjust(page, 'vis-numer', 'dec'); assert.equal(await text(page, '#vis-display'), '0/4');
        await adjust(page, 'vis-numer', 'inc'); assert.equal(await text(page, '#vis-display'), '1/4');
        await range(page, '#vis-numer', 4); await adjust(page, 'vis-numer', 'inc'); assert.equal(await text(page, '#vis-display'), '4/4');
        await adjust(page, 'vis-denom', 'dec'); assert.equal(await text(page, '#vis-display'), '3/3');
        await adjust(page, 'vis-denom', 'inc'); assert.equal(await text(page, '#vis-display'), '3/4');
        await range(page, '#vis-numer', 0);
        const input = page.locator('#vis-numer'); await input.scrollIntoViewIfNeeded();
        const box = await input.boundingBox(); assert.ok(box && box.width > 40);
        await page.mouse.move(box.x + 8, box.y + box.height / 2); await page.mouse.down();
        await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 12 }); await page.mouse.up();
        assert.equal(await input.inputValue(), '4', 'Actual mouse drag reaches range maximum');
        assert.equal(await text(page, '#vis-display'), '4/4');
        await range(page, '#vis-numer', 0);
        await tapPizza(page, 4, 2); assert.equal(await text(page, '#vis-display'), '3/4');
        await page.locator('#vis-bar .bar-segment').nth(1).tap(); assert.equal(await text(page, '#vis-display'), '2/4');
        await range(page, '#vis-denom', 1); await range(page, '#vis-numer', 0);
        await tapPizza(page, 1, 0); assert.equal(await text(page, '#vis-display'), '1/1', 'Denominator-one circle accepts native touch');
        await range(page, '#vis-numer', 0); await page.locator('#vis-bar .bar-segment').tap(); assert.equal(await text(page, '#vis-display'), '1/1');
        await range(page, '#vis-denom', 12); await page.locator('#vis-denom').press('ArrowRight'); assert.equal(await page.locator('#vis-denom').inputValue(), '12');
        await range(page, '#vis-numer', 6);
        assert.equal(await text(page, '#vis-percent'), '50%'); assert.equal(await text(page, '#vis-decimal'), '0.50');
        assert.equal(await page.locator('#vis-bar .active').count(), 6);
        assert.equal(await page.locator('#vis-line-marks .nl-marker').count(), 11);
        assert.equal(await page.locator('#vis-line-fill').evaluate(node => node.style.width), '50%');
        for (const id of TABS) { await tab(page, id); await noHorizontalOverflow(page, record); }
        record.inputs = ['native range Home/End/arrows', 'actual mouse drag', 'plus/minus', 'native pizza/bar taps including denominator 1'];
    }, {}, viewport);
}
async function tapPizza(page, denominator, index) {
    const pizza = page.locator('#vis-pizza-svg'); await pizza.scrollIntoViewIfNeeded();
    const box = await pizza.boundingBox(); assert.ok(box && box.width > 0 && box.height > 0);
    const angle = ((index + 0.5) * 360 / denominator - 90) * Math.PI / 180;
    const radius = Math.min(box.width, box.height) * 0.34;
    const x = box.x + box.width / 2 + Math.cos(angle) * radius, y = box.y + box.height / 2 + Math.sin(angle) * radius;
    assert.ok(y >= 0 && y < page.viewportSize().height, 'Native pizza tap lies inside viewport');
    await page.touchscreen.tap(x, y);
}

async function assertPinkDiagram(page, selector, expectedCount, record) {
    const sample = { selector, expectedCount, before: await page.locator(`${selector} path,${selector} circle`).evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fill)) };
    (record.colorSamples ||= []).push(sample);
    // fillには実際のCSS遷移がある。時計・アニメーションを変更せず終点の計算色を待つ。
    await page.waitForFunction(({ selector, expectedCount }) =>
        [...document.querySelectorAll(`${selector} path,${selector} circle`)].filter(node => getComputedStyle(node).fill === 'rgb(236, 72, 153)').length === expectedCount,
    { selector, expectedCount });
    sample.after = await page.locator(`${selector} path,${selector} circle`).evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fill));
    assert.equal(sample.after.filter(color => color === 'rgb(236, 72, 153)').length, expectedCount, 'Right operand settles to its pink semantic fill');
}

async function compareSuite() {
    for (const theme of ['dark', 'light']) await runCase(`compare-exact-${theme}`, async (page, record) => {
        await tab(page, 'compare');
        for (const [n1, d1, n2, d2, sign] of [[1, 2, 2, 4, 'equal'], [2, 3, 8, 12, 'equal'], [0, 1, 0, 12, 'equal'],
            [1, 1, 12, 12, 'equal'], [1, 4, 1, 8, 'chevron_right'], [5, 12, 5, 11, 'chevron_left'], [11, 12, 10, 11, 'chevron_right']]) {
            await range(page, '#cmp-d1', d1); await range(page, '#cmp-d2', d2);
            await range(page, '#cmp-n1', n1); await range(page, '#cmp-n2', n2);
            assert.equal(await text(page, '#cmp-disp-1'), `${n1}/${d1}`); assert.equal(await text(page, '#cmp-disp-2'), `${n2}/${d2}`);
            assert.equal(await text(page, '#cmp-icon'), sign, 'Comparison agrees with independent exact cross multiplication');
            assert.match(await text(page, '#cmp-status'), new RegExp(sign === 'equal' ? '同じ大きさ' : sign === 'chevron_right' ? '左の分数' : '右の分数'));
            if (n2 > 0) await assertPinkDiagram(page, '#cmp-svg-2', n2, record);
            assert.equal(Math.sign(n1 * d2 - n2 * d1), sign === 'equal' ? 0 : sign === 'chevron_right' ? 1 : -1);
            assert.equal(await text(page, '#cmp-val-1'), (n1 / d1).toFixed(2));
            assert.equal(await text(page, '#cmp-val-2'), (n2 / d2).toFixed(2));
            for (const [selector, expected] of [['#cmp-bar-1', n1 / d1 * 100], ['#cmp-bar-2', n2 / d2 * 100]])
                assert.ok(Math.abs(await page.locator(selector).evaluate(node => parseFloat(node.style.width)) - expected) < 0.001);
        }
        await range(page, '#cmp-d1', 12); await range(page, '#cmp-n1', 12); await range(page, '#cmp-d1', 1);
        assert.equal(await page.locator('#cmp-n1').inputValue(), '1'); assert.equal(await text(page, '#cmp-disp-1'), '1/1');
        await screenshot(page, `compare-${theme}-exact`); record.exactCases = 7;
    }, { storage: { [PROFILE]: JSON.stringify({ darkMode: theme === 'dark' }) } });
}

async function arithmeticSuite() {
    for (const theme of ['dark', 'light']) for (const mode of ['calc', 'sub']) await runCase(`${mode}-integer-boundaries-${theme}`, async (page, record) => {
        await tab(page, mode); await range(page, `#${mode}-denom`, 5);
        const cases = mode === 'calc' ? [[1, 2, 3, false], [4, 4, 8, true], [1, 4, 5, false]]
            : [[3, 1, 2, false], [1, 5, -4, true], [5, 5, 0, false], [5, 0, 5, false]];
        for (const [n1, n2, result, warning] of cases) {
            await numberInput(page, `#${mode}-n1`, n1); await numberInput(page, `#${mode}-n2`, n2);
            assert.equal(await text(page, `#${mode}-res-text`), `${result}/5`);
            if (n2 > 0) await assertPinkDiagram(page, `#${mode}-svg-2`, n2, record);
            assert.equal(await page.locator(`#${mode}-warning`).isVisible(), warning);
            if (warning) { assert.match(await text(page, `#${mode}-warning`), new RegExp(`${result}/5`)); await screenshot(page, `${mode}-${theme}-warning`); }
        }
        const firstMin = 1, secondMin = mode === 'calc' ? 1 : 0, max = mode === 'calc' ? 4 : 5;
        for (const [which, minimum] of [[1, firstMin], [2, secondMin]]) {
            for (const [raw, expected] of [['', minimum], ['-99', minimum], ['999', max], ['2.9', 2]]) {
                await numberInput(page, `#${mode}-n${which}`, raw);
                assert.equal(await page.locator(`#${mode}-n${which}`).inputValue(), String(expected), 'Displayed inputs normalize to the integers used by the answer');
                const a = Number(await page.locator(`#${mode}-n1`).inputValue()), b = Number(await page.locator(`#${mode}-n2`).inputValue());
                assert.equal(await text(page, `#${mode}-res-text`), `${mode === 'calc' ? a + b : a - b}/5`);
            }
        }
        await numberInput(page, `#${mode}-n1`, 999); await numberInput(page, `#${mode}-n2`, 999);
        await range(page, `#${mode}-denom`, 2);
        assert.equal(await page.locator(`#${mode}-n1`).inputValue(), mode === 'calc' ? '1' : '2');
        assert.equal(await page.locator(`#${mode}-n2`).inputValue(), mode === 'calc' ? '1' : '2');
        await adjust(page, `${mode}-n1`, 'dec'); await adjust(page, `${mode}-n2`, 'inc');
        const a = Number(await page.locator(`#${mode}-n1`).inputValue()), b = Number(await page.locator(`#${mode}-n2`).inputValue());
        assert.equal(await text(page, `#${mode}-res-text`), `${mode === 'calc' ? a + b : a - b}/2`);
        const denominator = page.locator(`#${mode}-denom`); await denominator.press('End');
        assert.equal(await text(page, `#${mode}-d-val`), await denominator.inputValue());
        assert.doesNotMatch(await text(page, `#view-${mode}`), /NaN|Infinity|undefined/);
        record.colors = await page.locator(`#${mode}-svg-res [fill]`).evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, fill: getComputedStyle(node).fill, opacity: getComputedStyle(node).fillOpacity })));
        await screenshot(page, `${mode}-${theme}-integer-boundaries`);
    }, { storage: { [PROFILE]: JSON.stringify({ darkMode: theme === 'dark' }) } });
}

// 期待値は画面から読んだ単位分数を独立のBigInt計算で検算する。
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function sumFractions(terms) {
    let n = 0n, d = 1n;
    for (const term of terms) {
        const [a, b] = term.split('/').map(BigInt); n = n * b + a * d; d *= b;
        const divisor = gcd(n, d); n /= divisor; d /= divisor;
    }
    return { n, d };
}
async function egyptInput(page, n, d) { await numberInput(page, '#egypt-n', n); await numberInput(page, '#egypt-d', d); }
async function assertEgypt(page, n, d) {
    assert.equal(await page.locator('#egypt-content').isVisible(), true);
    assert.equal(await page.locator('#egypt-warning').isVisible(), false);
    assert.equal(await page.locator('#egypt-placeholder').isVisible(), false);
    const formula = await text(page, '#egypt-formula'), fractions = formula.match(/\d+\/\d+/g);
    assert.ok(fractions?.length > 1); assert.equal(fractions.shift(), `${n}/${d}`);
    assert.ok(fractions.every(term => /^1\/[1-9]\d*$/.test(term)));
    assert.equal(new Set(fractions).size, fractions.length, 'Egyptian terms are distinct');
    const sum = sumFractions(fractions); assert.equal(sum.n * BigInt(d), BigInt(n) * sum.d, 'The displayed unit fractions sum exactly to the input');
    assert.match(await text(page, '#egypt-steps'), new RegExp(`${n}/${d}`));
    return fractions;
}
async function egyptSuite() {
    for (const viewport of VIEWPORTS) await runCase(`egyptian-valid-invalid-long-${viewport.width}x${viewport.height}`, async (page, record) => {
        await tab(page, 'secret'); await egyptInput(page, 3, 4); await page.locator('#btn-calc-egypt').tap();
        assert.deepEqual(await assertEgypt(page, 3, 4), ['1/2', '1/4']);
        for (let index = 0; index < 3; index++) { await page.locator('#btn-calc-egypt').tap(); assert.deepEqual(await assertEgypt(page, 3, 4), ['1/2', '1/4']); }
        await egyptInput(page, 44, 53);
        assert.equal(await page.locator('#egypt-content').isVisible(), false, 'Editing input hides the previous decomposition');
        await page.locator('#btn-calc-egypt').tap(); record.longTerms = await assertEgypt(page, 44, 53);
        assert.ok(record.longTerms.some(term => term.length > 20), 'The long denominator path is actually exercised');
        await page.locator('#egypt-formula').scrollIntoViewIfNeeded(); await noHorizontalOverflow(page, record);
        const bounds = await page.locator('#egypt-formula').evaluate(node => {
            const box = node.getBoundingClientRect();
            return { width: node.clientWidth, scrollWidth: node.scrollWidth,
                terms: [...node.querySelectorAll('span')].map(term => { const r = term.getBoundingClientRect(); return { text: term.textContent, left: r.left - box.left, right: r.right - box.left }; }) };
        });
        assert.ok(bounds.scrollWidth <= bounds.width + 1, 'Long denominators wrap without clipping'); record.longFormulaBounds = bounds;
        await screenshot(page, `egypt-long-${viewport.width}x${viewport.height}`);
        await egyptInput(page, 8, 97); await page.locator('#btn-calc-egypt').click();
        record.stressTerms = await assertEgypt(page, 8, 97);
        assert.ok(record.stressTerms.some(term => term.split('/')[1].length >= 150), 'The 150-digit Egyptian denominator is actually exercised');
        await page.locator('#egypt-formula').scrollIntoViewIfNeeded(); await noHorizontalOverflow(page, record);
        assert.ok(await page.locator('#egypt-formula').evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'The 150-digit denominator wraps within its own result box');
        await screenshot(page, `egypt-stress-${viewport.width}x${viewport.height}`);
        for (const [n, d] of [[4, 4], [5, 4], [0, 4], [-1, 4], [3, 0], [3, 1], ['', 4], [3, ''], ['2.5', 4], [3, '4.5'], [100, 101], [1, 101]]) {
            await egyptInput(page, n, d); await page.locator('#btn-calc-egypt').click();
            assert.equal(await page.locator('#egypt-warning').isVisible(), true, `Reject invalid input ${n}/${d}`);
            assert.equal(await page.locator('#egypt-content').isVisible(), false, 'An earlier valid formula cannot remain exposed behind an error');
            assert.equal(await page.locator('#egypt-placeholder').isVisible(), true);
        }
        await egyptInput(page, 1, 100); await page.locator('#btn-calc-egypt').click(); assert.deepEqual(await assertEgypt(page, 1, 100), ['1/100']);
        await egyptInput(page, 3, 4); await page.locator('#btn-calc-egypt').click(); assert.deepEqual(await assertEgypt(page, 3, 4), ['1/2', '1/4']);
        await adjust(page, 'egypt-n', 'inc'); assert.equal(await page.locator('#egypt-content').isVisible(), false);
        await page.locator('#btn-calc-egypt').click(); assert.equal(await page.locator('#egypt-warning').isVisible(), true);
        await adjust(page, 'egypt-n', 'dec'); await page.locator('#btn-calc-egypt').click(); await assertEgypt(page, 3, 4);
        assert.doesNotMatch(await text(page, '#egypt-result-box'), /NaN|Infinity|undefined/);
    }, {}, viewport);
}

async function answerQuiz(page, { wrongFirst = false, keyboard = false, checkFocus = true } = {}) {
    const area = page.locator('#fraction-check-question-area');
    for (const [index, answer] of ['1/4', '同じ場所になる', '0と1の間'].entries()) {
        assert.match(await area.textContent(), new RegExp(`QUESTION ${index + 1} / 3`));
        const chosen = area.getByRole('button', { name: index === 0 && wrongFirst ? '1/8' : answer, exact: true });
        if (keyboard) { await chosen.focus(); await page.keyboard.press('Enter'); } else await chosen.tap();
        assert.equal(await area.locator('button:disabled').count(), 3, 'All three answers lock after one selection');
        const feedback = area.locator('[role="status"]'); assert.equal(await feedback.isVisible(), true);
        assert.match(await feedback.textContent(), index === 0 && wrongFirst ? /発見ポイント/ : /せいかい/);
        const next = area.getByRole('button', { name: index < 2 ? '次のナゾへ →' : '結果を見る', exact: true });
        if (checkFocus) assert.equal(await next.evaluate(node => node === document.activeElement), true, 'Answer advances focus to the feedback action');
        if (keyboard) await page.keyboard.press('Enter'); else await next.tap();
        if (checkFocus && index < 2) assert.equal(await area.locator('button').first().evaluate(node => node === document.activeElement), true, 'Next question focuses its first option');
    }
    assert.match(await area.textContent(), new RegExp(`${wrongFirst ? 2 : 3} / 3`));
    const retry = area.getByRole('button', { name: 'もう一回ためす', exact: true });
    if (checkFocus) assert.equal(await retry.evaluate(node => node === document.activeElement), true, 'Quiz result focuses retry');
}
async function quizSuite() {
    for (const viewport of VIEWPORTS) await runCase(`concept-quiz-correct-wrong-retry-${viewport.width}x${viewport.height}`, async (page, record) => {
        await answerQuiz(page, { wrongFirst: true, keyboard: true }); await screenshot(page, `quiz-mixed-${viewport.width}x${viewport.height}`);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#fraction-check-question-area button').first().evaluate(node => node === document.activeElement), true);
        await answerQuiz(page, { keyboard: true }); await screenshot(page, `quiz-perfect-${viewport.width}x${viewport.height}`);
        await page.getByRole('button', { name: 'もう一回ためす', exact: true }).tap();
        assert.match(await text(page, '#fraction-check-question-area'), /QUESTION 1 \/ 3/);
        await page.locator('#fraction-check-question-area').getByRole('button', { name: '1/4', exact: true }).tap();
        await tab(page, 'visual'); await tab(page, 'whatis');
        assert.match(await text(page, '#fraction-check-question-area'), /せいかい/);
        assert.equal(await page.locator('#fraction-check-question-area button:disabled').count(), 3, 'Tab changes do not duplicate or reset quiz answers');
        await noHorizontalOverflow(page, record);
    }, {}, viewport);
}

async function openModal(page, id) {
    const opener = page.locator(`#${id}-open-btn`); await opener.tap();
    assert.equal(await page.locator(`#${id}`).evaluate(node => node.open), true);
    assert.equal(await opener.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator(`#${id}`).isVisible(), true);
    assert.equal(await page.locator(`#${id}`).evaluate(node => node.contains(document.activeElement)), true);
}
async function assertClosed(page, id) {
    await page.waitForFunction(id => !document.getElementById(id).open && document.getElementById(`${id}-open-btn`).getAttribute('aria-expanded') === 'false', id);
    assert.equal(await page.locator(`#${id}`).evaluate(node => node.open), false);
    assert.equal(await page.locator(`#${id}-open-btn`).getAttribute('aria-expanded'), 'false');
    await assertFocus(page, `#${id}-open-btn`);
}
async function backdropClick(page, id) {
    const box = await page.locator(`#${id}`).boundingBox(), vp = page.viewportSize();
    assert.ok(box);
    const candidates = [{ x: 1, y: 1 }, { x: vp.width - 2, y: vp.height - 2 }, { x: vp.width / 2, y: 1 }];
    const point = candidates.find(p => p.x < box.x || p.x > box.x + box.width || p.y < box.y || p.y > box.y + box.height);
    assert.ok(point, 'Native modal has a reachable backdrop');
    await page.mouse.click(point.x, point.y); await assertClosed(page, id);
}
async function modalSuite() {
    for (const viewport of VIEWPORTS) await runCase(`modals-focus-close-backdrop-${viewport.width}x${viewport.height}`, async (page, record) => {
        for (const selector of ['header a', 'header h1', '#parents-modal-open-btn', '#settings-modal-open-btn']) await fullyReachable(page, selector, record);
        for (const id of ['parents-modal', 'settings-modal']) {
            await fullyReachable(page, `#${id}-open-btn`, record); await openModal(page, id);
            for (let index = 0; index < 8; index++) {
                await page.keyboard.press(index % 2 ? 'Shift+Tab' : 'Tab');
                assert.equal(await page.locator(`#${id}`).evaluate(node => node.contains(document.activeElement)), true, 'Native dialog keeps focus inside');
            }
            await screenshot(page, `${id}-${viewport.width}x${viewport.height}`);
            await page.keyboard.press('Escape'); await assertClosed(page, id);
            await openModal(page, id);
            const close = page.locator(`[data-action="close-modal"][data-target="${id}"]`).last();
            await close.scrollIntoViewIfNeeded(); await close.tap(); await assertClosed(page, id);
            await openModal(page, id); await backdropClick(page, id);
            for (let repeat = 0; repeat < 3; repeat++) { await openModal(page, id); await page.keyboard.press('Escape'); await assertClosed(page, id); }
        }
        await openModal(page, 'settings-modal');
        assert.equal(await page.locator('#dark-mode-toggle').getAttribute('aria-pressed'), 'true');
        await page.locator('#dark-mode-toggle').tap(); assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-light')), true);
        await page.locator('#motion-toggle').tap(); assert.equal(await page.locator('body').evaluate(node => node.classList.contains('reduced-motion')), true);
        await page.keyboard.press('Escape'); await assertClosed(page, 'settings-modal');
        await tab(page, 'visual'); await range(page, '#vis-numer', 2); assert.equal(await text(page, '#vis-display'), '2/4');
    }, {}, viewport);
}

async function storageSuite() {
    await runCase('settings-persist-and-preserve-shared-profile', async (page, record) => {
        await openModal(page, 'settings-modal'); await page.locator('#dark-mode-toggle').click(); await page.locator('#motion-toggle').click();
        await page.keyboard.press('Escape');
        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE);
        assert.equal(stored.darkMode, false); assert.equal(stored.reduceMotion, true);
        assert.deepEqual(stored.unrelatedLab, { keep: 'shared-profile-value', count: 17 });
        await page.reload({ waitUntil: 'load' }); await page.locator('#fraction-check-question-area button').first().waitFor();
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-light')), true);
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('reduced-motion')), true);
        await openModal(page, 'settings-modal'); assert.equal(await page.locator('#dark-mode-toggle').getAttribute('aria-pressed'), 'false');
        assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'), 'true'); await page.keyboard.press('Escape');
        await tab(page, 'visual'); await range(page, '#vis-denom', 8); await range(page, '#vis-numer', 3);
        assert.equal(await text(page, '#vis-display'), '3/8'); record.savedProfile = stored;
    }, { storage: { [PROFILE]: JSON.stringify({ darkMode: true, reduceMotion: false, unrelatedLab: { keep: 'shared-profile-value', count: 17 } }) } });
    const corrupt = [['malformed', '{broken'], ['null', 'null'], ['array', '[1,2]'], ['number', '42'],
        ['wrong-types', JSON.stringify({ darkMode: 'false', reduceMotion: 1, unrelatedLab: 'keep' })]];
    for (const [name, value] of corrupt) await runCase(`storage-${name}-runtime-usable`, async page => {
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-light')), false);
        await openModal(page, 'settings-modal'); await page.locator('#dark-mode-toggle').click(); await page.keyboard.press('Escape');
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-light')), true);
        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROFILE);
        assert.equal(stored.darkMode, false); assert.equal(typeof stored.reduceMotion, 'boolean');
        await tab(page, 'calc'); await numberInput(page, '#calc-n1', 4); await numberInput(page, '#calc-n2', 4);
        assert.equal(await text(page, '#calc-res-text'), '8/5');
        await tab(page, 'secret'); await egyptInput(page, 3, 4); await page.locator('#btn-calc-egypt').click(); await assertEgypt(page, 3, 4);
    }, { storage: { [PROFILE]: value } });
    for (const failure of ['denyStorage', 'quotaExceeded']) await runCase(`${failure}-settings-and-runtime-continue`, async page => {
        await openModal(page, 'settings-modal'); await page.locator('#dark-mode-toggle').click(); await page.locator('#motion-toggle').click();
        assert.equal(await page.locator('#dark-mode-toggle').getAttribute('aria-pressed'), 'false');
        assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'), 'true'); await page.keyboard.press('Escape');
        await tab(page, 'visual'); await range(page, '#vis-denom', 6); await range(page, '#vis-numer', 3); assert.equal(await text(page, '#vis-display'), '3/6');
        await tab(page, 'sub'); await numberInput(page, '#sub-n1', 1); await numberInput(page, '#sub-n2', 5); assert.equal(await text(page, '#sub-res-text'), '-4/5');
        await tab(page, 'secret'); await egyptInput(page, 4, 4); await page.locator('#btn-calc-egypt').click(); assert.equal(await page.locator('#egypt-warning').isVisible(), true);
        await egyptInput(page, 3, 4); await page.locator('#btn-calc-egypt').click(); await assertEgypt(page, 3, 4);
        await tab(page, 'whatis'); await answerQuiz(page, { wrongFirst: true });
    }, { [failure]: true });
}

async function layoutSnapshot(page) {
    return page.evaluate(() => {
        const round = n => Math.round(n * 100) / 100;
        const key = node => {
            if (node.id) return `#${node.id}`;
            if (node === document.body) return 'body';
            const peers = [...node.parentElement.children].filter(peer => peer.tagName === node.tagName);
            return `${key(node.parentElement)}>${node.tagName.toLowerCase()}:nth-of-type(${peers.indexOf(node) + 1})`;
        };
        const props = ['display', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
            'color', 'backgroundColor', 'borderTopColor', 'borderTopWidth', 'borderRadius', 'paddingTop', 'paddingRight',
            'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap',
            'gridTemplateColumns', 'flexDirection', 'alignItems', 'justifyContent', 'textAlign', 'overflowX', 'overflowY'];
        const anchors = 'header,header>div,header h1,header a,header button,nav,[role="tablist"],[role="tab"],main,[role="tabpanel"],.glass-panel,input,svg,.bar-container,.number-line-container,#fraction-misconception-check,#fraction-check-question-area,#fraction-number-concept-card,#egypt-result-box,#egypt-formula,#egypt-steps';
        const nodes = [...document.querySelectorAll('body,body *')].flatMap(node => {
            if (['SCRIPT', 'STYLE', 'LINK', 'META'].includes(node.tagName)) return [];
            const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
            if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden') return [];
            return [{ key: key(node), anchor: node.matches(anchors), headerDescendant: node !== document.querySelector('header') && !!node.closest('header'), themeClass: node.className?.baseVal ?? node.className,
                box: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
                style: Object.fromEntries(props.map(prop => [prop, style[prop]])),
                text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
                value: node instanceof HTMLInputElement ? node.value : null,
                semantics: { role: node.getAttribute('role'), label: node.getAttribute('aria-label'), selected: node.getAttribute('aria-selected') } }];
        });
        const main = document.querySelector('#main-content');
        return { viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight, mainScrollTop: main.scrollTop, mainScrollHeight: main.scrollHeight, nodes };
    });
}
function compareLayout(actual, expected, name, theme) {
    const old = new Map(expected.nodes.map(node => [node.key, node])), current = new Map(actual.nodes.map(node => [node.key, node]));
    const differences = [], allowedColorDifferences = [], allowedGeometryFixes = [];
    const mobileHeaderReason = 'Verified existing 320/390px header text/button overlap: compact inner padding/gaps, hide decorative icon and 14px nonwrapping title. Header/nav/main bounds stay strict.';
    for (const [key, before] of old) {
        if (!before.anchor) continue;
        const after = current.get(key);
        if (!after) { differences.push({ key, property: 'missing-anchor' }); continue; }
        for (const property of ['x', 'y', 'width', 'height']) if (Math.abs(after.box[property] - before.box[property]) > 1) {
            const difference = { key, property: `box.${property}`, before: before.box[property], after: after.box[property] };
            if (actual.viewport.width <= 400 && before.headerDescendant && after.headerDescendant) allowedGeometryFixes.push({ ...difference, reason: mobileHeaderReason });
            else differences.push(difference);
        }
        for (const [property, previous] of Object.entries(before.style)) {
            if (after.style[property] === previous) continue;
            const scopedLightColor = theme === 'light' && property === 'color' && /light-panel-(heading|copy)/.test(String(after.themeClass));
            const difference = { key, property: `style.${property}`, before: previous, after: after.style[property] };
            const scaledTitleSpacing = actual.viewport.width <= 400 && before.headerDescendant && after.headerDescendant
                && key.endsWith('>h1:nth-of-type(1)') && property === 'letterSpacing'
                && before.style.fontSize === '18px' && after.style.fontSize === '14px'
                && previous === '-0.45px' && after.style[property] === '-0.35px';
            if (scaledTitleSpacing) allowedGeometryFixes.push({ ...difference, reason: 'The unchanged -0.025em title letter spacing scales exactly with the approved mobile font size 18px to 14px' });
            else if (actual.viewport.width <= 400 && before.headerDescendant && after.headerDescendant && ['paddingLeft', 'paddingRight', 'gap', 'marginRight', 'fontSize'].includes(property)) allowedGeometryFixes.push({ ...difference, reason: mobileHeaderReason });
            else if (scopedLightColor) allowedColorDifferences.push({ ...difference, reason: 'Scoped light-panel foreground contrast correction; geometry remains strict' });
            else differences.push(difference);
        }
        for (const property of ['text', 'value']) if (after[property] !== before[property])
            differences.push({ key, property, before: before[property], after: after[property] });
    }
    for (const [key, node] of current) if (node.anchor && !old.has(key)) differences.push({ key, property: 'added-anchor' });
    for (const property of ['documentWidth', 'documentHeight', 'mainScrollHeight']) if (Math.abs(actual[property] - expected[property]) > 1)
        differences.push({ property, before: expected[property], after: actual[property] });
    return { name, differences, allowedColorDifferences, allowedGeometryFixes,
        scope: 'Every visible layout anchor; full visible-node snapshots are retained separately. SVG child implementation and intended slice colors are not geometry anchors.' };
}
async function layoutSuite() {
    for (const viewport of VIEWPORTS) for (const theme of ['dark', 'light']) {
        const options = { storage: { [PROFILE]: JSON.stringify({ darkMode: theme === 'dark', reduceMotion: false }) } };
        await runCase(`layout-${theme}-${viewport.width}x${viewport.height}`, async (page, record) => {
            const baseline = baselineUrl ? await createCase(viewport, options) : null;
            const comparisons = []; record.states = [];
            try {
                if (baseline) await ready(baseline, baselineUrl);
                for (const state of TABS) {
                    for (const target of [page, baseline?.page].filter(Boolean)) {
                        await target.locator(`#tab-${state}`).click(); await scrollMainTop(target); await target.waitForTimeout(450);
                    }
                    const name = `${theme}-${viewport.width}x${viewport.height}-${state}`;
                    const actual = await layoutSnapshot(page), expected = baseline ? await layoutSnapshot(baseline.page) : null;
                    await writeJSON(`${name}-geometry.json`, { candidate: actual, baseline: expected });
                    await screenshot(page, `${name}-candidate`);
                    if (baseline) {
                        await screenshot(baseline.page, `${name}-baseline`);
                        comparisons.push(compareLayout(actual, expected, name, theme));
                    }
                    imagePairs.push({ name, baseline: baseline ? `${name}-baseline.png` : null, candidate: `${name}-candidate.png`, geometry: `${name}-geometry.json` });
                    await noHorizontalOverflow(page, record);
                    record.states.push({ state, nodes: actual.nodes.length, anchors: actual.nodes.filter(node => node.anchor).length });
                }
                record.comparisons = comparisons; record.baselineComparison = baseline ? 'performed' : 'explicitly skipped: FRACTION_LAB_BASELINE_ROOT is unset';
                await writeJSON(`${theme}-${viewport.width}x${viewport.height}-comparison.json`, comparisons);
                assert.deepEqual(comparisons.flatMap(item => item.differences.map(difference => ({ state: item.name, ...difference }))), [],
                    'Initial layout geometry and styles remain unchanged except narrowly documented color corrections');
                if (baseline) { assert.deepEqual(baseline.errors, []); assert.deepEqual(baseline.requestFailures, []); }
            } finally { await baseline?.context.close(); }
        }, options, viewport);
    }
}

async function realFontsSmokeSuite() {
    // 新規コンテキストで外部フォントも通常配信する。route/initScript/時計置換を一切使わない。
    for (const viewport of VIEWPORTS) await runCase(`native-real-fonts-${viewport.width}x${viewport.height}`, async (page, record) => {
        record.environment = { fonts: 'real network', routes: 'none', initScripts: 'none', clock: 'native', serviceWorkers: 'allow', input: 'native keyboard/pointer/touch' };
        await page.waitForFunction(() => [...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].every(link => link.sheet && link.media !== 'print'), null, { timeout: 30_000 });
        record.fonts = await page.evaluate(async () => {
            await document.fonts.load('400 16px "Noto Sans JP"', '分数');
            await document.fonts.load('700 16px "Noto Sans JP"', '分数');
            await document.fonts.load('600 24px "Material Symbols Rounded"', 'settings');
            await document.fonts.ready;
            return [...document.fonts].map(font => ({ family: font.family.replace(/["']/g, ''), weight: font.weight, status: font.status }));
        });
        for (const family of ['Noto Sans JP', 'Material Symbols Rounded']) assert.ok(record.fonts.some(font => font.family === family && font.status === 'loaded'), `${family} must really load; fallback-only execution is not native-font evidence`);
        for (const selector of ['header a', 'header h1', '#parents-modal-open-btn', '#settings-modal-open-btn']) await fullyReachable(page, selector, record);
        for (const id of ['parents-modal', 'settings-modal']) {
            await fullyReachable(page, `#${id}-open-btn`, record); await openModal(page, id);
            await page.keyboard.press('Escape'); await assertClosed(page, id);
        }
        for (const theme of ['dark', 'light']) {
            if (theme === 'light') {
                await openModal(page, 'settings-modal'); await page.locator('#dark-mode-toggle').tap();
                const done = page.locator('.fraction-settings-done');
                await done.hover();
                assert.equal(await done.evaluate(node => getComputedStyle(node).color), 'rgb(255, 255, 255)', 'Light settings Done keeps white text while hovered');
                await done.focus();
                assert.equal(await done.evaluate(node => getComputedStyle(node).color), 'rgb(255, 255, 255)', 'Light settings Done keeps white text with keyboard focus');
                await screenshot(page, `native-light-settings-${viewport.width}x${viewport.height}`);
                await page.keyboard.press('Escape');
            }
            for (const id of TABS) {
                await tab(page, id); await noHorizontalOverflow(page, record);
                if (theme === 'light' && id === 'whatis') {
                    const insets = await page.locator('#view-whatis [class~="bg-slate-900/50"], #view-whatis [class~="bg-slate-900/60"]').evaluateAll(nodes => nodes.map(node => ({
                        classes: node.className, background: getComputedStyle(node).backgroundColor,
                        labels: [...node.querySelectorAll('.text-slate-400')].map(label => ({ text: label.textContent.trim(), color: getComputedStyle(label).color }))
                    })));
                    record.lightTeachingInsets = insets;
                    assert.equal(insets.length, 4, 'All three illustrations and the numerator/denominator definition diagram are checked');
                    assert.ok(insets.every(inset => inset.background === 'rgb(15, 23, 42)'), 'Light mode keeps dark teaching illustrations opaque so their light labels stay legible');
                }
                const controls = { whatis: ['#fraction-check-question-area button:first-child'], visual: ['#vis-denom', '#vis-numer'],
                    compare: ['#cmp-n1', '#cmp-d2'], calc: ['#calc-n1', '#calc-denom'], sub: ['#sub-n2', '#sub-denom'], secret: ['#egypt-n', '#egypt-d', '#btn-calc-egypt'] }[id];
                for (const control of controls) await fullyReachable(page, control, record);
                await screenshot(page, `native-${theme}-${viewport.width}x${viewport.height}-${id}`);
            }
            await tab(page, 'visual'); await range(page, '#vis-denom', 4); await range(page, '#vis-numer', 0);
            await tapPizza(page, 4, 1); assert.equal(await text(page, '#vis-display'), '2/4');
            await page.locator('#vis-bar .bar-segment').nth(2).tap(); assert.equal(await text(page, '#vis-display'), '3/4');
            await tab(page, 'calc'); await numberInput(page, '#calc-n1', 2); await numberInput(page, '#calc-n2', 3); assert.equal(await text(page, '#calc-res-text'), '5/5');
            await tab(page, 'secret'); await egyptInput(page, 44, 53); await page.locator('#btn-calc-egypt').tap(); await assertEgypt(page, 44, 53);
            await noHorizontalOverflow(page, record);
        }
        await tab(page, 'whatis'); await answerQuiz(page, { keyboard: true });
    }, { nativeEnvironment: true }, viewport);
}

async function metrics(cdp) { return Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value])); }
async function retention(page, cdp) {
    await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(40); await cdp.send('HeapProfiler.collectGarbage');
    const connected = await page.evaluate(() => {
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL), byType = {}; let count = 0;
        do { count++; byType[walker.currentNode.nodeType] = (byType[walker.currentNode.nodeType] || 0) + 1; } while (walker.nextNode());
        return { count, byType, elements: document.querySelectorAll('*').length };
    });
    return { connected, dom: await cdp.send('Memory.getDOMCounters'), metrics: await metrics(cdp) };
}
async function allocationSample(current, mode, count = 60) {
    const { page, context } = current; await tab(page, mode);
    await range(page, mode === 'visual' ? '#vis-denom' : `#${mode}-denom`, mode === 'visual' ? 12 : 10);
    const inputSelector = mode === 'visual' ? '#vis-numer' : `#${mode}-n1`;
    if (mode === 'visual') await range(page, inputSelector, 1); else await numberInput(page, inputSelector, 1);
    const selectors = mode === 'visual' ? ['#vis-pizza-svg', '#vis-bar', '#vis-line-marks'] : [`#${mode}-svg-1`, `#${mode}-svg-2`, `#${mode}-svg-res`];
    const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
    // MutationObserverで実際のノード追加・除去を観測するだけ。アプリDOMや関数を変更しない。
    const observer = await page.evaluateHandle(selectors => {
        const counts = { records: 0, addedNodes: 0, removedNodes: 0, addedElements: 0, removedElements: 0 };
        const size = node => {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_ALL); let nodes = 0, elements = 0;
            do { nodes++; if (walker.currentNode.nodeType === Node.ELEMENT_NODE) elements++; } while (walker.nextNode());
            return { nodes, elements };
        };
        const add = records => { for (const record of records) {
            if (record.type !== 'childList') continue; counts.records++;
            for (const node of record.addedNodes) { const s = size(node); counts.addedNodes += s.nodes; counts.addedElements += s.elements; }
            for (const node of record.removedNodes) { const s = size(node); counts.removedNodes += s.nodes; counts.removedElements += s.elements; }
        } };
        const targets = selectors.map(selector => document.querySelector(selector));
        const children = targets.map(target => [...target.querySelectorAll('*')]);
        const observer = new MutationObserver(add); targets.forEach(target => observer.observe(target, { childList: true, subtree: true }));
        return { counts, finish() { add(observer.takeRecords()); observer.disconnect(); return { ...counts,
            retainedOriginalElements: children.map((items, index) => items.every(item => item.isConnected && targets[index].contains(item))) }; } };
    }, selectors);
    const before = await retention(page, cdp), samples = [];
    try {
        const input = page.locator(inputSelector); await input.focus();
        for (let index = 0; index < count; index++) {
            const a = await metrics(cdp);
            await input.press(index % 2 === 0 ? 'ArrowUp' : 'ArrowDown');
            if (mode !== 'visual') { await input.press('Tab'); await input.focus(); }
            const value = Number(await input.inputValue()); assert.equal(value, index % 2 === 0 ? 2 : 1);
            if (mode === 'visual') assert.equal(await text(page, '#vis-display'), `${value}/12`);
            const b = await metrics(cdp);
            samples.push({ input: index + 1, scriptMs: (b.ScriptDuration - a.ScriptDuration) * 1000,
                taskMs: (b.TaskDuration - a.TaskDuration) * 1000, heapNetBytes: b.JSHeapUsedSize - a.JSHeapUsedSize,
                nodes: b.Nodes, eventListeners: b.JSEventListeners });
        }
        const allocation = await observer.evaluate(observed => observed.finish()); await observer.dispose();
        const after = await retention(page, cdp);
        return { mode, inputs: count, fixedDenominator: mode === 'visual' ? 12 : 10, watchedSelectors: selectors, before, after, allocation, samples,
            note: 'Observed child-list allocations in rendered diagram regions, using native input. CDP net heap is not total allocation; timing is evidence rather than a CI threshold. No application internals or imported source.' };
    } finally { await cdp.detach(); }
}
async function repeatedWorkflowBatch(page, count) {
    assert.equal(count % 2, 0, 'Each workflow batch returns from the same denominator sequence');
    for (let repeat = 0; repeat < count; repeat++) {
        await tab(page, 'visual'); await range(page, '#vis-denom', repeat % 2 ? 4 : 12); await range(page, '#vis-numer', 1);
        for (const id of ['compare', 'calc', 'sub']) await tab(page, id);
        for (const id of ['parents-modal', 'settings-modal']) {
            await openModal(page, id); await page.keyboard.press('Escape'); await assertClosed(page, id);
        }
    }
    await tab(page, 'visual'); await range(page, '#vis-denom', 4); await range(page, '#vis-numer', 1);
    await assertFocus(page, '#vis-numer');
}
async function settledRetention(page, cdp, label, record) {
    const checkpoint = { label, stable: false, samples: [] };
    // dialogのdisplay/overlay遷移とfade-inも、実時間で自然に終わるまで待つ。
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running' && !animation.pending));
    const signature = sample => JSON.stringify({ connected: sample.connected, dom: sample.dom,
        layoutObjects: sample.metrics.LayoutObjects, detachedScriptStates: sample.metrics.DetachedScriptStates,
        documents: sample.metrics.Documents, frames: sample.metrics.Frames, ui: sample.ui });
    for (let attempt = 0; attempt < 8; attempt++) {
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.waitForTimeout(100);
        const sample = await retention(page, cdp);
        sample.ui = await page.evaluate(() => ({ tab: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
            focus: document.activeElement?.id, denominator: document.querySelector('#vis-denom').value,
            numerator: document.querySelector('#vis-numer').value, dialogs: [...document.querySelectorAll('dialog')].map(dialog => ({
                id: dialog.id, open: dialog.open, display: getComputedStyle(dialog).display, overlay: getComputedStyle(dialog).overlay })),
            activeAnimations: document.getAnimations().filter(animation => animation.playState === 'running' || animation.pending).length }));
        checkpoint.samples.push(sample); checkpoint.final = sample;
        const previous = checkpoint.samples.at(-2);
        checkpoint.stable = !!previous && sample.ui.activeAnimations === 0 && signature(previous) === signature(sample);
        record.repeatedSessions.lastCheckpointInProgress = checkpoint;
        await writeJSON('performance.json', record);
        if (checkpoint.stable) break;
    }
    delete record.repeatedSessions.lastCheckpointInProgress;
    return checkpoint;
}
async function retentionDiagnostics(page, cdp, record) {
    const diagnostics = record.repeatedSessions.diagnostics = {};
    try {
        const snapshot = await cdp.send('DOMSnapshot.captureSnapshot', { computedStyles: ['display', 'color', 'fill', 'transform'], includeDOMRects: true });
        await writeJSON('retention-failure-dom-snapshot.json', snapshot); diagnostics.domSnapshot = 'retention-failure-dom-snapshot.json';
    } catch (error) { diagnostics.domSnapshotError = error.message; }
    try { await screenshot(page, 'retention-failure-state'); diagnostics.screenshot = 'retention-failure-state.png'; }
    catch (error) { diagnostics.screenshotError = error.message; }
    const chunks = [], collect = event => chunks.push(event.chunk);
    cdp.on('HeapProfiler.addHeapSnapshotChunk', collect);
    try {
        await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
        await writeFile(path.join(artifactDir, 'retention-failure.heapsnapshot'), chunks.join(''));
        diagnostics.heapSnapshot = 'retention-failure.heapsnapshot';
    } catch (error) { diagnostics.heapSnapshotError = error.message; }
    finally { cdp.off('HeapProfiler.addHeapSnapshotChunk', collect); }
    await writeJSON('performance.json', record);
}

async function performanceSuite() {
    await runCase('stable-diagrams-allocation-and-listener-retention', async (page, record, current) => {
        record.candidate = [];
        for (const mode of ['visual', 'calc', 'sub']) {
            const sample = await allocationSample(current, mode); record.candidate.push(sample); await writeJSON('performance.json', record);
            assert.equal(sample.allocation.addedNodes, 0, `${mode}: numerator changes with a fixed denominator allocate no diagram nodes`);
            assert.equal(sample.allocation.removedNodes, 0, `${mode}: numerator changes do not rebuild existing diagram nodes`);
            assert.ok(sample.allocation.retainedOriginalElements.every(Boolean), `${mode}: original rendered diagram elements stay connected`);
            assert.ok(sample.after.connected.count <= sample.before.connected.count + 2, `${mode}: connected DOM remains bounded`);
            assert.ok(sample.after.dom.jsEventListeners <= sample.before.dom.jsEventListeners + 2, `${mode}: retained listeners remain bounded`);
        }
        if (baselineUrl) {
            const baseline = await createCase();
            try {
                await ready(baseline, baselineUrl); record.baseline = [];
                for (const mode of ['visual', 'calc', 'sub']) record.baseline.push(await allocationSample(baseline, mode));
                record.allocationComparisons = record.candidate.map((sample, index) => ({ mode: sample.mode,
                    beforeAddedNodes: record.baseline[index].allocation.addedNodes, candidateAddedNodes: sample.allocation.addedNodes,
                    savedNodeAllocations: record.baseline[index].allocation.addedNodes - sample.allocation.addedNodes }));
                // 最初の整備では削減を測り、基点にも最適化が入った後は0個を維持する契約を守る。
                assert.ok(record.allocationComparisons.every(item => item.candidateAddedNodes === 0 && item.beforeAddedNodes >= item.candidateAddedNodes), 'Diagram allocation stays zero, including when the PR baseline is already optimized');
            } finally { await baseline.context.close(); await writeJSON('performance.json', record); }
        }
        // 割り当て観測用の参照や、まだ一度も開いていないネイティブダイアログを基準に混ぜない。
        const repeated = await createCase(VIEWPORTS[3]);
        const cdp = await repeated.context.newCDPSession(repeated.page); await cdp.send('Performance.enable');
        record.repeatedSessions = { batches: 3, workflowsPerBatch: 12, cold: null, warmup: null, checkpoints: [], violations: [],
            method: 'Fresh context; one complete equal-state warmup batch; native CSS completion and consecutive stable V8/Blink GC samples at each checkpoint. All three measured batches finish before any retention-bound assertion.' };
        try {
            await ready(repeated);
            await tab(repeated.page, 'visual'); await range(repeated.page, '#vis-denom', 4); await range(repeated.page, '#vis-numer', 1);
            record.repeatedSessions.cold = await settledRetention(repeated.page, cdp, 'cold-visual-before-dialogs', record);
            await repeatedWorkflowBatch(repeated.page, 12);
            record.repeatedSessions.warmup = await settledRetention(repeated.page, cdp, 'warmed-baseline', record);
            const before = record.repeatedSessions.warmup.final;
            record.repeatedSessions.before = before;
            for (let batch = 0; batch < 3; batch++) {
                await repeatedWorkflowBatch(repeated.page, 12);
                const checkpoint = await settledRetention(repeated.page, cdp, `batch-${batch + 1}`, record);
                record.repeatedSessions.checkpoints.push(checkpoint);
                await writeJSON('performance.json', record);
            }
            const check = (condition, label, details) => { if (!condition) record.repeatedSessions.violations.push({ label, ...details }); };
            check(record.repeatedSessions.warmup.stable, 'The warmed baseline must settle', {});
            for (const checkpoint of record.repeatedSessions.checkpoints) {
                const sample = checkpoint.final;
                const details = { checkpoint: checkpoint.label, before: { connected: before.connected, dom: before.dom, layoutObjects: before.metrics.LayoutObjects },
                    after: { connected: sample.connected, dom: sample.dom, layoutObjects: sample.metrics.LayoutObjects } };
                check(checkpoint.stable, 'Native rendering and cross-heap counters must settle', details);
                check(JSON.stringify(sample.ui) === JSON.stringify(before.ui), 'Every checkpoint represents the same settled UI/focus/dialog state', { checkpoint: checkpoint.label, before: before.ui, after: sample.ui });
                check(JSON.stringify(sample.connected) === JSON.stringify(before.connected), 'Same workflow state retains exactly the same connected DOM', details);
                check(sample.dom.jsEventListeners <= before.dom.jsEventListeners, 'Retained event listeners must not grow after warmup', details);
                check(sample.dom.nodes <= before.dom.nodes, 'Total retained native/DOM nodes must not grow after warmup', details);
                check(sample.metrics.LayoutObjects <= before.metrics.LayoutObjects, 'Settled layout objects must not grow after warmup', details);
                check(sample.dom.documents === before.dom.documents && sample.metrics.DetachedScriptStates === before.metrics.DetachedScriptStates,
                    'No detached document or script-state growth', details);
            }
            assert.deepEqual(repeated.errors, [], 'No repeated-workflow page exceptions');
            assert.deepEqual(repeated.requestFailures, [], 'Repeated-workflow actual assets load');
            if (record.repeatedSessions.violations.length) {
                await retentionDiagnostics(repeated.page, cdp, record);
                assert.deepEqual(record.repeatedSessions.violations, [], 'Warmed same-state retention must stay bounded; every measured batch and failure diagnostics are saved');
            }
        } finally { await cdp.detach(); await repeated.context.close(); await writeJSON('performance.json', record); }
    }, {}, VIEWPORTS[3]);
}

async function imageReview() {
    const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    await writeJSON('image-review-manifest.json', { images: imagePairs,
        note: 'These are review artifacts, not a claim of human image review. Open index.htm with the downloaded artifact folder. Geometry differences are independently asserted and recorded.' });
    await writeFile(path.join(artifactDir, 'index.htm'), `<!doctype html><html lang="ja"><meta charset="utf-8"><title>Fraction Lab 実ビルド画像比較</title>
<style>body{font-family:system-ui;margin:24px;background:#e2e8f0;color:#0f172a}h1{font-size:24px}section{padding:16px;background:white;margin:24px 0;border-radius:12px}figure{margin:0;min-width:0}img{max-width:100%;height:auto;border:1px solid #94a3b8}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}summary{cursor:pointer;font-weight:bold}.overlay{position:relative;max-width:1280px}.overlay img+img{position:absolute;top:0;left:0;opacity:.5}a{color:#1d4ed8}</style>
<h1>Fraction Lab 実ビルド画像比較</h1><p>左：基準、右：候補。重ね合わせは50%の透過。許可差分・実測値は各JSONに保存。外部フォントを通常配信した画像はnative-*.png。</p>
${imagePairs.map(pair => `<section><h2>${escape(pair.name)}</h2><p><a href="${escape(pair.geometry)}">レイアウト実測JSON</a></p><div class="pair"><figure><figcaption>基準</figcaption>${pair.baseline ? `<img loading="lazy" src="${escape(pair.baseline)}">` : '<p>基準未指定</p>'}</figure><figure><figcaption>候補</figcaption><img loading="lazy" src="${escape(pair.candidate)}"></figure></div>${pair.baseline ? `<details><summary>50% 重ね合わせ</summary><div class="overlay"><img loading="lazy" src="${escape(pair.baseline)}"><img loading="lazy" src="${escape(pair.candidate)}"></div></details>` : ''}</section>`).join('\n')}</html>`);
}

try {
    await mkdir(artifactDir, { recursive: true });
    candidateUrl = await serveDist(dist); await manifestAssets(dist, 'candidate');
    if (baselineDist) {
        assert.notEqual(dist, baselineDist, 'Baseline and candidate must be distinct actual build roots');
        baselineUrl = await serveDist(baselineDist); await manifestAssets(baselineDist, 'baseline');
    } else console.log('[INFO] FRACTION_LAB_BASELINE_ROOT unset: baseline comparison explicitly skipped. Candidate functionality and all four viewport sizes still run.');
    await writeJSON('asset-verification-before.json', await Promise.all([...manifests.keys()].map(verifyAssets)));
    browser = await chromium.launch({ headless: true });
    await writeJSON('run-metadata.json', { browser: 'Chromium', version: browser.version(), candidateDist: dist, baselineDist, viewports: VIEWPORTS,
        assertions: 'Actual build only; rendered DOM/native inputs/read-only DOM and CDP observations. No imported app runtime, exposed app state, forced app transitions or substituted local assets.',
        environment: { mainSuite: 'Only external-font routes and explicitly declared storage fixtures/failures; real time and normal native inputs',
            smoke: 'Four fresh contexts, network-loaded Japanese and symbol fonts, serviceWorkers allow, no routes/init scripts/clock hacks' },
        geometry: 'Initial anchors strict in both themes except measured header descendant geometry below 401px for verified header overlap. Outer header/nav/main remain strict. Scoped light-panel foreground contrast and semantic SVG colors documented.' });
    await layoutSuite(); await tabAndRangeSuite(); await compareSuite(); await arithmeticSuite(); await egyptSuite();
    await quizSuite(); await modalSuite(); await storageSuite(); await realFontsSmokeSuite(); await performanceSuite();
    if (failures.length) throw new AggregateError(failures, `Fraction Lab built E2E: ${failures.length}/${results.length} cases failed; see ${artifactDir}/results.json`);
    console.log(`[OK] Fraction Lab built E2E: ${results.length} cases passed. Screenshots, geometry, native-font smoke, allocation evidence and asset hashes: ${artifactDir}`);
} catch (error) {
    await writeJSON('run-error.json', { error: error.stack || String(error), completedCases: results.length }).catch(() => {});
    throw error;
} finally {
    // 途中の操作失敗でも、ビルド不変性と取得済み画像・実測値を必ず保存する。
    try {
        await writeJSON('asset-verification-after.json', await Promise.all([...manifests.keys()].map(verifyAssets)));
        await imageReview();
        await writeJSON('summary.json', { total: results.length, passed: results.filter(item => item.status === 'passed').length,
            failed: failures.length, baselineComparison: baselineDist ? 'requested' : 'explicitly skipped', artifactDir });
    } finally {
        await browser?.close();
        for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
}

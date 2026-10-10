import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 基準・候補とも npm run build の出力を渡す。Viteやpublicの代替配信は使わない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const artifactDir = path.join(root, 'visual-guard-artifacts', 'typing-dojo');
const KEYS = {
    preferences: 'typing_dojo_preferences', session: 'typing_dojo_session',
    stats: 'typing_dojo_stats', goal: 'typing_dojo_daily_goal',
    highscore: 'typing_dojo_highscore', tutorial: 'typing_dojo_tutorial_seen'
};
const NOW = '2026-01-08T12:00:01Z';
const VIEWPORTS = [
    { width: 320, height: 740 }, { width: 390, height: 844 },
    { width: 667, height: 375 }, { width: 1280, height: 900 }
];
const DEFAULT_PREFERENCES = { focusMode: false, soundEnabled: false, soundVolume: 60,
    autoResume: true, showRomajiHint: true, keyboardType: 'kana' };
const servers = [];
const results = [];
const failures = [];
let browser;
let candidateUrl;
let baselineUrl;

async function serveDist(input) {
    const directory = path.resolve(input);
    await access(path.join(directory, 'typing_dojo/index.html'));
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
    return `http://127.0.0.1:${server.address().port}/typing_dojo/`;
}

// HTMLから到達する実ファイルをハッシュ化し、後段で配信版との照合にも使えるようにする。
async function writeAssetManifest(directory, name) {
    const origin = 'http://typing-dojo-build.invalid';
    const pending = [new URL('/typing_dojo/index.html', origin)];
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
            for (const match of source.matchAll(/\b(?:import|export)\s*(?:[^;'"\n]*?\bfrom\s*)?["']([^"']+)["']/g)) references.push(match[1]);
            for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) references.push(match[1]);
        }
        for (const reference of references) {
            if (/^(?:data:|#)/.test(reference)) continue;
            const next = new URL(reference, url);
            if (next.origin === origin) pending.push(next);
        }
    }
    await writeFile(path.join(artifactDir, `${name}-asset-manifest.json`), `${JSON.stringify({
        entry: 'typing_dojo/index.html', algorithm: 'sha256', files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path))
    }, null, 2)}\n`);
}

// ブラウザー環境の境界だけを固定する。アプリの状態・関数を露出、呼び出し、置換しない。
function installEnvironment(options) {
    let seed = 0x51eed;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
    if (!sessionStorage.getItem('typing-dojo-e2e-seeded')) {
        for (const [key, value] of Object.entries(options.storage || {})) {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        }
        sessionStorage.setItem('typing-dojo-e2e-seeded', '1');
    }
    if (options.suppressBeforeUnload) window.addEventListener('beforeunload', event => event.stopImmediatePropagation(), { capture: true });
    if (options.denyStorage) {
        for (const method of ['getItem', 'setItem', 'removeItem']) {
            Storage.prototype[method] = () => { throw new DOMException('Test storage is denied', 'SecurityError'); };
        }
    } else if (options.quotaExceeded) {
        Storage.prototype.setItem = () => { throw new DOMException('Test storage quota is full', 'QuotaExceededError'); };
    }
}

function sessionFixture(overrides = {}) {
    return {
        savedAt: Date.parse(NOW), level: 'easy', mode: 'dojo', unitMode: 'word', charTraining: 'all',
        timeLeft: 90, score: 0, miss: 0, combo: 0, maxCombo: 0, typedChars: 0, elapsedSeconds: 0,
        currentWord: 'さくら', currentWordNormalized: 'さくら', activeRomajiPattern: 'sakura',
        hasMissedCurrent: false, isBonusWord: false, inputValue: '', words: ['さくら', 'りんご', 'みかん'],
        sentenceBuckets: null, recentWords: ['さくら'], totalWords: 1, dailyGoalTarget: 5,
        dailyGoalProgressAtStart: 0, ...overrides
    };
}

function withSession(overrides = {}, extra = {}) {
    return { ...extra, storage: { ...extra.storage, [KEYS.session]: JSON.stringify(sessionFixture(overrides)) } };
}

async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const context = await browser.newContext({ viewport, hasTouch: options.hasTouch !== false,
        colorScheme: 'light', reducedMotion: 'reduce', locale: 'ja-JP', timezoneId: 'UTC', serviceWorkers: 'block' });
    await context.addInitScript(installEnvironment, { ...options, storage: {
        [KEYS.tutorial]: '1', [KEYS.preferences]: JSON.stringify(DEFAULT_PREFERENCES), ...options.storage
    } });
    // 外部フォントの可否を比較へ混ぜず、アプリの実ビルド資産は必ず実配信から読む。
    await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    await context.route('https://fonts.gstatic.com/**', route => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    const requestFailures = [];
    const dialogs = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('response', response => {
        if (response.url().startsWith('http://127.0.0.1:') && response.status() >= 400) {
            requestFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
        }
    });
    page.on('requestfailed', request => {
        if (request.url().startsWith('http://127.0.0.1:')) {
            requestFailures.push(`${request.failure()?.errorText} ${new URL(request.url()).pathname}`);
        }
    });
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    await page.clock.install({ time: new Date('2026-01-08T12:00:00Z') });
    await page.clock.pauseAt(new Date(NOW));
    return { context, page, errors, requestFailures, dialogs, options };
}

async function ready(current, url = candidateUrl) {
    const response = await current.page.goto(url, { waitUntil: 'load' });
    assert.equal(response.status(), 200, '実ビルドの入口が正常に配信される');
    await current.page.locator('.goal-btn[aria-pressed="true"]').waitFor();
    await current.page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }' });
    await current.page.evaluate(() => document.fonts.ready);
    await current.page.clock.runFor(120);
    assert.equal(await current.page.locator('#start-screen').isVisible(), true);
}

async function screenshot(page, name) {
    await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true,
        animations: 'disabled', timeout: 10_000 });
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
        assert.deepEqual(current.dialogs, [], '予期しない警告がない');
        console.log(`[OK] Typing Dojo: ${name}`);
    } catch (error) {
        record.status = 'failed';
        record.error = error.stack || String(error);
        failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Typing Dojo: ${name}: ${error.message}`);
        if (current?.page) {
            try { await screenshot(current.page, `${name}-failure`); }
            catch (captureError) { record.screenshotError = captureError.message; }
        }
    } finally {
        record.durationMs = Date.now() - started;
        record.pageErrors = current?.errors || [];
        record.requestFailures = current?.requestFailures || [];
        record.dialogs = current?.dialogs || [];
        await current?.context.close();
        results.push(record);
        await writeFile(path.join(artifactDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
    }
}

const number = async (page, id) => Number(await page.locator(id).textContent());
const word = page => page.locator('#hiragana').textContent();
const hint = page => page.locator('#romaji-hint').textContent();
const overlayOpen = (page, name) => page.locator(`#${name}-overlay`).getAttribute('aria-hidden').then(value => value === 'false');
const focused = (page, selector) => page.locator(selector).evaluate(node => node === document.activeElement);
async function assertScreen(page, name) {
    assert.equal(await page.locator('.screen.active').count(), 1, '画面は一つだけ選択される');
    assert.equal(await page.locator(`#${name}-screen`).isVisible(), true, `${name}画面を表示する`);
}
async function assertFocused(page, selector) {
    assert.equal(await focused(page, selector), true, `${selector}へフォーカスする`);
}
async function dismissTutorial(page) {
    if (await overlayOpen(page, 'tutorial')) await page.locator('#tutorial-skip-btn').click();
}
async function start(page, { level = 'easy', mode, unit, training } = {}) {
    await dismissTutorial(page);
    if (mode) await page.locator(`[data-mode="${mode}"]`).click();
    if (unit) await page.locator(`[data-unit="${unit}"]`).click();
    if (training) await page.locator(`[data-char-training="${training}"]`).click();
    await page.locator(`[data-level="${level}"]`).click();
    assert.equal(await overlayOpen(page, 'countdown'), true);
    await page.clock.runFor(4120);
    await assertScreen(page, 'game');
    assert.equal(await overlayOpen(page, 'countdown'), false);
    assert.equal(await page.locator('#input').isEnabled(), true);
    await assertFocused(page, '#input');
}
async function restore(page) {
    await dismissTutorial(page);
    assert.equal(await page.locator('#resume-card').isVisible(), true, '有効な中断セッションを提示する');
    await page.locator('#resume-session-btn').click();
    await page.clock.runFor(120);
    await assertScreen(page, 'game');
    assert.equal(await overlayOpen(page, 'countdown'), false);
    await assertFocused(page, '#input');
}
async function counters(page) {
    return { score: await number(page, '#score'), miss: await number(page, '#miss'),
        combo: await number(page, '#combo'), timer: await number(page, '#timer'),
        input: await page.locator('#input').inputValue(), word: await word(page) };
}
async function stationary(page, milliseconds = 5000) {
    const before = await counters(page);
    await page.clock.runFor(milliseconds);
    assert.deepEqual(await counters(page), before, '中断中の古い入力・タイマーを進めない');
}
async function completeCurrentWord(page) {
    const before = await number(page, '#score');
    const target = (await hint(page)).trim();
    assert.match(target, /^[a-z-]+$/, '表示ヒントだけを使って解答する');
    const input = await page.locator('#input').inputValue();
    assert.ok(target.startsWith(input));
    await page.locator('#input').focus();
    await page.keyboard.type(target.slice(input.length));
    assert.equal(await number(page, '#score'), before + 1, '一語を一度だけ正解にする');
}
async function finish(page) {
    const seconds = await number(page, '#timer');
    assert.ok(Number.isFinite(seconds) && seconds >= 0 && seconds < 3600, '表示タイマーが有限');
    await page.clock.runFor(seconds * 1000 + 200);
    await assertScreen(page, 'result');
    await assertFocused(page, '#retry-btn');
}

async function layoutSnapshot(page) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(1, 1);
    return page.evaluate(() => {
        const round = value => Math.round(value * 100) / 100;
        const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
        // ダイアログの命名用に追加したIDだけ、従来と同じ構造キーで対応づける。
        // 要素自体は省略せず、文言・スタイル・幾何を引き続きすべて比較する。
        const ariaHeadingIds = new Set(['settings-title', 'tutorial-title', 'pause-title']);
        const key = node => {
            if (node.id && !ariaHeadingIds.has(node.id)) return `#${node.id}`;
            if (node === document.body) return 'body';
            const peers = [...node.parentElement.children].filter(peer => peer.tagName === node.tagName);
            return `${key(node.parentElement)}>${node.tagName.toLowerCase()}:nth-of-type(${peers.indexOf(node) + 1})`;
        };
        const properties = ['display', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
            'letterSpacing', 'color', 'backgroundColor', 'borderTopColor', 'borderTopWidth', 'borderRadius',
            'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight',
            'marginBottom', 'marginLeft', 'gap', 'gridTemplateColumns', 'flexDirection', 'alignItems',
            'justifyContent', 'textAlign', 'boxShadow', 'overflowX', 'overflowY'];
        const nodes = [...document.querySelectorAll('body, body *')].flatMap(node => {
            if (['SCRIPT', 'STYLE', 'LINK', 'META'].includes(node.tagName)) return [];
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            const region = node.closest('.settings-card, .tutorial-card, .pause-content');
            const regionRect = region?.getBoundingClientRect();
            if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none') return [];
            return [{ key: key(node), overlayRegion: region ? region.className : null, overlayCard: node === region,
                overlayHeight: regionRect?.height || null, text: normalize([...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join(' ')),
                box: { x: round(rect.x + scrollX), y: round(rect.y + scrollY), width: round(rect.width), height: round(rect.height) },
                style: Object.fromEntries(properties.map(property => [property, style[property]])),
                semantics: { role: node.getAttribute('role'), label: node.getAttribute('aria-label'),
                    hidden: node.getAttribute('aria-hidden'), pressed: node.getAttribute('aria-pressed'),
                    disabled: node.disabled ?? null, checked: node.checked ?? null },
                value: node instanceof HTMLInputElement || node instanceof HTMLSelectElement ? node.value : null }];
        });
        return { viewport: { width: innerWidth, height: innerHeight }, width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight, text: normalize(document.body.innerText),
            activeElement: document.activeElement?.id || document.activeElement?.tagName, nodes };
    });
}

function contrastRatio(foreground, background) {
    const luminance = color => {
        const components = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722;
    };
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function compareLayout(actual, expected, name) {
    const differences = [];
    if (actual.text !== expected.text) differences.push({ property: 'page.text', previous: expected.text, actual: actual.text });
    for (const property of ['width', 'height']) {
        if (Math.abs(actual[property] - expected[property]) > 1) differences.push({ property: `page.${property}`, previous: expected[property], actual: actual[property] });
    }
    const expectedNodes = new Map(expected.nodes.map(node => [node.key, node]));
    const actualNodes = new Map(actual.nodes.map(node => [node.key, node]));
    for (const [key, previous] of expectedNodes) {
        const received = actualNodes.get(key);
        if (!received) { differences.push({ key, property: 'missing' }); continue; }
        for (const property of ['text', 'value']) {
            if (received[property] !== previous[property]) differences.push({ key, property, previous: previous[property], actual: received[property] });
        }
        for (const property of Object.keys(previous.style)) {
            if (received.style[property] !== previous.style[property]) differences.push({ key, property: `style.${property}`, previous: previous.style[property], actual: received.style[property] });
        }
        for (const property of ['x', 'y', 'width', 'height']) {
            if (Math.abs(received.box[property] - previous.box[property]) > 1) differences.push({ key, property: `box.${property}`, previous: previous.box[property], actual: received.box[property] });
        }
    }
    for (const key of actualNodes.keys()) if (!expectedNodes.has(key)) differences.push({ key, property: 'added' });
    // 修正前に縦方向へ切れていたカードだけ、スクロール化に伴う幾何変化を明示して記録する。
    // 文言、色、フォント、余白、および無関係な画面の差分を免除しない。
    const allowedBugFixDifferences = [];
    const unexpected = differences.filter(diff => {
        const previous = expectedNodes.get(diff.key);
        const received = actualNodes.get(diff.key);
        if (!previous || !received || !previous.overlayRegion) return true;
        if (diff.key === '#keyboard-type-select' && diff.property === 'style.color' &&
            contrastRatio(previous.style.color, previous.style.backgroundColor) < 4.5 &&
            contrastRatio(received.style.color, received.style.backgroundColor) >= 4.5) {
            allowedBugFixDifferences.push({ ...diff, reason: '白背景へ白い文字を継承していた選択欄の可読性を修正' });
            return false;
        }
        const clipped = previous.overlayHeight > expected.viewport.height - (previous.overlayRegion.includes('pause-content') ? 0 : 32) + 1;
        const explicitScroll = previous.overlayCard && diff.property === 'style.overflowY' && diff.actual === 'auto';
        const dependentOverflow = previous.overlayCard && diff.property === 'style.overflowX' && diff.actual === 'auto';
        const clippedGeometry = clipped && (/^box\./.test(diff.property) || diff.property === 'style.gridTemplateColumns');
        if (explicitScroll || dependentOverflow || clippedGeometry) {
            allowedBugFixDifferences.push({ ...diff, reason: '既存の短い画面で切れるオーバーレイをスクロール可能にする修正' });
            return false;
        }
        return true;
    });
    // ARIA・フォーカスの不具合修正は描画と別に記録し、挙動シナリオで厳密に確認する。
    return { name, differences: unexpected, allowedBugFixDifferences };
}

async function layoutSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`layout-${viewport.width}x${viewport.height}`, async (page, record) => {
            const baseline = baselineUrl ? await createCase(viewport) : null;
            record.states = [];
            const comparisons = [];
            try {
                if (baseline) await ready(baseline, baselineUrl);
                const pages = [page, baseline?.page].filter(Boolean);
                for (const state of ['initial', 'settings', 'tutorial', 'countdown', 'game', 'pause', 'result']) {
                    for (const target of pages) {
                        if (state === 'settings') await target.locator('#open-settings-btn').click();
                        if (state === 'tutorial') {
                            await target.keyboard.press('Escape');
                            await target.locator('#open-tutorial-btn').click();
                        }
                        if (state === 'countdown') {
                            await target.locator('#tutorial-skip-btn').click();
                            await target.locator('[data-level="easy"]').click();
                        }
                        if (state === 'game') await target.clock.runFor(4000);
                        if (state === 'pause') await target.locator('#pause-btn').click();
                        if (state === 'result') {
                            await target.locator('#resume-btn').click();
                            await target.clock.runFor(90_200);
                        }
                        // タイマーの位相は両版で同じに保つ。
                        await target.clock.runFor(120);
                    }
                    const label = `${viewport.width}x${viewport.height}-${state}`;
                    const actual = await layoutSnapshot(page);
                    const expected = baseline ? await layoutSnapshot(baseline.page) : null;
                    await writeFile(path.join(artifactDir, `${label}-geometry.json`), `${JSON.stringify({ candidate: actual, baseline: expected }, null, 2)}\n`);
                    await screenshot(page, `${label}-candidate`);
                    if (baseline) {
                        await screenshot(baseline.page, `${label}-baseline`);
                        const comparison = compareLayout(actual, expected, label);
                        comparisons.push(comparison);
                    }
                    record.states.push({ state, measuredElements: actual.nodes.length });
                }
                record.baselineComparison = baseline ? 'compared' : 'skipped: TYPING_DOJO_BASELINE_ROOT is unset';
                record.comparisons = comparisons;
                await writeFile(path.join(artifactDir, `${viewport.width}x${viewport.height}-comparison.json`), `${JSON.stringify(comparisons, null, 2)}\n`);
                assert.deepEqual(comparisons.flatMap(item => item.differences.map(diff => ({ state: item.name, ...diff }))), [], '基準版のレイアウト・文言を維持する');
                if (baseline) {
                    assert.deepEqual(baseline.errors, [], '基準版の未処理例外がない');
                    assert.deepEqual(baseline.requestFailures, [], '基準版の資産が欠けていない');
                }
            } finally { await baseline?.context.close(); }
        }, {}, viewport);
    }
}

// 操作対象の祖先クリップと中央ヒット領域を検査し、forceやDOM clickに頼らない。
async function reachable(page, selector, record, { click = false } = {}) {
    const control = page.locator(selector);
    if (selector === '#keyboard-type-select') {
        const colors = await control.evaluate(node => ({ color: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }));
        assert.ok(contrastRatio(colors.color, colors.background) >= 4.5, 'キーボード選択欄の文字を背景と判別できる');
    }
    await control.scrollIntoViewIfNeeded();
    await control.click({ trial: true });
    const measurement = await control.evaluate(node => {
        const rect = node.getBoundingClientRect();
        const clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            const box = parent.getBoundingClientRect();
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) {
                clip.left = Math.max(clip.left, box.left + parent.clientLeft);
                clip.right = Math.min(clip.right, box.left + parent.clientLeft + parent.clientWidth);
            }
            if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) {
                clip.top = Math.max(clip.top, box.top + parent.clientTop);
                clip.bottom = Math.min(clip.bottom, box.top + parent.clientTop + parent.clientHeight);
            }
        }
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { box: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
            width: rect.width, height: rect.height }, clip, hit: node === hit || node.contains(hit) };
    });
    record.actions ||= [];
    record.actions.push({ selector, ...measurement });
    const { box, clip } = measurement;
    assert.ok(box.width > 0 && box.height > 0 && box.left >= clip.left - 1.5 && box.right <= clip.right + 1.5 &&
        box.top >= clip.top - 1.5 && box.bottom <= clip.bottom + 1.5, `${selector}: 操作対象全体が見える ${JSON.stringify(measurement)}`);
    assert.equal(measurement.hit, true, `${selector}: 他の要素が操作を遮らない`);
    if (click) await control.click();
}

async function reachabilitySuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`reachable-controls-${viewport.width}x${viewport.height}`, async (page, record) => {
            for (const selector of ['[data-goal="20"]', '[data-mode="focus60"]', '[data-unit="ultra-beginner"]',
                '[data-char-training="choon"]', '#open-settings-btn']) await reachable(page, selector, record, { click: true });
            await page.clock.runFor(80);
            for (const selector of ['#romaji-hint-toggle', '#focus-mode-toggle', '#keyboard-type-select',
                '#sound-toggle', '#sound-volume', '#auto-resume-toggle', '#close-settings-btn']) await reachable(page, selector, record);
            await screenshot(page, `settings-controls-${viewport.width}x${viewport.height}`);
            await page.locator('#close-settings-btn').click();
            await page.locator('[data-char-training="all"]').click();
            await start(page);
            await reachable(page, '#input', record);
            for (const selector of ['#open-settings-btn-game', '#pause-btn', '#quit-btn']) await reachable(page, selector, record);
            await page.locator('#pause-btn').click();
            await page.clock.runFor(60);
            await reachable(page, '#resume-btn', record);
            await reachable(page, '#quit-from-pause-btn', record);
            await screenshot(page, `pause-controls-${viewport.width}x${viewport.height}`);
            await page.locator('#resume-btn').click();
            await finish(page);
            for (const selector of ['#retry-btn', '#home-btn']) await reachable(page, selector, record);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, '横スクロールを必要としない');
        }, {}, viewport);
    }
}

async function tutorialSuite() {
    await runCase('tutorial-first-visit-focus-and-manual-progress', async page => {
        assert.equal(await overlayOpen(page, 'tutorial'), true);
        await assertFocused(page, '#tutorial-next-btn');
        await page.keyboard.press('Shift+Tab');
        await assertFocused(page, '#tutorial-skip-btn');
        await page.keyboard.press('Tab');
        await assertFocused(page, '#tutorial-next-btn');
        await page.locator('#tutorial-next-btn').click();
        assert.equal(await page.locator('#tutorial-step-title').textContent(), '特殊入力');
        await page.clock.runFor(1200);
        assert.equal(await page.locator('#tutorial-step-title').textContent(), '特殊入力', '手動で進んだ説明がタイマーで後戻りしない');
        await page.locator('#tutorial-next-btn').click();
        assert.equal(await page.locator('#tutorial-step-title').textContent(), 'ボーナスと目標');
        await page.locator('#tutorial-next-btn').click();
        assert.equal(await overlayOpen(page, 'tutorial'), false);
        await page.reload({ waitUntil: 'load' });
        await page.clock.runFor(120);
        assert.equal(await overlayOpen(page, 'tutorial'), false, '完了済みガイドを再び自動表示しない');
        await assertFocused(page, '.btn-normal');
    }, { storage: { [KEYS.tutorial]: null } });

    await runCase('tutorial-auto-progress-and-reopen-cancels-old-timer', async page => {
        await page.locator('#open-tutorial-btn').click();
        await page.clock.runFor(10_100);
        assert.equal(await page.locator('#tutorial-step-title').textContent(), '特殊入力');
        await page.clock.runFor(10_000);
        assert.equal(await page.locator('#tutorial-step-title').textContent(), 'ボーナスと目標');
        await page.clock.runFor(10_000);
        assert.equal(await overlayOpen(page, 'tutorial'), false);
        await assertFocused(page, '#open-tutorial-btn');
        await page.locator('#open-tutorial-btn').click();
        await page.clock.runFor(5000);
        await page.keyboard.press('Escape');
        await page.locator('#open-tutorial-btn').click();
        await page.clock.runFor(6000);
        assert.equal(await page.locator('#tutorial-step-title').textContent(), '基本ルール', '閉じた説明のタイマーが次のガイドへ混ざらない');
        await page.locator('#tutorial-skip-btn').click();
        await page.clock.runFor(30_000);
        assert.equal(await overlayOpen(page, 'tutorial'), false);
        await assertScreen(page, 'start');
    });
}

async function inputSuite() {
    await runCase('physical-letters-selection-backspace-and-single-miss', async page => {
        await restore(page);
        await page.keyboard.press('s');
        assert.equal(await page.locator('#input').inputValue(), 's');
        assert.equal(await number(page, '#miss'), 0);
        await page.keyboard.press('a');
        await page.keyboard.press('Control+a');
        await page.keyboard.press('s');
        assert.equal(await page.locator('#input').inputValue(), 's', '選択範囲を置き換える');
        assert.equal(await number(page, '#miss'), 0, '置換を末尾入力として誤判定しない');
        await page.keyboard.press('a');
        await page.keyboard.press('k');
        await page.keyboard.press('Backspace');
        assert.equal(await page.locator('#input').inputValue(), 'sa');
        assert.equal(await number(page, '#miss'), 0, '修正操作を誤入力として数えない');
        await page.keyboard.press('z');
        assert.equal(await number(page, '#miss'), 1, '一つの物理キーを一度だけミスにする');
        assert.equal(await page.locator('#input').inputValue(), 'sa');
        await page.keyboard.type('kura');
        assert.equal(await number(page, '#score'), 1);
        assert.equal(await number(page, '#miss'), 1);
        assert.equal(await number(page, '#combo'), 1);
        assert.equal(await number(page, '#timer'), 92, 'ミスありの既存ボーナス2秒を維持する');
        assert.equal(await page.locator('#word-count').textContent(), '1問クリア');
        assert.equal(await page.locator('#goal-status').textContent(), '1/5');
        await finish(page);
        assert.equal(await number(page, '#result-score'), 1);
        assert.equal(await number(page, '#result-miss'), 1);
        assert.equal(await page.locator('#result-accuracy').textContent(), '50%');
        assert.equal(await page.locator('#review-section').isVisible(), true);
        assert.equal(await page.locator('#review-count').textContent(), '1');
    }, withSession({}, { hasTouch: false }));

    await runCase('physical-hyphen-preserves-vowel-long-mark-contract', async page => {
        await restore(page);
        await page.keyboard.type('su');
        await page.keyboard.press('-');
        assert.equal(await page.locator('#input').inputValue(), 'su', '既存仕様どおりハイフンは入力対象外');
        assert.equal(await number(page, '#miss'), 0);
        await page.keyboard.type('upaa');
        assert.equal(await number(page, '#score'), 1, '長音は既存の母音重ね入力で正解になる');
        assert.equal(await number(page, '#timer'), 93);
    }, withSession({ currentWord: 'すーぱー', currentWordNormalized: 'すーぱー', activeRomajiPattern: 'suupaa' }, { hasTouch: false }));

    await runCase('physical-repeat-letter-and-unfocused-recovery', async page => {
        await restore(page);
        await page.locator('#hiragana').click();
        await page.keyboard.press('g');
        assert.equal(await page.locator('#input').inputValue(), 'g', '入力欄以外からの物理文字を一度だけ取り込む');
        await assertFocused(page, '#input');
        await page.keyboard.press('a');
        await page.keyboard.down('k');
        await page.keyboard.down('k');
        await page.keyboard.up('k');
        assert.equal(await page.locator('#input').inputValue(), 'gakk', '同じ文字のrepeatイベントでも正しい促音を入力できる');
        await page.keyboard.type('ou');
        assert.equal(await number(page, '#score'), 1);
        assert.equal(await number(page, '#miss'), 0);
    }, withSession({ currentWord: 'がっこう', currentWordNormalized: 'がっこう', activeRomajiPattern: 'gakkou' }, { hasTouch: false }));

    await runCase('ime-native-composition-is-atomic', async (page, record, current) => {
        await restore(page);
        const cdp = await current.context.newCDPSession(page);
        // ChromiumのIME境界で実composition/inputイベントを発生させる。
        await cdp.send('Input.imeSetComposition', { text: 'さ', selectionStart: 1, selectionEnd: 1 });
        assert.equal(await page.locator('#input').inputValue(), 'さ', '未確定かなを書き換えない');
        assert.equal(await number(page, '#miss'), 0);
        await cdp.send('Input.imeSetComposition', { text: 'さくら', selectionStart: 3, selectionEnd: 3 });
        assert.equal(await number(page, '#score'), 0, '変換候補の段階では採点しない');
        assert.equal(await page.locator('#input').inputValue(), 'さくら');
        await cdp.send('Input.insertText', { text: 'さくら' });
        assert.equal(await number(page, '#score'), 1, 'compositionendと直後inputで二重加算しない');
        assert.equal(await number(page, '#miss'), 0);
        assert.equal(await page.locator('#input').inputValue(), '');
        const after = await counters(page);
        await page.locator('#input').dispatchEvent('input', { inputType: 'insertCompositionText', data: 'さくら', isComposing: false });
        assert.deepEqual(await counters(page), after, '遅れて届く同じ確定通知を再採点しない');
        await screenshot(page, 'ime-committed-once');
        await cdp.detach();
    }, withSession());

    await runCase('ime-cancel-and-plain-kana-commit', async (page, record, current) => {
        await restore(page);
        const cdp = await current.context.newCDPSession(page);
        await cdp.send('Input.imeSetComposition', { text: '誤変換', selectionStart: 3, selectionEnd: 3 });
        assert.equal(await number(page, '#miss'), 0, '未確定の漢字候補をミス扱いしない');
        await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
        assert.equal(await page.locator('#input').inputValue(), '');
        assert.equal(await number(page, '#miss'), 0, 'IMEキャンセルをミス扱いしない');
        await page.keyboard.insertText('サクラ');
        assert.equal(await number(page, '#score'), 1, '確定カタカナの貼り付けも同じかなとして採点する');
        assert.equal(await number(page, '#miss'), 0);
        await cdp.detach();
    }, withSession());

    await runCase('alternate-romaji-progress-and-completion', async page => {
        await restore(page);
        await page.keyboard.type('shi');
        assert.equal(await page.locator('#input').inputValue(), 'shi');
        assert.match(await hint(page), /^shi/);
        await page.keyboard.type('nnbun');
        // 語尾んは一つのnでも確定する既存仕様なので、最後のキーを次語へ送らない。
        assert.equal(await number(page, '#score'), 1);
    }, withSession({ currentWord: 'しんぶん', currentWordNormalized: 'しんぶん', activeRomajiPattern: 'sinbun' }));
}

async function settingsSuite() {
    await runCase('settings-persistence-zero-volume-and-focus-trap', async page => {
        await page.locator('#open-settings-btn').click();
        await page.clock.runFor(60);
        await assertFocused(page, '#romaji-hint-toggle');
        await page.keyboard.press('Shift+Tab');
        await assertFocused(page, '#close-settings-btn');
        await page.keyboard.press('Tab');
        await assertFocused(page, '#romaji-hint-toggle');
        await page.locator('#romaji-hint-toggle').uncheck();
        await page.locator('#focus-mode-toggle').check();
        await page.locator('#sound-toggle').uncheck();
        await page.locator('#sound-volume').focus();
        await page.keyboard.press('Home');
        assert.equal(await page.locator('#sound-volume').inputValue(), '0');
        await page.locator('#auto-resume-toggle').uncheck();
        await page.locator('#keyboard-type-select').selectOption('romaji');
        await page.keyboard.press('Escape');
        assert.equal(await overlayOpen(page, 'settings'), false);
        await assertFocused(page, '#open-settings-btn');
        await page.reload({ waitUntil: 'load' });
        await page.clock.runFor(120);
        await page.locator('#open-settings-btn').click();
        assert.equal(await page.locator('#romaji-hint-toggle').isChecked(), false);
        assert.equal(await page.locator('#focus-mode-toggle').isChecked(), true);
        assert.equal(await page.locator('#sound-toggle').isChecked(), false);
        assert.equal(await page.locator('#sound-volume').inputValue(), '0', '音量0を再読込後も維持する');
        assert.equal(await page.locator('#auto-resume-toggle').isChecked(), false);
        assert.equal(await page.locator('#keyboard-type-select').inputValue(), 'romaji');
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('focus-mode')), true);
        await page.keyboard.press('Escape');
        await start(page);
        assert.match(await hint(page), /^[_ ]+$/, 'ヒント非表示の設定が出題へ反映される');
        assert.equal(await page.locator('#touch-keyboard').isVisible(), true);
        assert.equal(await page.locator('#input').getAttribute('inputmode'), 'none');
    });

    await runCase('settings-game-suspends-time-and-keyboard-shortcuts', async page => {
        await restore(page);
        await page.keyboard.type('sa');
        await page.locator('#open-settings-btn-game').click();
        await page.clock.runFor(60);
        const before = await counters(page);
        assert.equal(await overlayOpen(page, 'settings'), true);
        const checked = await page.locator('#romaji-hint-toggle').isChecked();
        await page.locator('#romaji-hint-toggle').focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#romaji-hint-toggle').isChecked(), !checked, '設定上のスペースを通常のチェック操作として扱う');
        await page.keyboard.type('sakura');
        await page.clock.runFor(10_000);
        assert.deepEqual(await counters(page), before, '設定中の文字キーと経過時間をゲームへ送らない');
        assert.equal(await overlayOpen(page, 'settings'), true);
        await page.keyboard.press('Escape');
        await page.clock.runFor(100);
        assert.equal(await overlayOpen(page, 'settings'), false);
        assert.equal(await overlayOpen(page, 'pause'), false, '設定で自動停止した場合は閉じると再開する');
        await assertFocused(page, '#input');
        await page.clock.runFor(1000);
        assert.equal(await number(page, '#timer'), before.timer - 1, '再開後は1秒に1回だけ進む');
        await page.keyboard.type('kura');
        assert.equal(await number(page, '#score'), 1);
    }, withSession());

    // 一時停止オーバーレイは実操作で背面の設定を開けない。テストも強制クリックで突破しない。
    await runCase('paused-modal-focus-and-backdrop-resume', async page => {
        await restore(page);
        await page.locator('#pause-btn').click();
        await page.clock.runFor(60);
        await assertFocused(page, '#resume-btn');
        assert.equal(await page.locator('#input').isDisabled(), true);
        await page.keyboard.press('Shift+Tab');
        await assertFocused(page, '#quit-from-pause-btn');
        await page.keyboard.press('Tab');
        await assertFocused(page, '#resume-btn');
        await page.keyboard.type('sakura');
        await stationary(page);
        assert.equal(await number(page, '#score'), 0);
        await page.mouse.click(1, 1);
        assert.equal(await overlayOpen(page, 'pause'), false);
        await assertFocused(page, '#input');
        await page.clock.runFor(1000);
        assert.equal(await number(page, '#timer'), 89);
    }, withSession());
}

// ページ可視性はブラウザー境界で再現する。アプリ内部状態は読まない・書かない。
async function visibilityBoundary(page, hidden) {
    await page.evaluate(hidden => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
}

async function lifecycleSuite() {
    await runCase('countdown-sequence-escape-and-clean-restart', async page => {
        await page.locator('[data-level="easy"]').click();
        await assertFocused(page, '#countdown-overlay');
        assert.equal(await page.locator('#countdown-number').textContent(), '3');
        await page.clock.runFor(1000);
        assert.equal(await page.locator('#countdown-number').textContent(), '2');
        await page.keyboard.type('sakura');
        assert.equal(await number(page, '#score'), 0);
        await page.keyboard.press('Escape');
        await assertScreen(page, 'start');
        assert.equal(await overlayOpen(page, 'countdown'), false);
        await page.clock.runFor(5000);
        await assertScreen(page, 'start');
        await start(page, { mode: 'focus60' });
        assert.equal(await number(page, '#timer'), 60);
        await page.clock.runFor(3000);
        assert.equal(await number(page, '#timer'), 57, 'キャンセルしたカウントダウンから二重タイマーを作らない');
    });

    await runCase('visibility-countdown-cannot-start-behind-hidden-page', async page => {
        await page.locator('[data-level="easy"]').click();
        await page.clock.runFor(1100);
        const count = await page.locator('#countdown-number').textContent();
        await visibilityBoundary(page, true);
        await page.clock.runFor(10_000);
        assert.equal(await overlayOpen(page, 'countdown'), true);
        assert.equal(await page.locator('#countdown-number').textContent(), count, '非表示中に開始前カウントを進めない');
        await visibilityBoundary(page, false);
        await page.clock.runFor(4000);
        assert.equal(await overlayOpen(page, 'countdown'), false);
        await assertScreen(page, 'game');
        assert.ok(await number(page, '#timer') >= 88, '非表示だった時間を新セッションへ課さない');
        await page.locator('#quit-btn').click();
    });

    await runCase('visibility-running-pauses-and-does-not-auto-resume', async page => {
        await restore(page);
        await page.keyboard.type('sa');
        await visibilityBoundary(page, true);
        await page.clock.runFor(60);
        assert.equal(await overlayOpen(page, 'pause'), true);
        await stationary(page, 10_000);
        await visibilityBoundary(page, false);
        assert.equal(await overlayOpen(page, 'pause'), true, '戻っただけで不意にゲームを再開しない');
        await page.locator('#resume-btn').click();
        await page.clock.runFor(1000);
        assert.equal(await number(page, '#timer'), 89);
        await page.keyboard.type('kura');
        assert.equal(await number(page, '#score'), 1);
    }, withSession());

    await runCase('held-space-only-toggles-once-and-quit-does-not-score', async page => {
        await restore(page);
        await page.keyboard.down('Space');
        await page.clock.runFor(60);
        assert.equal(await overlayOpen(page, 'pause'), true);
        await page.keyboard.down('Space');
        await page.keyboard.down('Space');
        assert.equal(await overlayOpen(page, 'pause'), true, '長押しrepeatで何度も再開しない');
        await page.keyboard.up('Space');
        assert.equal(await overlayOpen(page, 'pause'), true, 'フォーカス移動後のkeyupで再開ボタンを誤クリックしない');
        await page.keyboard.press('Space');
        await assertFocused(page, '#input');
        assert.equal(await overlayOpen(page, 'pause'), false);
        await completeCurrentWord(page);
        await page.keyboard.down('Escape');
        await page.keyboard.down('Escape');
        await page.keyboard.up('Escape');
        await assertScreen(page, 'start');
        await page.clock.runFor(120_000);
        await assertScreen(page, 'start');
        assert.equal(await page.locator('#resume-card').isVisible(), false);
        await page.reload({ waitUntil: 'load' });
        await page.clock.runFor(120);
        assert.equal(await page.locator('#resume-card').isVisible(), false, 'やめたセッションを復元しない');
        assert.equal(await page.locator('#streak-badge').textContent(), '連続: 0日', '中断を完了履歴へ記録しない');
    }, withSession());

    await runCase('result-completion-once-retry-review-and-home', async page => {
        await restore(page);
        await page.keyboard.press('z');
        await completeCurrentWord(page);
        await finish(page);
        assert.equal(await number(page, '#result-score'), 1);
        assert.equal(await number(page, '#result-miss'), 1);
        assert.equal(await number(page, '#result-max-combo'), 1);
        assert.equal(await page.locator('#review-count').textContent(), '1');
        assert.equal(await page.locator('#result-highscore').textContent(), '🏆 新記録！');
        assert.equal(await page.locator('#growth-chart path').count(), 3);
        const result = await page.locator('#result-screen').innerText();
        await page.clock.runFor(120_000);
        assert.equal(await page.locator('#result-screen').innerText(), result, '完了後のタイマーが結果を二重更新しない');
        await screenshot(page, 'completed-result-and-review');
        await page.locator('#review-btn').click();
        await page.clock.runFor(4120);
        assert.equal(await word(page), 'さくら', '間違えた語を実際に復習する');
        await completeCurrentWord(page);
        assert.equal(await number(page, '#miss'), 0);
        await finish(page);
        await page.locator('#retry-btn').click();
        await page.clock.runFor(4120);
        assert.equal(await number(page, '#score'), 0);
        assert.equal(await number(page, '#miss'), 0);
        await finish(page);
        await page.locator('#home-btn').click();
        await assertScreen(page, 'start');
        assert.equal(await page.locator('#streak-badge').textContent(), '連続: 1日');
        await page.reload({ waitUntil: 'load' });
        await page.clock.runFor(120);
        assert.equal(await page.locator('#streak-badge').textContent(), '連続: 1日');
        assert.equal(await page.locator('#resume-card').isVisible(), false);
    }, withSession());
}

async function parentsSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`parents-modal-close-${viewport.width}x${viewport.height}`, async (page, record) => {
            const trigger = '[data-action="parents-modal-open"]';
            for (const close of ['escape', 'button', 'backdrop']) {
                await page.locator(trigger).click();
                await page.clock.runFor(120);
                assert.equal(await page.locator('#parents-modal').isVisible(), true);
                assert.equal(await page.locator(trigger).getAttribute('aria-expanded'), 'true');
                assert.equal(await page.locator('#parents-modal').evaluate(node => node.contains(document.activeElement)), true);
                await reachable(page, '#parents-modal [data-action="parents-modal-close"][aria-label="閉じる"]', record);
                if (close === 'escape') await page.keyboard.press('Escape');
                if (close === 'button') await page.locator('#parents-modal [data-action="parents-modal-close"][aria-label="閉じる"]').click();
                if (close === 'backdrop') await page.mouse.click(1, 1);
                await page.clock.runFor(120);
                assert.equal(await page.locator('#parents-modal').isVisible(), false);
                assert.equal(await page.locator(trigger).getAttribute('aria-expanded'), 'false');
                await assertFocused(page, trigger);
            }
        }, {}, viewport);
    }
}

async function touchSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`touch-romaji-real-taps-${viewport.width}x${viewport.height}`, async (page, record) => {
            await restore(page);
            assert.equal(await page.locator('#touch-keyboard').isVisible(), true);
            assert.equal(await page.locator('#input').getAttribute('inputmode'), 'none');
            const key = letter => page.locator('#touch-keyboard').getByRole('button', { name: letter.toUpperCase(), exact: true });
            await key('s').tap();
            assert.equal(await page.locator('#input').inputValue(), 's', 'touchstart/clickを二重入力しない');
            await key('a').tap();
            await key('k').tap();
            await page.keyboard.press('Shift+ArrowLeft');
            await page.locator('#touch-keyboard').getByRole('button', { name: 'バックスペース', exact: true }).tap();
            assert.equal(await page.locator('#input').inputValue(), 'sa', 'タッチの削除も選択範囲を尊重する');
            await page.keyboard.press('Control+a');
            await key('s').tap();
            assert.equal(await page.locator('#input').inputValue(), 's', 'タッチ入力も選択範囲を置き換える');
            for (const letter of 'akura') await key(letter).tap();
            assert.equal(await number(page, '#score'), 1);
            assert.equal(await number(page, '#miss'), 0);
            await screenshot(page, `touch-romaji-${viewport.width}x${viewport.height}`);
            const keys = page.locator('#touch-keyboard button');
            for (let row = 1; row <= 3; row++) {
                await reachable(page, `#touch-keyboard .touch-keyboard-row:nth-child(${row}) button:first-child`, record);
                await reachable(page, `#touch-keyboard .touch-keyboard-row:nth-child(${row}) button:last-child`, record);
            }
            for (let index = 0; index < await keys.count(); index++) {
                // すべての文字キーを実DOMの箱で記録する。次の語へ無関係な文字は送らない。
                const box = await keys.nth(index).boundingBox();
                assert.ok(box && box.width > 0 && box.height > 0);
            }
            await page.locator('#open-settings-btn-game').click();
            await page.locator('#keyboard-type-select').selectOption('kana');
            await page.locator('#close-settings-btn').click();
            assert.equal(await page.locator('#touch-keyboard').isVisible(), false);
            assert.equal(await page.locator('#input').getAttribute('inputmode'), 'text');
        }, withSession({}, { storage: { [KEYS.preferences]: JSON.stringify({ ...DEFAULT_PREFERENCES, keyboardType: 'romaji' }) } }), viewport);
    }

    await runCase('touch-kana-native-input-and-live-keyboard-switch', async page => {
        await restore(page);
        assert.equal(await page.locator('#touch-keyboard').isVisible(), false);
        assert.equal(await page.locator('#input').getAttribute('inputmode'), 'text');
        await page.keyboard.insertText('さ');
        assert.equal(await page.locator('#input').inputValue(), 'sa');
        await page.keyboard.insertText('くら');
        assert.equal(await number(page, '#score'), 1);
        await page.locator('#open-settings-btn-game').click();
        await page.locator('#keyboard-type-select').selectOption('romaji');
        await page.locator('#close-settings-btn').click();
        assert.equal(await page.locator('#touch-keyboard').isVisible(), true);
        assert.equal(await page.locator('#input').getAttribute('inputmode'), 'none');
        await page.locator('#quit-btn').click();
        await start(page);
        assert.equal(await page.locator('#touch-keyboard').isVisible(), true, '再プレイでも選択したキーボードを維持する');
    }, withSession());
}

async function storageSuite() {
    const malformed = [
        ['invalid-json', '{broken'], ['null', 'null'], ['array', '[1,2,3]'],
        ['invalid-fields', JSON.stringify({ history: [{ wpm: 'Infinity', accuracy: {}, missRate: -3 }],
            streakDays: -5, totalClears: 'Infinity', lastPlayedDate: {}, date: [], target: 999, progress: -10,
            focusMode: 'false', soundVolume: -80, keyboardType: 'not-a-keyboard', autoResume: {},
            easy: 'Infinity', savedAt: 'not-a-date', currentWord: {}, currentWordNormalized: [] })]
    ];
    for (const [label, value] of malformed) {
        await runCase(`storage-corrupt-${label}`, async page => {
            assert.equal(await page.locator('#resume-card').isVisible(), false);
            assert.equal(await page.locator('#streak-badge').textContent(), '連続: 0日');
            assert.doesNotMatch(await page.locator('#start-screen').innerText(), /NaN|Infinity|undefined|\[object Object\]/);
            await page.locator('#open-settings-btn').click();
            const volume = Number(await page.locator('#sound-volume').inputValue());
            assert.ok(Number.isFinite(volume) && volume >= 0 && volume <= 100);
            assert.ok(['kana', 'romaji'].includes(await page.locator('#keyboard-type-select').inputValue()));
            await page.locator('#romaji-hint-toggle').check();
            await page.locator('#sound-toggle').uncheck();
            await page.locator('#close-settings-btn').click();
            await start(page);
            await completeCurrentWord(page);
            await finish(page);
            assert.equal(await number(page, '#result-score'), 1);
            assert.doesNotMatch(await page.locator('#result-screen').innerText(), /NaN|Infinity|undefined|\[object Object\]/);
            await page.locator('#home-btn').click();
            await page.reload({ waitUntil: 'load' });
            await page.clock.runFor(120);
            assert.equal(await page.locator('#streak-badge').textContent(), '連続: 1日', '壊れた値から正常な履歴へ復帰する');
        }, { storage: Object.fromEntries(['preferences', 'session', 'stats', 'goal', 'highscore'].map(key => [KEYS[key], value])) });
    }

    for (const failure of ['denyStorage', 'quotaExceeded']) {
        await runCase(`storage-${failure}-remains-playable`, async page => {
            await start(page);
            await completeCurrentWord(page);
            assert.equal(await page.locator('#goal-status').textContent(), '1/5', '保存不可でもメモリ内の目標を更新する');
            await page.locator('#pause-btn').click();
            await stationary(page);
            await page.locator('#resume-btn').click();
            await finish(page);
            assert.equal(await number(page, '#result-score'), 1);
            assert.equal(await number(page, '#result-miss'), 0);
            assert.doesNotMatch(await page.locator('#result-screen').innerText(), /NaN|Infinity|undefined/);
            await page.locator('#home-btn').click();
            assert.equal(await page.locator('#goal-progress').textContent(), '今日 1/5 問');
            await start(page);
            await completeCurrentWord(page);
            await finish(page);
            assert.equal(await page.locator('#result-goal-status').textContent(), '2/5');
            await screenshot(page, `storage-${failure}-result`);
        }, { [failure]: true });
    }

    await runCase('storage-partial-session-restores-through-rendered-ui', async page => {
        await restore(page);
        assert.equal(await word(page), 'さくら');
        assert.equal(await page.locator('#input').inputValue(), 'sa');
        assert.equal(await number(page, '#score'), 2);
        assert.equal(await number(page, '#miss'), 1);
        assert.equal(await number(page, '#timer'), 42);
        assert.equal(await page.locator('#romaji-hint .romaji-typed').textContent(), 'sa');
        await page.keyboard.type('kura');
        assert.equal(await number(page, '#score'), 3);
        const next = await word(page);
        await page.reload({ waitUntil: 'load' });
        await page.clock.runFor(120);
        assert.match(await page.locator('#resume-desc').textContent(), /正解3/);
        await restore(page);
        assert.equal(await number(page, '#score'), 3);
        assert.equal(await word(page), next);
        assert.equal(await page.locator('#input').inputValue(), '');
        await finish(page);
        assert.equal(await number(page, '#result-score'), 3);
    }, withSession({ inputValue: 'sa', score: 2, miss: 1, timeLeft: 42, hasMissedCurrent: true,
        combo: 0, maxCombo: 2, typedChars: 12, elapsedSeconds: 51 }));

    await runCase('storage-completion-snapshot-atomic-before-unload', async page => {
        await restore(page);
        await page.keyboard.type('sakura');
        const next = await word(page);
        assert.equal(await number(page, '#score'), 1);
        // unloadの追記保存なしで読み直す。入力直後に保存したスナップショットだけを復元する。
        await page.reload({ waitUntil: 'load' });
        await page.clock.runFor(120);
        await restore(page);
        assert.equal(await number(page, '#score'), 1);
        assert.equal(await word(page), next, '完了済み旧問題でなく次の問題を保存済みにする');
        assert.equal(await page.locator('#input').inputValue(), '');
        await page.locator('#input').dispatchEvent('input');
        assert.equal(await number(page, '#score'), 1, '復元直後に幽霊正解を加算しない');
        await completeCurrentWord(page);
        assert.equal(await number(page, '#score'), 2);
    }, withSession({}, { suppressBeforeUnload: true }));

    await runCase('storage-legacy-completed-word-never-ghost-scores', async page => {
        await restore(page);
        assert.equal(await number(page, '#score'), 1);
        assert.equal(await page.locator('#input').inputValue(), '', '旧形式の完了済み入力を再採点できる形で復元しない');
        await page.locator('#input').dispatchEvent('input');
        await page.keyboard.press('Backspace');
        assert.equal(await number(page, '#score'), 1);
        assert.equal(await number(page, '#miss'), 0);
    }, withSession({ inputValue: 'sakura', score: 1, combo: 1, maxCombo: 1, typedChars: 6 }));

    for (const [label, savedAt] of [
        ['expired', Date.parse(NOW) - 9 * 60 * 60 * 1000], ['future', Date.parse(NOW) + 60_000]
    ]) {
        await runCase(`storage-session-${label}`, async page => {
            assert.equal(await page.locator('#resume-card').isVisible(), false, '有効期限外のセッションを復元候補にしない');
            await start(page);
            assert.equal(await number(page, '#score'), 0);
        }, withSession({ savedAt }));
    }

    await runCase('storage-discard-and-auto-resume-preference', async page => {
        assert.equal(await page.locator('#resume-card').isVisible(), true);
        await page.locator('#open-settings-btn').click();
        await page.locator('#auto-resume-toggle').uncheck();
        await page.locator('#close-settings-btn').click();
        assert.equal(await page.locator('#resume-card').isVisible(), false);
        await page.locator('#open-settings-btn').click();
        await page.locator('#auto-resume-toggle').check();
        await page.locator('#close-settings-btn').click();
        assert.equal(await page.locator('#resume-card').isVisible(), true);
        await page.locator('#discard-session-btn').click();
        assert.equal(await page.locator('#resume-card').isVisible(), false);
        await page.reload({ waitUntil: 'load' });
        await page.clock.runFor(120);
        assert.equal(await page.locator('#resume-card').isVisible(), false, '明示的に破棄した保存を再表示しない');
    }, withSession());
}

async function selectionSuite() {
    await runCase('difficulty-units-training-and-goal-controls', async page => {
        for (const unit of ['word', 'proverb', 'sentence-short', 'sentence-long', 'katakana', 'subject-science', 'subject-social', 'ultra-beginner', 'auto']) {
            await page.locator(`[data-unit="${unit}"]`).click();
            assert.equal(await page.locator(`[data-unit="${unit}"]`).getAttribute('aria-pressed'), 'true');
            assert.equal(await page.locator('.unit-btn[aria-pressed="true"]').count(), 1);
            assert.match(await page.locator('#difficulty-sample').textContent(), /^例: .+/);
        }
        for (const training of ['youon', 'sokuon', 'hatsuon', 'choon', 'all']) {
            await page.locator(`[data-char-training="${training}"]`).click();
            assert.equal(await page.locator(`[data-char-training="${training}"]`).getAttribute('aria-pressed'), 'true');
            assert.equal(await page.locator('.char-btn[aria-pressed="true"]').count(), 1);
        }
        await page.locator('[data-goal="10"]').click();
        assert.equal(await page.locator('#goal-progress').textContent(), '今日 0/10 問');
        await start(page, { level: 'normal', mode: 'focus60', unit: 'subject-science' });
        assert.equal(await page.locator('#level-badge').textContent(), '🌟 ふつう');
        assert.equal(await number(page, '#timer'), 60);
        assert.equal(await page.locator('#goal-status').textContent(), '0/10');
        await completeCurrentWord(page);
        await page.locator('#quit-btn').click();
        await start(page, { level: 'hard' });
        assert.equal(await page.locator('#level-badge').textContent(), '🔥 むずかしい');
        assert.match(await hint(page), /^[_ ]+$/, 'むずかしいの既存ヒント非表示を維持する');
        await page.locator('#open-settings-btn-game').click();
        await page.locator('#romaji-hint-toggle').check();
        await page.locator('#close-settings-btn').click();
        await completeCurrentWord(page);
        await page.locator('#quit-btn').click();
    });
}

async function verifyUnchangedAssets(directory, name) {
    const manifest = JSON.parse(await readFile(path.join(artifactDir, `${name}-asset-manifest.json`), 'utf8'));
    for (const entry of manifest.files) {
        const bytes = await readFile(path.join(directory, entry.path));
        assert.equal(bytes.length, entry.bytes, `${name}: 検証中に資産サイズを変更しない ${entry.path}`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${name}: 検証開始時の資産を変更しない ${entry.path}`);
    }
    return { name, files: manifest.files.length, sha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex') };
}

try {
    await mkdir(artifactDir, { recursive: true });
    candidateUrl = await serveDist(dist);
    await writeAssetManifest(dist, 'candidate');
    let baselineDist;
    if (process.env.TYPING_DOJO_BASELINE_ROOT) {
        baselineDist = path.resolve(process.env.TYPING_DOJO_BASELINE_ROOT);
        assert.notEqual(dist, baselineDist, '候補と基準に同じdistを指定しない');
        baselineUrl = await serveDist(baselineDist);
        await writeAssetManifest(baselineDist, 'baseline');
    } else {
        console.log('[INFO] TYPING_DOJO_BASELINE_ROOT未指定: 基準版比較は明示的に省略。候補版の操作検証・4画面幅の計測と画像は保存します。');
    }
    browser = await chromium.launch({ headless: true });
    await writeFile(path.join(artifactDir, 'run-metadata.json'), `${JSON.stringify({
        browser: 'Chromium', version: browser.version(), candidateDist: dist, baselineDist: baselineDist || null,
        time: NOW, viewports: VIEWPORTS, serviceWorkers: 'blocked for immutable build comparison',
        boundaries: ['seeded Math.random', 'controlled browser clock', 'localStorage fixtures/failure',
            'native Chromium IME', 'synthetic document visibilitychange', 'optional suppressed beforeunload'],
        assertions: 'Rendered DOM only; no application instance access and no imported application code'
    }, null, 2)}\n`);
    await layoutSuite();
    await reachabilitySuite();
    await tutorialSuite();
    await inputSuite();
    await settingsSuite();
    await lifecycleSuite();
    await parentsSuite();
    await touchSuite();
    await storageSuite();
    await selectionSuite();
    const assetVerification = [await verifyUnchangedAssets(dist, 'candidate')];
    if (baselineDist) assetVerification.push(await verifyUnchangedAssets(baselineDist, 'baseline'));
    await writeFile(path.join(artifactDir, 'asset-verification.json'), `${JSON.stringify(assetVerification, null, 2)}\n`);
    if (failures.length) throw new AggregateError(failures, `Typing Dojo実ビルドE2E: ${failures.length}/${results.length}件失敗。${artifactDir}/results.jsonを参照`);
    console.log(`[OK] Typing Dojo実ビルドE2E: ${results.length}件成功。画像・基準比較・資産ハッシュ: ${artifactDir}`);
} finally {
    await browser?.close();
    for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

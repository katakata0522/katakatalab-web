const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const projectRoot = path.resolve(__dirname, '..', '..');
const buildRoot = path.join(projectRoot, 'dist');
const diagnosticRoot = path.join(projectRoot, 'visual-guard-artifacts', 'interactive-build');

async function installInteractionDiagnostics(context) {
    await context.addInitScript(() => {
        const events = [];
        const audioContexts = [];
        const describe = (element) => element instanceof Element ? {
            tag: element.tagName, id: element.id, label: element.getAttribute('aria-label'),
            connected: element.isConnected, inert: Boolean(element.closest('[inert]')),
        } : null;
        const record = (kind, details = {}) => {
            events.push({ at: performance.now(), kind, ...details });
            if (events.length > 160) events.shift();
        };
        for (const type of ['keydown', 'keyup', 'click', 'focusin', 'focusout', 'resize', 'visibilitychange']) {
            window.addEventListener(type, (event) => record(type, {
                key: event.key, target: describe(event.target), active: describe(document.activeElement),
                viewport: [innerWidth, innerHeight], visibility: document.visibilityState,
            }), true);
        }
        // 音声の待機を観測するだけにし、元のPromiseやユーザー入力は置き換えない。
        const prototypes = new Set([window.AudioContext?.prototype, window.webkitAudioContext?.prototype].filter(Boolean));
        for (const prototype of prototypes) {
            for (const method of ['resume', 'suspend']) {
                const original = prototype[method];
                if (typeof original !== 'function') continue;
                prototype[method] = function (...args) {
                    if (!audioContexts.includes(this)) audioContexts.push(this);
                    const contextId = audioContexts.indexOf(this);
                    record(`audio.${method}.start`, { contextId, state: this.state });
                    const result = original.apply(this, args);
                    result.then(
                        () => record(`audio.${method}.resolved`, { contextId, state: this.state }),
                        (error) => record(`audio.${method}.rejected`, { contextId, state: this.state, message: String(error) }),
                    );
                    return result;
                };
            }
        }
        window.__interactiveBuildDiagnostics = () => ({
            events, audio: audioContexts.map((context) => ({ state: context.state, currentTime: context.currentTime })),
            active: describe(document.activeElement),
        });
    });
}

async function captureSpaceState(page, stage, viewport) {
    const state = await page.evaluate(() => {
        const element = (id) => {
            const node = document.getElementById(id);
            if (!node) return null;
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return {
                className: node.className, inert: node.hasAttribute('inert'),
                display: style.display, opacity: style.opacity, pointerEvents: style.pointerEvents,
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            };
        };
        return {
            url: location.href, viewport: [innerWidth, innerHeight], visibility: document.visibilityState,
            title: document.getElementById('detail-name')?.textContent,
            bridgeReady: typeof window._AppBridge?.handlePlanetClick === 'function',
            loading: element('loading-overlay'), warp: element('warp-overlay'),
            modal: element('planet-detail-modal'), a11y: element('a11y-container'),
            planetButtons: [...document.querySelectorAll('#a11y-container button')].map((button) => ({
                label: button.getAttribute('aria-label'), focused: button === document.activeElement,
                connected: button.isConnected, disabled: button.disabled,
            })),
            interaction: window.__interactiveBuildDiagnostics?.(),
        };
    });
    console.log(`[interactive Space ${viewport.width}x${viewport.height}] ${stage}: ${JSON.stringify({ title: state.title, active: state.interaction?.active, modalClass: state.modal?.className, audio: state.interaction?.audio })}`);
    return { stage, expectedViewport: viewport, ...state };
}

// 公開ビルドを検査し、ViteによるFocusランタイムの注入も対象にする。
async function startBuildServer() {
    assert.ok(fs.existsSync(path.join(buildRoot, 'focus_studio', 'index.html')), '先にnpm run build:allを実行してください');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    const server = http.createServer((request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
            let file = path.resolve(buildRoot, `.${pathname}`);
            if (file !== buildRoot && !file.startsWith(`${buildRoot}${path.sep}`)) {
                response.writeHead(403).end();
                return;
            }
            if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
                response.writeHead(404).end();
                return;
            }
            response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
            const stream = fs.createReadStream(file);
            stream.on('error', () => response.destroy());
            stream.pipe(response);
        } catch {
            response.writeHead(400).end();
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    return {
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); })
    };
}

async function verifyFocus(page, baseUrl) {
    await page.goto(`${baseUrl}/focus_studio/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#timer-display').waitFor();
    const result = await page.evaluate(async () => {
        const runtime = eval('app');
        if (!runtime.__focusRuntimeHardeningInstalled) throw new Error('公開ランタイムが未適用です');
        const originalAudio = runtime.ensureAudio;
        const originalReady = runtime.audioReady;
        let release;
        const audioPromise = new Promise(resolve => { release = resolve; });
        runtime.audioReady = false;
        runtime.ensureAudio = () => audioPromise;
        try {
            const transitioning = runtime.playSchoolChimeAndStartBreak();
            document.getElementById('restart-btn').click();
            const unlocked = !runtime.__chimeTransitioning;
            release(false);
            await transitioning;
            const before = runtime.completedCount;
            const completion = runtime.completeTimer();
            document.getElementById('restart-btn').click();
            await completion;
            return { unlocked, countUnchanged: runtime.completedCount === before, running: runtime.isRunning, chime: runtime.isChimePlaying, label: document.getElementById('timer-label').innerText };
        } finally {
            runtime.ensureAudio = originalAudio;
            runtime.audioReady = originalReady;
        }
    });
    assert.deepEqual(result, { unlocked: true, countUnchanged: true, running: false, chime: false, label: 'しゅうちゅう！' });
}

async function verifyRhythm(page, baseUrl) {
    await page.goto(`${baseUrl}/rhythm_lab/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#share-btn').click();
    await page.evaluate(() => {
        document.getElementById('share-close-btn').click();
        document.getElementById('share-btn').click();
    });
    // CSS終了待ちより長く待ち、古いcloseタイマーが発火しても開いたままか確認する。
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#share-modal').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.locator('#share-modal').isVisible(), true);
    await page.locator('#share-close-btn').click();
    await page.locator('#share-modal').waitFor({ state: 'hidden' });
}

async function verifySpace(page, baseUrl, browserMessages) {
    const states = [];
    let stage = 'navigation';
    let viewport = { width: 1180, height: 757 };
    try {
        await page.setViewportSize({ width: 1180, height: 757 });
        await page.goto(`${baseUrl}/space_lab/`, { waitUntil: 'domcontentloaded' });
        stage = 'loading';
        await page.waitForFunction(() => document.getElementById('loading-overlay')?.classList.contains('hidden'), null, { timeout: 15000 });
        for (viewport of [{ width: 1180, height: 757 }, { width: 1180, height: 480 }, { width: 390, height: 844 }]) {
            stage = 'resize';
            await page.setViewportSize(viewport);
            // resizeの150msデバウンスが実際に完了し、現在の惑星ボタンへ入力できるまで待つ。
            await page.waitForFunction(({ width, height }) => {
                const canvas = document.getElementById('space-canvas');
                const a11y = document.getElementById('a11y-container');
                const earth = a11y?.querySelector('button[aria-label^="地球"]');
                return innerWidth === width && innerHeight === height
                    && canvas?.width === Math.floor(width * devicePixelRatio)
                    && canvas?.height === Math.floor(height * devicePixelRatio)
                    && earth?.isConnected && earth.parentElement === a11y;
            }, viewport);
            states.push(await captureSpaceState(page, 'before-focus', viewport));
            const earth = page.getByRole('button', { name: /^地球.*の詳細を見る$/ });
            stage = 'focus';
            await earth.focus();
            stage = 'keyboard-enter';
            await earth.press('Enter');
            stage = 'wait-modal';
            states.push(await captureSpaceState(page, 'after-enter', viewport));
            await page.waitForFunction(() => document.getElementById('detail-name')?.textContent.startsWith('地球')
                && document.getElementById('planet-detail-modal')?.classList.contains('opacity-100'));
            states.push(await captureSpaceState(page, 'modal-open', viewport));
            stage = 'dimensions';
            const dimensions = await page.locator('#modal-body').evaluate(element => ({
                clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
                clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
                columns: [...element.children].map(child => child.getBoundingClientRect().width)
            }));
            assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, `${viewport.width}×${viewport.height}: 横あふれ ${JSON.stringify(dimensions)}`);
            if (viewport.width >= 640) {
                assert.ok(Math.abs(dimensions.columns[0] / dimensions.columns[1] - 5 / 7) < 0.01, '既存の5:7カラム比率を維持する');
            }
            assert.ok(dimensions.clientHeight > 0, '短い画面でも本文のスクロール領域が残る');
            stage = 'close';
            await page.locator('#close-modal-btn').click();
            await page.waitForFunction(() => document.getElementById('planet-detail-modal')?.classList.contains('opacity-0'));
            states.push(await captureSpaceState(page, 'modal-closed', viewport));
        }
    } catch (error) {
        console.error(`[interactive Space ${viewport.width}x${viewport.height}] failed at ${stage}: ${error.message}`);
        try {
            states.push(await captureSpaceState(page, `failed-${stage}`, viewport));
            fs.mkdirSync(diagnosticRoot, { recursive: true });
            await page.screenshot({ path: path.join(diagnosticRoot, `space-${viewport.width}x${viewport.height}-${stage}.png`), timeout: 5000 });
        } catch (diagnosticError) {
            console.error(`Space診断の追加取得に失敗しました: ${diagnosticError.message}`);
        }
        throw error;
    } finally {
        fs.mkdirSync(diagnosticRoot, { recursive: true });
        fs.writeFileSync(path.join(diagnosticRoot, 'space-stages.json'), JSON.stringify({ states, browserMessages }, null, 2));
    }
}

async function verifySpeedReader(page, baseUrl) {
    await page.goto(`${baseUrl}/speed_reader/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#tab-input').click();
    await page.locator('#custom-text').fill('one');
    await page.locator('[data-action="prepare-custom"]').click();
    await page.clock.install({ time: new Date('2026-10-02T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-02T12:01:00Z'));
    await page.locator('#main-play-btn').click();
    await page.clock.runFor(1450);
    await page.locator('[data-action="reset"]').click();
    await page.clock.runFor(500);
    assert.equal(await page.locator('#speed-reader-comprehension-modal[open]').count(), 0, 'リセット後に前の読書結果を開かない');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pikalab_speed_reader_history') || '{}').readCount || 0), 0);
    await page.locator('#main-play-btn').click();
    await page.clock.runFor(1800);
    assert.equal(await page.locator('#speed-reader-comprehension-modal[open]').count(), 1, '通常完了では既存の内容チェックを開く');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pikalab_speed_reader_history')).readCount), 1);
}

test('公開ビルドの非同期リセット・モーダル再開・惑星本文幅を検証する', { timeout: 55000 }, async () => {
    let server;
    let browser;
    try {
        server = await startBuildServer();
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1180, height: 757 } });
        await installInteractionDiagnostics(context);
        // 外部配信のフォントや通信でローカル回帰検査を待たせない。
        await context.route('https://**', route => route.abort());
        const page = await context.newPage();
        const browserMessages = [];
        page.on('pageerror', (error) => browserMessages.push({ type: 'pageerror', message: error.message, stack: error.stack }));
        page.on('console', (message) => {
            if (['error', 'warning'].includes(message.type())) browserMessages.push({ type: message.type(), message: message.text() });
        });
        page.on('requestfailed', (request) => browserMessages.push({ type: 'requestfailed', url: request.url(), error: request.failure() }));
        page.setDefaultTimeout(8000);
        await verifyFocus(page, server.baseUrl);
        await verifyRhythm(page, server.baseUrl);
        await verifySpace(page, server.baseUrl, browserMessages);
        await verifySpeedReader(page, server.baseUrl);
    } finally {
        try {
            if (browser) await browser.close();
        } finally {
            if (server) await server.close();
        }
    }
});

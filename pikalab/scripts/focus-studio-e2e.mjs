import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import labCacheTools from './finalize-lab-service-workers.cjs';

const { readLabWorker } = labCacheTools;

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const port = 4174;
const appUrl = `http://127.0.0.1:${port}/focus_studio/`;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function parseTimer(text) {
    const match = /^(\d+):(\d{2})$/.exec(String(text).trim());
    if (!match) throw new Error(`タイマー表示を解析できません: ${text}`);
    return Number(match[1]) * 60 + Number(match[2]);
}

async function waitForServer(url, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url, { redirect: 'manual' });
            if (response.status >= 200 && response.status < 500) return;
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Vite previewの起動を確認できませんでした: ${lastError?.message || 'timeout'}`);
}

async function waitForValue(readValue, expected, message, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    let latest = null;
    while (Date.now() < deadline) {
        latest = await readValue();
        if (latest === expected) return latest;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`${message}（期待: ${expected} / 現在: ${latest}）`);
}

async function readText(page, selector) {
    return page.locator(selector).innerText();
}

async function clickDirect(page, selector) {
    const clicked = await page.evaluate((targetSelector) => {
        const element = document.querySelector(targetSelector);
        if (!(element instanceof HTMLElement)) return false;
        element.click();
        return true;
    }, selector);
    assert(clicked, `操作対象が見つかりません: ${selector}`);
}

async function run() {
    if (!fs.existsSync(path.join(distRoot, 'focus_studio', 'index.html'))) {
        throw new Error('dist/focus_studio/index.htmlがありません。先にnpm run build:allを実行してください。');
    }
    const { cacheName: expectedCacheName, prefix: cachePrefix, baseName: previousCacheName } = readLabWorker(
        fs.readFileSync(path.join(distRoot, 'focus_studio', 'sw-hardened.js'), 'utf8')
    );
    assert(expectedCacheName !== previousCacheName, '最終配信バイトによるFocus cache版が確定していません');
    const unrelatedCacheName = 'pikalab-unrelated-focus-e2e';
    const sentinelPath = '/focus_studio/__cache_migration_probe__';

    const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
    const preview = spawn(process.execPath, [
        viteBin,
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--strictPort'
    ], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let previewLog = '';
    preview.stdout.on('data', (chunk) => { previewLog += chunk.toString(); });
    preview.stderr.on('data', (chunk) => { previewLog += chunk.toString(); });

    let browser = null;
    try {
        await waitForServer(appUrl);
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        // アプリ起動前に旧版と他アプリのキャッシュを用意し、activate時の削除範囲を確認する。
        await page.goto(new URL('../robots.txt', appUrl).href, { waitUntil: 'domcontentloaded' });
        await page.evaluate(async ({ previousCacheName, unrelatedCacheName, sentinelPath }) => {
            await (await caches.open(previousCacheName)).put(sentinelPath, new Response('previous'));
            await (await caches.open(unrelatedCacheName)).put(sentinelPath, new Response('retained'));
        }, { previousCacheName, unrelatedCacheName, sentinelPath });

        await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
        await page.locator('#timer-display').waitFor({ state: 'visible' });
        assert(await readText(page, '#timer-display') === '25:00', '初期タイマーが25:00ではありません');

        const runtimeInstalled = await page.evaluate(() => eval('Boolean(app.__focusRuntimeHardeningInstalled)'));
        assert(runtimeInstalled, 'Focus Studio runtime hardeningが有効になっていません');

        await page.locator('.timer-preset[data-mode="focus"][data-value="60"]').click();
        assert(await readText(page, '#timer-display') === '60:00', '長時間プリセットへ切り替わりません');

        const taskInput = page.locator('#task-input');
        await taskInput.fill('E2Eで保存確認');
        await page.waitForTimeout(450);
        await page.reload({ waitUntil: 'domcontentloaded' });
        assert(await taskInput.inputValue() === 'E2Eで保存確認', 'タスク入力が再読込後に復元されません');

        await taskInput.focus();
        const iconBeforeSpace = await readText(page, '#icon-timer');
        await page.keyboard.press('Space');
        assert(await readText(page, '#icon-timer') === iconBeforeSpace, '入力欄のSpaceキーがタイマー操作へ伝播しました');

        await page.locator('.timer-preset[data-mode="focus"][data-value="5"]').click();
        assert(await readText(page, '#timer-display') === '05:00', '5分プリセットへ切り替わりません');
        await clickDirect(page, '#btn-main-action');
        await page.waitForTimeout(1250);
        const runningValue = parseTimer(await readText(page, '#timer-display'));
        assert(runningValue < 300, 'タイマーが実時間で進んでいません');

        await clickDirect(page, '#btn-main-action');
        const pausedValue = await readText(page, '#timer-display');
        await page.waitForTimeout(700);
        assert(await readText(page, '#timer-display') === pausedValue, '一時停止中にタイマーが進みました');

        await clickDirect(page, '#btn-main-action');
        const beforePageHide = parseTimer(await readText(page, '#timer-display'));
        await page.evaluate(() => {
            window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
        });
        await page.waitForTimeout(1200);
        await page.evaluate(() => {
            window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        });
        await page.waitForTimeout(300);
        const afterPageShow = parseTimer(await readText(page, '#timer-display'));
        assert(afterPageShow < beforePageHide, 'bfcache復帰相当でタイマーが実時間へ同期しません');
        await clickDirect(page, '#btn-main-action');

        const drawerButton = page.locator('#open-sound-drawer-btn');
        assert(await drawerButton.getAttribute('aria-expanded') === 'false', 'Sound Drawerの初期aria-expandedが不正です');
        await drawerButton.click();
        assert(await drawerButton.getAttribute('aria-expanded') === 'true', 'Sound Drawerを開いた状態がaria-expandedへ同期されません');
        assert(await page.locator('#sound-drawer').getAttribute('aria-hidden') === 'false', 'Sound Drawerのaria-hiddenが同期されません');

        const brownButton = page.locator('#btn-brown');
        assert(await brownButton.getAttribute('aria-pressed') === 'false', '環境音ボタンの初期aria-pressedが不正です');
        await brownButton.click();
        await waitForValue(
            () => brownButton.getAttribute('aria-pressed'),
            'true',
            '環境音の開始状態がaria-pressedへ同期されません'
        );
        await brownButton.click();
        await waitForValue(
            () => brownButton.getAttribute('aria-pressed'),
            'false',
            '環境音の停止状態がaria-pressedへ同期されません'
        );
        await page.locator('#sound-drawer-close-btn').click();
        assert(await drawerButton.getAttribute('aria-expanded') === 'false', 'Sound Drawerを閉じた状態がaria-expandedへ同期されません');

        const parentsOpen = page.locator('[data-action="parents-modal-open"]');
        await parentsOpen.click();
        assert(await page.locator('#parents-modal').getAttribute('open') !== null, '保護者モーダルを開けません');
        await page.locator('#parents-modal [data-action="parents-modal-close"]').first().click();
        assert(await page.locator('#parents-modal').getAttribute('open') === null, '保護者モーダルを閉じられません');

        await page.evaluate(() => eval(`
            app.audioReady = false;
            app.ensureAudio = async () => false;
            app.setTimer(5, 'focus');
            app.timeLeft = 1;
            app.totalTime = 1;
            app.__timerRemainingMs = 1000;
            app.updateDisplay();
            app.toggleTimer();
        `));
        await page.waitForTimeout(2800);
        assert(await readText(page, '#timer-label') === 'きゅうけい！', '音声失敗時に休憩へ遷移しません');
        assert(await readText(page, '#icon-timer') === 'pause', '休憩タイマーが自動開始しません');

        await page.evaluate(() => eval(`
            app.audioReady = false;
            app.ensureAudio = async () => false;
            app.timeLeft = 1;
            app.totalTime = 1;
            app.__timerRemainingMs = 1000;
            app.__timerDeadlineMs = Date.now() + 1000;
            app.updateDisplay();
        `));
        await page.waitForTimeout(1800);
        assert(await readText(page, '#timer-label') === 'しゅうちゅう！', '休憩完了後に集中モードへ戻りません');

        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.evaluate(() => eval(`
            app.audioReady = false;
            app.ensureAudio = async () => false;
            app.completedCount = 0;
            app.saveState();
            app.__timerMode = 'focus';
            app.dom.timerLabel.innerText = 'しゅうちゅう！';
            Promise.all([app.completeTimer(), app.completeTimer()]);
        `));
        await page.waitForTimeout(350);
        assert(await readText(page, '#complete-count') === '1', '完了処理が多重実行されました');

        await page.evaluate(async () => {
            await navigator.serviceWorker.ready;
        });
        if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
            await page.reload({ waitUntil: 'domcontentloaded' });
        }
        assert(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), 'Service Workerがページを制御していません');
        assert(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/focus_studio/sw-hardened.js')),
            '生成済みのFocus Studio hardened Service Workerがページを制御していません');

        const cacheNames = await page.evaluate(() => caches.keys());
        assert(cacheNames.includes(expectedCacheName), `最終配信バイトに対応するFocus Studio cacheがありません: ${expectedCacheName}`);
        assert(!cacheNames.includes(previousCacheName), '旧Focus Studio cacheが削除されていません');
        assert(cacheNames.filter(name => name.startsWith(cachePrefix)).every(name => name === expectedCacheName),
            '現在の版以外のFocus Studio cacheが残っています');
        assert(cacheNames.includes(unrelatedCacheName), '他アプリのcacheが削除されました');
        const retained = await page.evaluate(async ({ unrelatedCacheName, sentinelPath }) => {
            const response = await (await caches.open(unrelatedCacheName)).match(sentinelPath);
            return response ? response.text() : null;
        }, { unrelatedCacheName, sentinelPath });
        assert(retained === 'retained', '他アプリのcache内容が保持されていません');

        await context.setOffline(true);
        try {
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.locator('#timer-display').waitFor({ state: 'visible' });
        } finally {
            await context.setOffline(false);
        }

        assert(pageErrors.length === 0, `ページ実行時エラー: ${pageErrors.join(' / ')}`);
        await context.close();
        console.log('Focus Studio browser E2E: OK');
    } finally {
        if (browser) await browser.close();
        preview.kill('SIGTERM');
        await new Promise((resolve) => {
            const timeout = setTimeout(resolve, 2000);
            preview.once('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
        });
        if (preview.exitCode && preview.exitCode !== 0) {
            console.error(previewLog.trim());
        }
    }
}

run().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});


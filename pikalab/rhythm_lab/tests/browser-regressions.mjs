import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CELLS = 'button[data-type][data-index]';
const AUTOSAVE_KEY = 'rhythmlab_autosave_project_v2';
const PROJECTS_KEY = 'rhythmlab_user_projects_v2';
const INSTRUMENTS = ['hihat', 'clap', 'snare', 'tom', 'kick'];
const VIEWPORTS = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
    { width: 667, height: 375 }
];
const COLORS = {
    hihat: ['rgb(250, 204, 21)', 'rgb(253, 224, 71)'],
    clap: ['rgb(34, 197, 94)', 'rgb(74, 222, 128)'],
    snare: ['rgb(6, 182, 212)', 'rgb(34, 211, 238)'],
    tom: ['rgb(168, 85, 247)', 'rgb(192, 132, 252)'],
    kick: ['rgb(236, 72, 153)', 'rgb(244, 114, 182)']
};

// 実Toneの音響検証とは分け、開始待ち・Transport時刻・古いDrawを決定的に再現する。
function installFakeTone() {
    const config = window.__rhythmFakeOptions || {};
    let nextEvent = 1;
    const events = new Map();
    const draws = [];
    const pendingStarts = [];
    const log = {
        starts: 0, stops: 0, clearIds: [], scheduleIntervals: [],
        sounds: [], disposed: 0, startRequests: 0, drawCancels: 0,
        resolveStarts() {
            for (const resolve of pendingStarts.splice(0)) resolve();
        },
        tick(time) {
            for (const callback of events.values()) callback(time);
        },
        takeDraws() {
            const callbacks = draws.splice(0);
            this.staleDraws = callbacks;
            return callbacks.length;
        },
        flushStaleDraws() {
            for (const callback of this.staleDraws || []) callback();
            this.staleDraws = [];
        },
        flushDraws() {
            for (const callback of draws.splice(0)) callback();
        },
        activeEvents() { return events.size; }
    };
    class FakeNode {
        constructor(kind, options) {
            this.kind = kind;
            this.options = options;
            this.volume = { value: 0 };
            this.gain = { value: options, rampTo(value) { this.value = value; } };
        }
        connect() { return this; }
        toDestination() { return this; }
        dispose() { log.disposed += 1; }
        triggerAttackRelease(...args) { log.sounds.push({ kind: this.kind, args }); }
    }
    window.__rhythmTone = log;
    window.Tone = {
        context: { state: 'suspended', lookAhead: 0 },
        async start() {
            log.startRequests += 1;
            if (config.holdStart) await new Promise(resolve => pendingStarts.push(resolve));
            this.context.state = 'running';
        },
        Limiter: class extends FakeNode { constructor(value) { super('Limiter', value); } },
        Gain: class extends FakeNode { constructor(value) { super('Gain', value); } },
        MembraneSynth: class extends FakeNode { constructor(value) { super('MembraneSynth', value); } },
        NoiseSynth: class extends FakeNode { constructor(value) { super('NoiseSynth', value); } },
        MetalSynth: class extends FakeNode { constructor(value) { super('MetalSynth', value); } },
        Transport: {
            bpm: { value: 120, rampTo(value) { this.value = value; } },
            scheduleRepeat(callback, interval) {
                const id = nextEvent++;
                events.set(id, callback);
                log.scheduleIntervals.push(interval);
                return id;
            },
            clear(id) { log.clearIds.push(id); events.delete(id); },
            start() { log.starts += 1; },
            stop() { log.stops += 1; }
        },
        Draw: {
            schedule(callback) { draws.push(callback); },
            // キャンセルが取りこぼした描画も世代番号で拒否する必要がある。
            cancel() { log.drawCancels += 1; }
        }
    };
}

async function createCase(browser, viewport, options = {}) {
    const context = await browser.newContext({ viewport, colorScheme: 'light', reducedMotion: 'reduce' });
    await context.addInitScript(value => { window.__rhythmFakeOptions = value; }, options);
    // 外部Webフォントの可用性に基準版と修正版の比較結果を左右されないよう揃える。
    await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    await context.route('https://fonts.gstatic.com/**', route => route.abort());
    await context.route('**/assets/tone-14.8.49.js*', route => route.fulfill({
        contentType: 'application/javascript', body: `(${installFakeTone.toString()})();`
    }));
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    return { context, page, errors };
}

async function ready(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(selector => document.querySelectorAll(selector).length === 80, CELLS);
    await page.evaluate(async () => { await document.fonts.ready; });
}

async function checkCase(run, name, viewport, work, options) {
    const startedAt = Date.now();
    const id = `case-${String(run.results.length + 1).padStart(3, '0')}-${viewport.width}x${viewport.height}`;
    const result = { id, name, viewport, status: 'passed', artifacts: [] };
    let testCase;
    let failure;
    try {
        testCase = await createCase(run.browser, viewport, options);
        await work(testCase);
        assert.deepEqual(testCase.errors, [], `${name}: 未処理のpageerrorを出さない`);
    } catch (cause) {
        failure = cause instanceof Error ? cause : new Error(String(cause));
        const pageErrors = testCase?.errors || [];
        failure.message = `${name}: ${failure.message}${pageErrors.length ? `\npageerror: ${pageErrors.join('\n')}` : ''}`;
        // 各Contextは独立しているため、ここでは次の画面幅・音声・保存検証を止めない。
        if (run.artifactDir && testCase?.page && !testCase.page.isClosed()) {
            try {
                const file = `${id}-failure.png`;
                await testCase.page.screenshot({ path: path.join(run.artifactDir, file), fullPage: false, animations: 'disabled', timeout: 5000 });
                result.artifacts.push(file);
            } catch (artifactError) {
                result.screenshotError = { message: artifactError.message, stack: artifactError.stack };
            }
        }
    } finally {
        try {
            await testCase?.context.close();
        } catch (closeError) {
            if (!failure) failure = new Error(`${name}: テスト用Contextを終了できませんでした`, { cause: closeError });
            result.closeError = { message: closeError.message, stack: closeError.stack };
        }
        result.durationMs = Date.now() - startedAt;
        result.pageErrors = testCase?.errors || [];
        if (failure) {
            result.status = 'failed';
            result.error = { name: failure.name, message: failure.message, stack: failure.stack };
            run.failures.push(failure);
            console.error(`[FAIL] Rhythm Lab追加E2E: ${failure.message}`);
            if (run.artifactDir) {
                const file = `${id}-failure.json`;
                result.artifacts.push(file);
                try {
                    await writeFile(path.join(run.artifactDir, file), `${JSON.stringify(result, null, 2)}\n`);
                } catch (artifactError) {
                    result.reportError = { message: artifactError.message, stack: artifactError.stack };
                }
            }
        } else {
            console.log(`[OK] Rhythm Lab追加E2E: ${name}`);
        }
        run.results.push(result);
    }
    return result;
}

async function screenshot(page, artifactDir, name, { fullPage = true } = {}) {
    if (!artifactDir) return;
    await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage, animations: 'disabled' });
}

async function assertNoHorizontalOverflow(page, label) {
    const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        overflowing: [...document.querySelectorAll('header, main, .glass-panel, #play-btn, #tempo-input, #tempo-slider, #volume-slider, #share-content, #share-link-input')]
            .map(node => { const rect = node.getBoundingClientRect(); return { selector: node.id || node.className, left: rect.left, right: rect.right, width: rect.width }; })
            .filter(rect => rect.left < -1 || rect.right > document.documentElement.clientWidth + 1)
    }));
    assert.ok(dimensions.document <= dimensions.viewport + 1 && dimensions.body <= dimensions.viewport + 1,
        `${label}: 画面全体を横にはみ出さない ${JSON.stringify(dimensions)}`);
}

async function focusBody(page) {
    await page.evaluate(() => {
        document.body.tabIndex = -1;
        document.body.focus({ preventScroll: true });
    });
}

async function assertFocused(page, selector, label) {
    await page.waitForFunction(selector => document.activeElement === document.querySelector(selector), selector);
    assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true, label);
}

async function assertComputedStyles(page, expectations, label) {
    // reduced-motionでも変更直後の最初のフレームには旧色が残るため、最終色を期限付きで待つ。
    try {
        await page.waitForFunction(expectations => expectations.every(({ selector, styles }) => {
            const node = document.querySelector(selector);
            if (!node) return false;
            const computed = getComputedStyle(node);
            return Object.entries(styles).every(([property, value]) => computed[property] === value);
        }), expectations, { timeout: 3000 });
    } catch (error) {
        const received = await page.evaluate(expectations => expectations.map(({ selector, styles }) => {
            const node = document.querySelector(selector);
            return { selector, styles: node ? Object.fromEntries(Object.keys(styles).map(property => [property, getComputedStyle(node)[property]])) : null };
        }), expectations);
        assert.fail(`${label}: 3秒以内に最終表示へ到達しませんでした\n期待: ${JSON.stringify(expectations)}\n実測: ${JSON.stringify(received)}\n${error.message}`);
    }
}

async function pattern(page) {
    return page.locator(CELLS).evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-pressed')));
}

async function snapshotGeometry(page) {
    return page.evaluate(() => {
        const selectors = {
            header: 'header', main: 'main', playbackPanel: '.glass-panel',
            presetPanel: '.glass-panel:nth-child(2)', play: '#play-btn', tempo: '#tempo-input',
            tempoSlider: '#tempo-slider', volumeSlider: '#volume-slider',
            presets: '[aria-label="プリセットリズム"]', name: '#preset-name',
            grid: '[aria-label="ドラムパッド"]', firstRow: '#row-hihat',
            dark: '#dark-mode-toggle', help: '#help-btn'
        };
        const boxes = {};
        for (const [name, selector] of Object.entries(selectors)) {
            const node = document.querySelector(selector);
            if (!node) throw new Error(`比較対象がありません: ${selector}`);
            const rect = node.getBoundingClientRect();
            boxes[name] = { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
        }
        return {
            boxes,
            wording: document.querySelector('main').innerText.replace(/\s+/g, ' ').trim(),
            width: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth
        };
    });
}

function compareGeometry(before, after, viewport) {
    assert.equal(after.wording, before.wording, '表示中のメイン説明・ラベルを無関係に変更しない');
    const corrections = [];
    const headerDelta = after.boxes.header.height - before.boxes.header.height;
    for (const name of ['main', 'playbackPanel', 'presetPanel', 'play', 'tempo', 'tempoSlider', 'volumeSlider', 'presets', 'name', 'grid', 'firstRow']) {
        const oldBox = before.boxes[name];
        const newBox = after.boxes[name];
        for (const dimension of ['x', 'y', 'width', 'height']) {
            const expected = oldBox[dimension] + (dimension === 'y' ? headerDelta : 0);
            if (Math.abs(newBox[dimension] - expected) <= 2) continue;
            // 狭い画面の既存はみ出し修正は、画面内へ収まったことと画像で別途確認する。
            // 広い画面やグリッドの構造変更にこの例外は適用しない。
            const overflowCorrection = before.scrollWidth > before.width + 1 && after.scrollWidth <= after.width + 1;
            const narrowControl = viewport.width <= 520 && overflowCorrection &&
                ['play', 'tempo', 'tempoSlider', 'volumeSlider', 'name'].includes(name) &&
                newBox.x >= 0 && newBox.x + newBox.width <= after.width + 1;
            const panelReflow = viewport.width <= 520 && overflowCorrection &&
                ['main', 'playbackPanel', 'presetPanel', 'presets', 'grid', 'firstRow'].includes(name) &&
                ['y', 'height'].includes(dimension);
            if (narrowControl || panelReflow) {
                corrections.push(`${name}.${dimension}: ${oldBox[dimension].toFixed(2)} → ${newBox[dimension].toFixed(2)}（狭幅の収まり修正）`);
                continue;
            }
            assert.fail(`主要配置 ${name}.${dimension} が変化: 基準 ${expected.toFixed(2)}px / 修正 ${newBox[dimension].toFixed(2)}px`);
        }
    }
    // darkボタンは二重アイコン表示の修正による縮小を許可し、拡大は拒否する。
    assert.ok(after.boxes.dark.width <= before.boxes.dark.width + 2, 'テーマ切替の二重アイコン修正でボタンを拡大しない');
    if (after.boxes.dark.width < before.boxes.dark.width - 2) corrections.push('テーマ切替ボタンの二重アイコン解消');
    return corrections;
}

async function shareLayoutDiagnostics(page, selector) {
    return page.evaluate(selector => {
        const rectOf = node => {
            const rect = node.getBoundingClientRect();
            return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const describe = node => {
            if (!node) return null;
            const styles = getComputedStyle(node);
            return { rect: rectOf(node), clientWidth: node.clientWidth, clientHeight: node.clientHeight,
                scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight, scrollTop: node.scrollTop,
                scrollLeft: node.scrollLeft, overflowX: styles.overflowX, overflowY: styles.overflowY };
        };
        const target = document.querySelector(selector);
        const rect = target ? rectOf(target) : null;
        const clippingAncestors = [];
        for (let node = target?.parentElement; node && node !== document.body; node = node.parentElement) {
            const styles = getComputedStyle(node);
            const clipsX = ['auto', 'scroll', 'hidden', 'clip'].includes(styles.overflowX);
            const clipsY = ['auto', 'scroll', 'hidden', 'clip'].includes(styles.overflowY);
            if (!clipsX && !clipsY) continue;
            const bounds = node.getBoundingClientRect();
            const left = bounds.left + node.clientLeft;
            const top = bounds.top + node.clientTop;
            const right = left + node.clientWidth;
            const bottom = top + node.clientHeight;
            const clipped = rect && ((clipsX && (rect.left < left - 1 || rect.right > right + 1)) ||
                (clipsY && (rect.top < top - 1 || rect.bottom > bottom + 1)));
            clippingAncestors.push({ selector: node.id ? `#${node.id}` : node.tagName.toLowerCase(), left, top, right, bottom, clipsX, clipsY, clipped: !!clipped });
        }
        const inViewport = !!rect && rect.width > 0 && rect.height > 0 &&
            rect.left >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1;
        return {
            viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY },
            sliderWidths: {
                tempo: document.querySelector('#tempo-slider').getBoundingClientRect().width,
                volume: document.querySelector('#volume-slider').getBoundingClientRect().width
            },
            modal: describe(document.querySelector('#share-modal')),
            content: describe(document.querySelector('#share-content')),
            target: { selector, focused: document.activeElement === target, rect, inViewport,
                fullyVisible: inViewport && clippingAncestors.every(node => !node.clipped) },
            clippingAncestors
        };
    }, selector);
}

async function verifyShareKeyboardReachability(page, artifactDir, size) {
    const diagnostics = { size, initial: await shareLayoutDiagnostics(page, '#share-close-btn'), keyboard: [] };
    try {
        // 実際のTab移動によるブラウザーのスクロール結果を測る。fullPage画像上の座標は使わない。
        for (const selector of ['#share-link-input', '#share-copy-btn', '#share-ok-btn', '#share-close-btn']) {
            await page.keyboard.press('Tab');
            await assertFocused(page, selector, `${selector}へTabキーで移動できる`);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
            diagnostics.keyboard.push(await shareLayoutDiagnostics(page, selector));
        }
    } finally {
        if (artifactDir) await writeFile(path.join(artifactDir, `${size}-share-layout.json`), `${JSON.stringify(diagnostics, null, 2)}\n`);
    }
    for (const snapshot of diagnostics.keyboard) {
        assert.equal(snapshot.target.fullyVisible, true,
            `${size}: ${snapshot.target.selector}がTabで選択しても画面または親の外に隠れています ${JSON.stringify(snapshot)}`);
    }
}

async function verifyModals(page, artifactDir, size) {
    const help = page.locator('#help-modal');
    for (const close of ['button', 'escape', 'ok']) {
        await page.locator('#help-btn').click();
        await page.waitForFunction(() => document.querySelector('#help-modal').open);
        assert.equal(await help.evaluate(node => node instanceof HTMLDialogElement && node.matches(':modal')), true, 'ヘルプはnative modal dialogとして開く');
        assert.equal(await page.locator('#help-btn').getAttribute('aria-expanded'), 'true', 'ヘルプ起動状態を通知する');
        assert.equal(await help.isVisible(), true, 'ヘルプ本文が見える');
        await page.waitForFunction(() => document.querySelector('#help-modal').contains(document.activeElement));
        // 開いている間の重複起動でもshowModal例外を出さない。
        await page.evaluate(() => document.querySelector('#help-btn').click());
        if (close === 'button') {
            await screenshot(page, artifactDir, `${size}-help`, { fullPage: false });
            await page.locator('#help-close-btn').click();
        } else if (close === 'escape') {
            const before = await pattern(page);
            await page.keyboard.press('Digit2');
            assert.deepEqual(await pattern(page), before, 'ヘルプ内の数字キーで背面パターンを変更しない');
            await page.keyboard.press('Escape');
        } else {
            await page.locator('#help-ok-btn').click();
        }
        await page.waitForFunction(() => !document.querySelector('#help-modal').open);
        await assertFocused(page, '#help-btn', 'ヘルプを閉じると起動元へ戻る');
        assert.equal(await page.locator('#help-btn').getAttribute('aria-expanded'), 'false', 'ヘルプ終了状態を通知する');
    }

    await page.locator('#share-btn').click();
    await assertFocused(page, '#share-close-btn', '共有画面を開くと閉じるボタンへフォーカスする');
    assert.equal(await page.locator('#share-modal').getAttribute('aria-hidden'), 'false', '共有画面の表示を通知する');
    const originalShareUrl = await page.locator('#share-link-input').inputValue();
    assert.equal(await page.evaluate(() => {
        window.__rhythmQrNode = document.querySelector('#share-qrcode canvas, #share-qrcode img');
        return !!window.__rhythmQrNode;
    }), true, '共有URLのQRコードを生成する');
    await screenshot(page, artifactDir, `${size}-share`, { fullPage: false });
    await assertNoHorizontalOverflow(page, '共有画面');
    await verifyShareKeyboardReachability(page, artifactDir, size);
    await page.keyboard.press('Shift+Tab');
    await assertFocused(page, '#share-ok-btn', '共有の先頭からShift+Tabで最後へ循環する');
    await page.keyboard.press('Tab');
    await assertFocused(page, '#share-close-btn', '共有の最後からTabで先頭へ循環する');
    for (let index = 0; index < 8; index += 1) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.querySelector('#share-content').contains(document.activeElement)), true, '共有中はTabで背面へ抜けない');
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#share-modal').classList.contains('hidden'));
    await assertFocused(page, '#share-btn', '共有Escape終了後に起動元へ戻る');
    assert.equal(await page.locator('#share-btn').getAttribute('aria-expanded'), 'false', '共有終了状態を通知する');

    await page.locator('#share-btn').click();
    await assertFocused(page, '#share-close-btn', '共有を再び開ける');
    assert.equal(await page.locator('#share-link-input').inputValue(), originalShareUrl, '編集前の共有URLを再利用する');
    assert.equal(await page.evaluate(() => window.__rhythmQrNode === document.querySelector('#share-qrcode canvas, #share-qrcode img')), true, '同じ共有URLの再表示でQRノードを作り直さない');
    // 通常のクリックでは閉じるアニメーション待ちになるので、同一タスク内で競合を再現する。
    await page.evaluate(() => {
        document.querySelector('#share-close-btn').click();
        document.querySelector('#share-btn').click();
    });
    await page.waitForTimeout(360);
    assert.equal(await page.locator('#share-modal').isVisible(), true, '閉じる直後の再表示を古いタイマーが隠さない');
    assert.equal(await page.locator('#share-modal').getAttribute('aria-hidden'), 'false', '再表示後の共有画面は操作可能');
    assert.equal(await page.evaluate(() => document.querySelector('#share-content').contains(document.activeElement)), true, '再表示時に古いフォーカス復帰が背面へ飛ばさない');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#share-modal').classList.contains('hidden'));
    await assertFocused(page, '#share-btn', '閉じる途中の再表示を経ても最初の共有起動元へ戻る');

    await page.locator(`${CELLS}[data-type="kick"][data-index="1"]`).click();
    await page.locator('#share-btn').click();
    await assertFocused(page, '#share-close-btn', '編集後にも共有を開ける');
    assert.notEqual(await page.locator('#share-link-input').inputValue(), originalShareUrl, 'パターンを編集すると共有URLを更新する');
    assert.equal(await page.evaluate(() => window.__rhythmQrNode !== document.querySelector('#share-qrcode canvas, #share-qrcode img') && !!document.querySelector('#share-qrcode canvas, #share-qrcode img')), true, '編集後の共有URLではQRノードを更新する');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#share-modal').classList.contains('hidden'));
    await assertFocused(page, '#share-btn', '編集後の共有終了でも起動元へ戻る');

    await page.locator('[data-action="parents-modal-open"]').click();
    await page.waitForFunction(() => document.querySelector('#parents-modal').open);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#parents-modal').open);
    await assertFocused(page, '[data-action="parents-modal-open"]', '保護者説明のEscape終了後に起動元へ戻る');
    assert.equal(await page.locator('[data-action="parents-modal-open"]').getAttribute('aria-expanded'), 'false', '保護者説明終了状態を通知する');
}

async function verifyControls(page) {
    const input = page.locator('#tempo-input');
    await input.focus();
    await input.press('ControlOrMeta+A');
    await input.press('Backspace');
    // fillでは検出できない「1」を入力した瞬間の最小値丸めを実際のキー入力で検出する。
    for (const [key, expected] of [['1', '1'], ['7', '17'], ['3', '173']]) {
        await page.keyboard.type(key);
        assert.equal(await input.inputValue(), expected, `173 BPMの途中入力「${expected}」を勝手に書き換えない`);
    }
    await input.press('Tab');
    assert.equal(await input.inputValue(), '173', '逐次入力した173 BPMを確定できる');
    assert.equal(await page.locator('#tempo-slider').inputValue(), '173', '逐次入力したBPMとスライダーが一致する');

    const beforeInput = await pattern(page);
    const startsBefore = await page.evaluate(() => window.__rhythmTone?.starts || 0);
    await page.locator('#preset-name').focus();
    await page.keyboard.type('123456 ');
    assert.deepEqual(await pattern(page), beforeInput, '名前欄の数字入力でプリセットを切り替えない');
    assert.equal(await page.evaluate(() => window.__rhythmTone?.starts || 0), startsBefore, '名前欄のSpaceで再生しない');

    const cell = page.locator(`${CELLS}[data-type="kick"][data-index="0"]`);
    await cell.focus();
    const pressed = await cell.getAttribute('aria-pressed');
    await cell.press('Space');
    assert.equal(await cell.getAttribute('aria-pressed'), String(pressed !== 'true'), 'nativeセルのSpaceは一度だけ切り替える');
    await cell.press('Enter');
    assert.equal(await cell.getAttribute('aria-pressed'), pressed, 'nativeセルのEnterは一度だけ切り替える');
    assert.equal(await page.evaluate(() => window.__rhythmTone?.starts || 0), startsBefore, 'nativeセルのSpaceと全体再生を競合させない');
    const beforeButtonDigit = await pattern(page);
    await cell.press('Digit3');
    assert.deepEqual(await pattern(page), beforeButtonDigit, 'nativeボタン上の数字キーを全体ショートカットへ渡さない');

    await focusBody(page);
    for (const [index, name] of ['rock', 'house', 'hiphop', 'latin', 'funk', 'tomgroove'].entries()) {
        await page.keyboard.press(`Digit${index + 1}`);
        assert.equal(await page.locator(`#preset-${name}`).getAttribute('aria-pressed'), 'true', `背景の数字${index + 1}で${name}を読み込む`);
    }
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('#play-icon').textContent === 'stop');
    assert.equal(await page.evaluate(() => window.__rhythmTone.starts), startsBefore + 1, '背景のSpaceで一度だけ再生する');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#play-icon').textContent(), 'play_arrow', '背景のSpaceで停止する');
    assert.equal(await page.evaluate(() => window.__rhythmTone.activeEvents()), 0, '停止時に登録した繰り返しイベントを解除する');
}

async function verifyColorsAndNoop(page) {
    const inactiveColors = await page.evaluate(selector => [0, 4, 1].map(index => {
        const node = document.querySelector(`${selector}[data-type="hihat"][data-index="${index}"]`);
        return getComputedStyle(node).backgroundColor;
    }), CELLS);
    assert.equal(inactiveColors[0], 'rgba(51, 65, 85, 0.92)', '未選択の主拍セルに専用背景色を適用する');
    assert.equal(inactiveColors[1], 'rgba(30, 41, 59, 0.92)', '未選択の副拍セルに専用背景色を適用する');
    assert.equal(new Set(inactiveColors).size, 3, '主拍・副拍・通常セルの色を区別する');
    await page.locator('#preset-rock').click();
    await page.evaluate(selector => {
        window.__rhythmCellMutations = [];
        window.__rhythmCellObserver = new MutationObserver(records => {
            window.__rhythmCellMutations.push(...records.map(record => `${record.target.dataset.type}:${record.target.dataset.index}:${record.attributeName}`));
        });
        document.querySelectorAll(selector).forEach(node => window.__rhythmCellObserver.observe(node, { attributes: true }));
    }, CELLS);
    await page.locator('#preset-rock').click();
    const mutations = await page.evaluate(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve));
        window.__rhythmCellObserver.disconnect();
        return window.__rhythmCellMutations;
    });
    assert.deepEqual(mutations, [], '同じプリセットを再読込したとき80セルの属性を書き直さない');
    for (const instrument of INSTRUMENTS) {
        const selector = `${CELLS}[data-type="${instrument}"][data-index="0"]`;
        const cell = page.locator(selector);
        if (await cell.getAttribute('aria-pressed') !== 'true') await cell.click();
        await assertComputedStyles(page, [{ selector, styles: { backgroundColor: COLORS[instrument][0], borderTopColor: COLORS[instrument][1] } }], `${instrument}の選択色と枠線色を専用CSSで表示する`);
        const color = await cell.evaluate(node => [getComputedStyle(node).backgroundColor, getComputedStyle(node).borderTopColor]);
        assert.deepEqual(color, COLORS[instrument], `${instrument}の選択色と枠線色を専用CSSで表示する`);
        await cell.click();
        assert.equal(await cell.getAttribute('aria-pressed'), 'false', `${instrument}を解除するとaria-pressed=false`);
        await assertComputedStyles(page, [{ selector, styles: { backgroundColor: 'rgba(51, 65, 85, 0.92)', borderTopColor: 'rgba(148, 163, 184, 0.7)' } }], `${instrument}の解除後に未選択の主拍色へ戻る`);
        assert.notEqual(await cell.evaluate(node => getComputedStyle(node).backgroundColor), COLORS[instrument][0], `${instrument}を解除すると選択色を消す`);
        await cell.click();
        assert.equal(await cell.getAttribute('aria-pressed'), 'true', `${instrument}を再選択できる`);
        await assertComputedStyles(page, [{ selector, styles: { backgroundColor: COLORS[instrument][0], borderTopColor: COLORS[instrument][1] } }], `${instrument}を再選択すると選択色へ戻る`);
    }
}

async function verifyDarkMode(page, url, artifactDir, size) {
    const visibleIcons = () => page.locator('#dark-mode-toggle .material-symbols-rounded').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').map(node => node.textContent.trim()));
    const darkStyles = [
        { selector: 'body', styles: { backgroundColor: 'rgb(15, 23, 42)' } },
        { selector: '.glass-panel', styles: { backgroundColor: 'rgba(30, 41, 59, 0.95)' } },
        { selector: 'header', styles: { backgroundColor: 'rgb(30, 41, 59)' } }
    ];
    assert.deepEqual(await visibleIcons(), ['dark_mode'], '通常表示のテーマ切替アイコンは1つだけ');
    await page.locator('#dark-mode-toggle').click();
    await assertComputedStyles(page, darkStyles, 'body・パネル・ヘッダーのダーク配色がすべて最終色になる');
    assert.equal(await page.locator('#dark-mode-toggle').getAttribute('aria-pressed'), 'true', 'ダークモード状態を通知する');
    assert.deepEqual(await visibleIcons(), ['light_mode'], 'ダーク表示のテーマ切替アイコンは1つだけ');
    const palette = await page.evaluate(() => ({
        body: getComputedStyle(document.body).backgroundColor,
        panel: getComputedStyle(document.querySelector('.glass-panel')).backgroundColor,
        header: getComputedStyle(document.querySelector('header')).backgroundColor
    }));
    // パネルは共有テーマ、ヘッダーはdark utilityが優先される実表示の配色契約を確認する。
    assert.deepEqual(palette, { body: 'rgb(15, 23, 42)', panel: 'rgba(30, 41, 59, 0.95)', header: 'rgb(30, 41, 59)' }, 'body・パネル・ヘッダーすべてにダーク配色を適用する');
    await screenshot(page, artifactDir, `${size}-dark`);
    await ready(page, url);
    await assertComputedStyles(page, darkStyles, '再読込後に保存したダーク配色を復元する');
    assert.deepEqual(await visibleIcons(), ['light_mode'], '再読込後も保存したダーク設定と単一アイコンを復元する');
    assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-night')), true, '再読込後にダーク背景を復元する');
    await page.locator('#dark-mode-toggle').click();
    await assertComputedStyles(page, [{ selector: 'body', styles: { backgroundColor: 'rgb(253, 242, 248)' } }], 'ライト表示の背景色へ戻る');
    assert.deepEqual(await visibleIcons(), ['dark_mode'], 'ライト表示へ戻せる');
}

async function verifyAudio(run, baseUrl) {
    const viewport = VIEWPORTS[1];
    for (const cancellation of ['stop', 'hidden']) {
        await checkCase(run, `音声開始待ちの${cancellation}キャンセル`, viewport, async ({ page }) => {
            await ready(page, baseUrl);
            await page.locator('#play-btn').click();
            await page.waitForFunction(() => window.__rhythmTone?.startRequests === 1);
            if (cancellation === 'stop') await page.locator('#play-btn').click();
            else await page.evaluate(() => {
                Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
                document.dispatchEvent(new Event('visibilitychange'));
            });
            await page.evaluate(async () => {
                window.__rhythmTone.resolveStarts();
                // initAudioとtogglePlayの後続microtaskまで進める。
                await new Promise(resolve => setTimeout(resolve, 0));
            });
            assert.equal(await page.evaluate(() => window.__rhythmTone.starts), 0, 'キャンセル済みの開始待ちを後から再生しない');
            assert.equal(await page.evaluate(() => window.__rhythmTone.activeEvents()), 0, 'キャンセル後にTransportイベントを残さない');
            assert.equal(await page.locator('#play-icon').textContent(), 'play_arrow', 'キャンセル後は停止表示を保つ');
            if (cancellation === 'hidden') await page.evaluate(() => {
                Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
                document.dispatchEvent(new Event('visibilitychange'));
            });
            await page.locator('#play-btn').click();
            await page.waitForFunction(() => window.__rhythmTone.starts === 1);
            await page.locator('#play-btn').click();
            assert.equal(await page.evaluate(() => window.__rhythmTone.activeEvents()), 0, 'キャンセル後にも再生・停止をやり直せる');
        }, { holdStart: true });
    }

    await checkCase(run, 'Tone引数・停止後の古いDraw・繰り返し再生', viewport, async ({ page }) => {
        await ready(page, baseUrl);
        const inactiveIndicatorStyles = await page.locator('#step-indicators > *').evaluateAll(nodes => nodes.map(node => ({
            selector: `#${node.id}`, styles: { backgroundColor: getComputedStyle(node).backgroundColor }
        })));
        await page.locator('#instrument-hihat').click();
        await page.waitForFunction(() => window.__rhythmTone?.sounds.length > 0);
        const preview = await page.evaluate(() => window.__rhythmTone.sounds.find(sound => sound.kind === 'MetalSynth'));
        assert.equal(preview.args[0], 200, 'ハイハット試聴は音程200を第1引数へ渡す');
        assert.equal(preview.args[1], '32n', 'ハイハット試聴は32分音符を第2引数へ渡す');
        await page.locator('#preset-rock').click();
        await page.waitForFunction(() => window.__rhythmTone.sounds.length >= 2);
        await page.locator('#play-btn').click();
        await page.waitForFunction(() => window.__rhythmTone.starts === 1);
        await page.evaluate(() => {
            window.__rhythmTone.sounds = [];
            window.__rhythmTone.tick(42.125);
        });
        const scheduled = await page.evaluate(() => window.__rhythmTone.sounds.find(sound => sound.kind === 'MetalSynth'));
        assert.deepEqual(scheduled.args, [200, '32n', 42.125], 'Transport時刻をハイハットの第3引数へそのまま渡す');
        assert.equal(await page.evaluate(() => window.__rhythmTone.takeDraws()), 1, '1ステップにつき描画は1回だけ予約する');
        await page.locator('#play-btn').click();
        const stoppedIndicators = await page.locator('#step-indicators > *').evaluateAll(nodes => nodes.map(node => node.className));
        await page.locator('#play-btn').click();
        await page.waitForFunction(() => window.__rhythmTone.starts === 2);
        await page.evaluate(() => window.__rhythmTone.flushStaleDraws());
        assert.deepEqual(await page.locator('#step-indicators > *').evaluateAll(nodes => nodes.map(node => node.className)), stoppedIndicators, '再生し直しても前の世代のDrawを反映しない');
        await page.evaluate(() => { window.__rhythmTone.tick(43); window.__rhythmTone.flushDraws(); });
        assert.equal(await page.locator('#ind-0').evaluate(node => node.classList.contains('bg-white')), true, '新しい世代の描画は先頭ステップから反映する');
        await assertComputedStyles(page, [{ selector: '#ind-0', styles: { backgroundColor: 'rgb(255, 255, 255)' } }], '主拍インジケーターの再生中の白色へ到達する');
        assert.equal(await page.locator('#ind-0').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)', '主拍インジケーターも再生中は実際に白く表示する');
        await page.evaluate(() => { window.__rhythmTone.tick(43.125); window.__rhythmTone.flushDraws(); });
        await assertComputedStyles(page, [
            { selector: '#ind-1', styles: { backgroundColor: 'rgb(255, 255, 255)' } },
            inactiveIndicatorStyles[0]
        ], '通常拍を白くし、前の主拍を元の背景色へ戻す');
        assert.equal(await page.locator('#ind-1').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)', '通常拍インジケーターも再生中は白く表示する');
        assert.notEqual(await page.locator('#ind-0').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)', '次のステップへ進むと前の主拍表示を戻す');
        await page.locator('#play-btn').click();
        await assertComputedStyles(page, inactiveIndicatorStyles, '停止すると全インジケーターを元の背景色へ戻す');
        assert.equal(await page.locator('#step-indicators > *').evaluateAll(nodes => nodes.some(node => getComputedStyle(node).backgroundColor === 'rgb(255, 255, 255)')), false, '停止するとすべての白い再生表示を消す');
        for (let index = 0; index < 3; index += 1) {
            await page.locator('#play-btn').click();
            await page.waitForFunction(() => window.__rhythmTone.activeEvents() === 1);
            await page.locator('#play-btn').click();
            assert.equal(await page.evaluate(() => window.__rhythmTone.activeEvents()), 0, '再生停止を繰り返してもイベントを蓄積しない');
        }
        const audio = await page.evaluate(() => ({ intervals: window.__rhythmTone.scheduleIntervals, cleared: window.__rhythmTone.clearIds }));
        assert.ok(audio.intervals.every(interval => interval === '16n'), 'すべての再生が16分音符間隔で動く');
        assert.equal(audio.cleared.length, audio.intervals.length, '登録したTransportイベントを一度ずつ解除する');
        assert.equal(new Set(audio.cleared).size, audio.cleared.length, '同じTransportイベントを重複解除しない');
    });
}

function savedFixture() {
    const pattern = Object.fromEntries(INSTRUMENTS.map(name => [name, Array(16).fill(0)]));
    pattern.kick[7] = 1;
    return { schemaVersion: 2, tempo: 151, pattern, updatedAt: 123456789 };
}

async function verifyPersistenceFailures(run, baseUrl) {
    const viewport = VIEWPORTS[1];
    await checkCase(run, '容量不足の保存と削除は既存作品を保護', viewport, async ({ context, page }) => {
        const existing = { ...savedFixture(), id: 'existing-project', name: '既存作品', createdAt: 123456789 };
        await context.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify([value])), { key: PROJECTS_KEY, value: existing });
        await ready(page, baseUrl);
        const storageBefore = await page.evaluate(key => localStorage.getItem(key), PROJECTS_KEY);
        await page.evaluate(() => {
            Storage.prototype.setItem = function () { throw new DOMException('テスト用の容量不足', 'QuotaExceededError'); };
        });
        await page.locator('#preset-name').fill('保存に失敗する作品');
        await page.locator('#save-preset-btn').click();
        assert.equal(await page.locator('#user-preset-list .user-preset-item').count(), 1, '保存失敗時は一覧に架空の作品を追加しない');
        assert.equal(await page.locator('#preset-name').inputValue(), '保存に失敗する作品', '保存失敗時は入力名を消さない');
        assert.equal(await page.locator('#error-toast').isVisible(), true, '容量不足を画面に通知する');
        assert.equal(await page.evaluate(key => localStorage.getItem(key), PROJECTS_KEY), storageBefore, '容量不足時に既存の保存内容を変えない');
        page.once('dialog', dialog => dialog.accept());
        await page.locator('.user-preset-delete').click();
        assert.equal(await page.locator('#user-preset-list .user-preset-item').count(), 1, '削除の書き込み失敗時も一覧を保持する');
        assert.equal(await page.evaluate(key => localStorage.getItem(key), PROJECTS_KEY), storageBefore, '削除失敗時に保存済み作品を失わない');
        const cell = page.locator(`${CELLS}[data-type="clap"][data-index="0"]`);
        await cell.click();
        assert.equal(await cell.getAttribute('aria-pressed'), 'true', '保存障害中もセル編集は使える');
        await page.locator('#dark-mode-toggle').click();
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-night')), true, '保存障害中もテーマ変更は使える');
    });

    await checkCase(run, 'localStorage getter拒否でも編集可能', viewport, async ({ context, page }) => {
        await context.addInitScript(() => {
            Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('テスト用の保存禁止', 'SecurityError'); } });
        });
        await ready(page, baseUrl);
        assert.equal(await page.locator(CELLS).count(), 80, '保存領域自体にアクセスできなくてもグリッドを初期化する');
        await page.locator('#preset-house').click();
        assert.equal(await page.locator('#preset-house').getAttribute('aria-pressed'), 'true', '保存禁止中もお手本を選べる');
        await page.locator('#preset-name').fill('保存禁止テスト');
        await page.locator('#save-preset-btn').click();
        assert.equal(await page.locator('#preset-name').inputValue(), '保存禁止テスト', '保存先getter拒否でも入力名を保つ');
        assert.equal(await page.locator('#error-toast').isVisible(), true, '保存先getter拒否を画面に通知する');
        await page.locator('#dark-mode-toggle').click();
        assert.equal(await page.locator('body').evaluate(node => node.classList.contains('theme-night')), true, '保存先getter拒否中もダークモードを切り替える');
        await page.locator('#volume-slider').evaluate(node => { node.value = '43'; node.dispatchEvent(new Event('input', { bubbles: true })); });
        assert.equal(await page.locator('#volume-display').textContent(), '43', '保存先getter拒否中も音量変更を反映する');
        await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    });

    const imported = savedFixture();
    imported.tempo = 173;
    imported.pattern.hihat[0] = 1;
    const goodPayload = Buffer.from(JSON.stringify(imported)).toString('base64url');
    const cases = [
        { name: '共有取り込みのキャンセル', payload: goodPayload, cancelled: true },
        { name: '壊れた共有データ', payload: '%%%invalid%%%', cancelled: false },
        { name: '不正な共有パターン', payload: Buffer.from(JSON.stringify({ schemaVersion: 2, tempo: 173, pattern: { kick: [1] } })).toString('base64url'), cancelled: false },
        { name: '大きすぎる共有データ', payload: 'a'.repeat(4097), cancelled: false }
    ];
    for (const test of cases) {
        await checkCase(run, `${test.name}は既存自動保存を保護`, viewport, async ({ context, page }) => {
            const existing = savedFixture();
            const serialized = JSON.stringify(existing);
            await context.addInitScript(({ key, serialized }) => localStorage.setItem(key, serialized), { key: AUTOSAVE_KEY, serialized });
            let confirmations = 0;
            page.on('dialog', async dialog => { confirmations += 1; await dialog.dismiss(); });
            const url = new URL(baseUrl);
            url.searchParams.set('p', test.payload);
            await ready(page, url.href);
            assert.equal(confirmations, test.cancelled ? 1 : 0, '有効な共有だけ確認し、不正データでは確認を要求しない');
            assert.equal(await page.locator('#tempo-input').inputValue(), '151', '読み込みを中止したら既存BPMを復元する');
            assert.equal(await page.locator(`${CELLS}[data-type="kick"][data-index="7"]`).getAttribute('aria-pressed'), 'true', '既存パターンを復元する');
            assert.equal(await page.locator(`${CELLS}[data-type="hihat"][data-index="0"]`).getAttribute('aria-pressed'), 'false', '共有パターンを勝手に反映しない');
            assert.equal(await page.evaluate(key => localStorage.getItem(key), AUTOSAVE_KEY), serialized, '取り込み中止時は自動保存の値と更新日時をそのまま保つ');
            if (!test.cancelled) assert.equal(await page.locator('#error-toast').isVisible(), true, '不正共有データを画面に通知する');
        });
    }
}

/**
 * 起動済みPlaywright Browserを受け取る。ブラウザーやローカルサーバーはここでは起動しない。
 * 基準版比較は主要矩形と本文の契約のみ。既知の色・ヘルプ・アイコン修正を画素一致とは扱わない。
 */
export async function runRhythmRegressions(browser, baseUrl, { baselineUrl, artifactDir } = {}) {
    if (artifactDir) await mkdir(artifactDir, { recursive: true });
    const run = { browser, artifactDir, results: [], failures: [] };
    const geometry = [];
    for (const viewport of VIEWPORTS) {
        const size = `${viewport.width}x${viewport.height}`;
        let baseline;
        if (baselineUrl) {
            await checkCase(run, `${size} 基準版の初期画面`, viewport, async ({ page }) => {
                await ready(page, baselineUrl);
                baseline = await snapshotGeometry(page);
                await screenshot(page, artifactDir, `${size}-before-initial`);
            });
        }
        await checkCase(run, `${size} 表示・操作・モーダル・配色`, viewport, async ({ page }) => {
            await ready(page, baseUrl);
            await screenshot(page, artifactDir, `${size}-after-initial`);
            const candidate = await snapshotGeometry(page);
            // 比較失敗時にも全矩形を残し、最初の差分だけで原因を推測しなくてよいようにする。
            if (artifactDir) await writeFile(path.join(artifactDir, `${size}-geometry.json`), `${JSON.stringify({ viewport, before: baseline, after: candidate }, null, 2)}\n`);
            assert.equal(await page.locator(CELLS).count(), 80, '5楽器×16ステップのnativeセルが80個ある');
            assert.equal(await page.locator(`${CELLS}[role]`).count(), 0, 'native buttonに不要なroleを追加しない');
            assert.equal(await page.locator(CELLS).evaluateAll(nodes => nodes.every(node => node.type === 'button')), true, 'すべてのセルがフォームを送信しないnative button');
            await assertNoHorizontalOverflow(page, `${size} 初期表示`);
            if (baseline) geometry.push({ viewport, before: baseline, after: candidate, allowedCorrections: compareGeometry(baseline, candidate, viewport) });
            await verifyColorsAndNoop(page);
            await screenshot(page, artifactDir, `${size}-selected-pattern`);
            await verifyModals(page, artifactDir, size);
            await verifyControls(page);
            await verifyDarkMode(page, baseUrl, artifactDir, size);
        });
    }
    await verifyAudio(run, baseUrl);
    await verifyPersistenceFailures(run, baseUrl);
    const summary = {
        viewports: VIEWPORTS,
        geometryComparisons: geometry.length,
        artifactDir: artifactDir || null,
        passed: run.results.filter(result => result.status === 'passed').length,
        failed: run.results.filter(result => result.status === 'failed').length,
        cases: run.results
    };
    // 失敗したケースがあっても、独立ケースをすべて試して集計を保存してからCIを失敗させる。
    if (artifactDir) {
        try {
            await writeFile(path.join(artifactDir, 'regression-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
            await writeFile(path.join(artifactDir, 'geometry-comparison.json'), `${JSON.stringify(geometry, null, 2)}\n`);
        } catch (artifactError) {
            run.failures.push(new Error(`追加E2Eの最終集計を保存できませんでした: ${artifactError.message}`, { cause: artifactError }));
        }
    }
    if (run.failures.length) {
        throw new AggregateError(run.failures, `Rhythm Lab追加E2E: ${summary.failed}/${run.results.length}ケースで失敗（成功${summary.passed}件）。個別エラーとregression-summary.jsonを確認してください。`);
    }
    return summary;
}

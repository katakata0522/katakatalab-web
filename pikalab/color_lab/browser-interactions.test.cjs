const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const enabled = process.env.RUN_PIKALAB_COLOR_BROWSER === '1';

// 配信物の操作・CSS・フォーカスは許可されたCIの実ブラウザで検査する。
test('いろのじっけんしつの保存・混色・コース・ダイアログを実ブラウザで確認する', { skip: !enabled, timeout: 180000 }, async t => {
    const { chromium } = require('playwright');
    const root = path.resolve(__dirname, '../dist');
    const artifacts = path.resolve(__dirname, '../visual-guard-artifacts/color');
    const baselineRoot = path.resolve(__dirname, '../../.pikalab-baseline/pikalab/dist');
    const hasBaseline = fs.existsSync(path.join(baselineRoot, 'color_lab/index.html'));
    if (process.env.PIKALAB_COMPARE_BASELINE === 'true') assert.ok(hasBaseline, '表示比較を要求した検証ではbaseline配信物が必要');
    const server = http.createServer((req, res) => {
        try {
            const pathname = new URL(req.url, 'http://localhost').pathname;
            const baseline = pathname.startsWith('/baseline/pikalab/');
            const prefix = baseline ? '/baseline/pikalab/' : '/pikalab/';
            assert.ok(pathname.startsWith(prefix));
            const activeRoot = baseline ? baselineRoot : root;
            let relative = decodeURIComponent(pathname.slice(prefix.length));
            if (relative.endsWith('/')) relative += 'index.html';
            const file = path.resolve(activeRoot, relative);
            assert.ok(file.startsWith(activeRoot + path.sep));
            const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
            const bytes = fs.readFileSync(file);
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
            res.end(bytes);
        } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    t.after(async () => { await browser?.close(); await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); });
    browser = await chromium.launch({ headless: true });
    fs.mkdirSync(artifacts, { recursive: true });
    const url = `http://127.0.0.1:${server.address().port}/pikalab/color_lab/`;
    const reports = [];
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
        const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
        await context.addInitScript(() => { Math.random = () => 0.1; });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForSelector('.palette-use-btn');
        await page.screenshot({ path: path.join(artifacts, `${viewport.width}-initial.png`), fullPage: true });
        assert.equal(await page.locator('#saved-colors-container button button').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        const slotGeometry = await page.locator('.palette-slot').evaluateAll(slots => slots.map(slot => ({ width: slot.getBoundingClientRect().width, height: slot.getBoundingClientRect().height })));
        assert.equal(slotGeometry.length, 4, '4色のスロットが表示される');
        assert.ok(slotGeometry.every(slot => slot.width > 0 && slot.height > 0), 'スロットが非表示・寸法ゼロにならない');
        let baselineSlotGeometry = null;
        // baseline比較が有効なCIだけで元画面と比較する。通常CIの404画面を基準にしない。
        if (hasBaseline) {
            const baselinePage = await context.newPage();
            await baselinePage.goto(url.replace('/pikalab/', '/baseline/pikalab/'), { waitUntil: 'networkidle' });
            await baselinePage.waitForSelector('.palette-slot');
            baselineSlotGeometry = await baselinePage.locator('.palette-slot').evaluateAll(slots => slots.map(slot => ({ width: slot.getBoundingClientRect().width, height: slot.getBoundingClientRect().height })));
            assert.deepEqual(slotGeometry, baselineSlotGeometry, `スロット寸法は${viewport.width}pxで元画面と同じ`);
            await baselinePage.close();
        }

        await page.locator('#slider-r').press('End');
        await page.locator('#slider-g').press('Home');
        await page.locator('#slider-b').press('Home');
        assert.equal(await page.locator('#hex-code').textContent(), '#FF0000');
        await page.locator('.palette-use-btn').nth(0).click();
        assert.equal(await page.locator('.palette-use-btn').nth(0).evaluate(el => document.activeElement === el), true);
        await page.locator('#slider-r').press('Home');
        await page.locator('#slider-b').press('End');
        await page.locator('.palette-use-btn').nth(1).click();
        await page.locator('.palette-use-btn').nth(0).click();
        await page.locator('.palette-use-btn').nth(1).click();
        await page.locator('#blend-colors-btn').click();
        assert.equal(await page.locator('#blend-colors-btn').isDisabled(), true);
        await page.waitForFunction(() => document.getElementById('hex-code').textContent === '#800080');
        await page.waitForFunction(() => document.getElementById('blob-character').classList.contains('animate-blob') && !document.getElementById('blob-character').classList.contains('character-pop-burst'));
        assert.equal(await page.evaluate(() => localStorage.getItem('color_lab_blend_count')), '1');
        await page.screenshot({ path: path.join(artifacts, `${viewport.width}-mixed.png`), fullPage: true });
        assert.ok(await page.locator('.toast').count() > 0);
        assert.ok((await page.locator('.toast').evaluateAll(toasts => toasts.map(el => getComputedStyle(el).pointerEvents))).every(value => value === 'none'), '通知はパレットのポインター操作を遮らない');

        // 選択した色を並べ替えても選択対象・保存値が追従する。
        await page.locator('.palette-use-btn').nth(0).click();
        // 狭い画面でも全スロットを先に表示し、ドラッグ中の自動スクロールを避ける。
        await page.locator('#view-lab').evaluate(el => { el.style.scrollBehavior = 'auto'; });
        await page.locator('#saved-colors-container').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'auto' }));
        await page.waitForTimeout(200);
        await page.locator('#saved-colors-container').evaluate(el => {
            window.__paletteDrag = [];
            for (const type of ['dragstart', 'dragover', 'drop', 'dragend']) el.addEventListener(type, event => window.__paletteDrag.push({ type, slot: event.target.closest('.palette-slot')?.dataset.slotIndex }));
        });
        const sourceSlot = await page.locator('.palette-slot').nth(0).boundingBox();
        const targetSlot = await page.locator('.palette-slot').nth(2).boundingBox();
        const pointerTargets = await page.evaluate(({ sourceSlot, targetSlot }) => [sourceSlot, targetSlot].map(rect => document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.palette-slot')?.dataset.slotIndex), { sourceSlot, targetSlot });
        assert.deepEqual(pointerTargets, ['0', '2'], '表示中のスロットにネイティブ入力が届く');
        await page.mouse.move(sourceSlot.x + sourceSlot.width / 2, sourceSlot.y + sourceSlot.height / 2);
        await page.mouse.down();
        await page.mouse.move(targetSlot.x + targetSlot.width / 2, targetSlot.y + targetSlot.height / 2, { steps: 12 });
        await page.mouse.move(targetSlot.x + targetSlot.width / 2, targetSlot.y + targetSlot.height / 2 + 1);
        await page.mouse.up();
        assert.equal(await page.locator('.palette-slot').nth(2).evaluate(el => el.classList.contains('selected')), true, JSON.stringify({ viewport, sourceSlot, targetSlot, events: await page.evaluate(() => window.__paletteDrag) }));
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('color_lab_saved_colors'))[2].r), 255);
        await page.locator('.palette-slot').nth(2).locator('.palette-delete-btn').click();
        assert.equal(await page.locator('.palette-use-btn').nth(2).evaluate(el => document.activeElement === el), true);

        // コード形式を変えるだけならレシピ固有名は変化しない。
        await page.locator('#recipe-tab-fantasy').click();
        await page.getByRole('button', { name: '夕暮れのそら', exact: true }).click();
        await page.locator('#hex-code').click();
        assert.equal(await page.locator('#color-name-display').textContent(), '夕暮れのそら');
        await page.locator('#recipe-tab-basic').click();
        await page.getByRole('button', { name: 'しろ', exact: true }).click();
        await page.getByRole('button', { name: 'くろ', exact: true }).click();
        assert.equal(await page.locator('#svg-sunglasses').evaluate(el => el.classList.contains('hidden')), true);

        await page.locator('#open-dressup-btn').click();
        assert.equal(await page.locator('main').evaluate(el => el.inert), true);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'close-dressup-btn');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'confirm-dressup-btn');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'close-dressup-btn');
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'open-dressup-btn');
        assert.equal(await page.locator('main').evaluate(el => el.inert), false);

        await page.locator('#tab-game').click();
        for (const course of ['normal', 'challenge']) {
            await page.locator(`#start-${course}-game`).click();
            assert.equal(await page.locator('#game-level-total').isVisible(), true);
            for (let round = 0; round < 10; round++) {
                const target = (await page.locator('#game-target-rgb').textContent()).match(/\d+/g).map(Number);
                for (const [index, channel] of ['r', 'g', 'b'].entries()) {
                    await page.locator(`#game-${channel}`).evaluate((element, value) => { element.value = String(value); element.dispatchEvent(new Event('input', { bubbles: true })); }, target[index]);
                }
                await page.locator('#check-btn').click();
                assert.equal(await page.locator('#result-score').textContent(), '100てん');
                await page.locator('#next-level-btn').click();
            }
            assert.equal(await page.locator('#game-complete').isVisible(), true);
            assert.match(await page.locator('#final-score').textContent(), /1000/);
            await page.waitForTimeout(400);
            assert.equal(await page.locator('.shiny-particle').count(), 0);
            assert.equal(await page.evaluate(() => document.activeElement.id), 'exit-game-from-complete');
            await page.screenshot({ path: path.join(artifacts, `${viewport.width}-${course}-complete.png`), fullPage: true });
            await page.locator('#exit-game-from-complete').click();
        }
        await page.locator('#start-timeattack-game').click();
        assert.equal(await page.locator('#game-level-total').isVisible(), false);
        assert.doesNotMatch(await page.locator('#game-progress-title').innerText(), /\/\s*10/);
        await page.locator('#tab-game').press('ArrowLeft');
        assert.equal(await page.locator('#view-lab').isVisible(), true);
        await page.locator('#tab-lab').press('ArrowRight');
        assert.equal(await page.locator('#game-menu').isVisible(), true);
        assert.equal(await page.locator('.shiny-particle').count(), 0);
        await page.locator('#open-calendar-btn').click();
        assert.ok(await page.locator('.calendar-day-cell.stamped').count() >= 1);
        await page.keyboard.press('Escape');
        await page.locator('#open-trophy-btn').click();
        assert.match(await page.locator('#trophy-title-normal').textContent(), /1000/);
        await page.keyboard.press('Escape');
        assert.deepEqual(errors, []);
        reports.push({ viewport, slotGeometry, baselineSlotGeometry, errors, normalScore: 1000, challengeScore: 1000 });
        await context.close();
    }
    // 壊れた保存値・低モーション設定でも操作を継続できる。
    const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.addInitScript(() => {
        localStorage.setItem('color_lab_daily_stamps', 'null');
        localStorage.setItem('color_lab_save_count', 'garbage');
        localStorage.setItem('color_lab_saved_colors', '{broken');
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('#tab-game').click();
    await page.locator('#open-calendar-btn').click();
    assert.equal(await page.locator('#calendar-modal').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.locator('#tab-lab').click();
    await page.locator('.palette-use-btn').nth(0).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('color_lab_save_count')), '1');
    const reducedAnimation = await page.locator('#blob-character').evaluate(element => { element.classList.add('character-mixer-spin'); return getComputedStyle(element).animationName; });
    assert.equal(reducedAnimation, 'none');
    assert.deepEqual(errors, []);
    await page.locator('#tab-game').click();
    await page.clock.install();
    await page.locator('#start-timeattack-game').click();
    await page.clock.runFor(31000);
    assert.equal(await page.locator('#game-complete').isVisible(), true);
    assert.equal(await page.locator('#complete-title').textContent(), 'タイムアップ！');
    assert.equal(await page.locator('.shiny-particle').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'exit-game-from-complete');
    assert.deepEqual(errors, []);
    await context.close();
    fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify({ reports, malformedStorageErrors: errors, reducedAnimation }, null, 2));
});


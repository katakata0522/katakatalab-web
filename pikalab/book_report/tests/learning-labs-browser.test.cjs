const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

// CIではビルド成果物を必須にする。ローカルの実ブラウザ検証とは区別する。
const isCI = process.env.CI === 'true' || process.env.CI === '1';
const distRoot = path.resolve(__dirname, '../../dist');
const mimeTypes = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'
};

function createStaticServer() {
    return http.createServer((request, response) => {
        try {
            let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            if (pathname.startsWith('/pikalab/')) pathname = pathname.slice('/pikalab'.length);
            if (pathname.endsWith('/')) pathname += 'index.html';
            const filename = path.resolve(distRoot, `.${pathname}`);
            if (!filename.startsWith(`${distRoot}${path.sep}`)) {
                response.writeHead(403).end();
                return;
            }
            fs.readFile(filename, (error, content) => {
                if (error) { response.writeHead(404).end(); return; }
                response.setHeader('Content-Type', mimeTypes[path.extname(filename)] || 'application/octet-stream');
                response.end(content);
            });
        } catch {
            response.writeHead(400).end();
        }
    });
}

async function dispatchVisibility(page, hidden) {
    // 実DOM上で、ブラウザが発火するのと同じ一時停止・再開ハンドラーを検査する。
    await page.evaluate(value => {
        Object.defineProperty(document, 'hidden', { configurable: true, value });
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
}

test('学習ラボのビルド成果物: 保存・タイマー・水深の回帰検証', { skip: !isCI, timeout: 90000 }, async t => {
    for (const lab of ['book_report', 'color_lab', 'deepsea_lab', 'kanji_lab']) {
        assert.ok(fs.existsSync(path.join(distRoot, lab, 'index.html')), `先にbuild:allを実行してください: ${lab}`);
    }
    const server = createStaticServer();
    let browser;
    t.after(async () => {
        try { await browser?.close(); }
        finally {
            server.closeAllConnections();
            if (server.listening) await new Promise(resolve => server.close(resolve));
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const { chromium } = require('playwright');
    browser = await chromium.launch({ headless: true });

    async function withPage(lab, check) {
        const context = await browser.newContext();
        try {
            // フォント・外部画像の配信状態に機能回帰テストを依存させない。
            await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort());
            const page = await context.newPage();
            page.setDefaultTimeout(10000);
            page.setDefaultNavigationTimeout(15000);
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(`${baseUrl}/${lab}/`, { waitUntil: 'domcontentloaded' });
            await check(page);
            assert.deepEqual(errors, [], `${lab}の実行時エラー`);
        } finally {
            await context.close();
        }
    }

    await t.test('読書感想文: しおり往復と再読込で直前の入力を保つ', () => withPage('book_report', async page => {
        await page.locator('#book-grade-support').waitFor();
        await page.evaluate(() => {
            localStorage.setItem('bookReportQuestData_slot_1', JSON.stringify({ formData: { motivation: 'cover', sceneFeeling: '感動した' }, currentStep: 1 }));
            localStorage.setItem('bookReportQuestData_slot_2', JSON.stringify({ formData: { motivation: 'recommend', sceneFeeling: '悲しかった' }, currentStep: 1 }));
            localStorage.setItem('bookReportQuestActiveSlot', '1');
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('#book-grade-support').waitFor();
        async function assertChoices(motivation, feeling) {
            const choices = await page.evaluate(() => ({
                motivations: [...document.querySelectorAll('input[name="motivation"]:checked')].map(radio => radio.value),
                cards: [...document.querySelectorAll('.option-card.selected input[name="motivation"]')].map(radio => radio.value),
                feelings: [...document.querySelectorAll('.feeling-chip.selected')].map(chip => chip.dataset.val),
                pressed: [...document.querySelectorAll('.feeling-chip[aria-pressed="true"]')].map(chip => chip.dataset.val)
            }));
            assert.deepEqual(choices, {
                motivations: motivation ? [motivation] : [], cards: motivation ? [motivation] : [],
                feelings: feeling ? [feeling] : [], pressed: feeling ? [feeling] : []
            });
        }
        await assertChoices('cover', '感動した');
        await page.locator('#book-title').fill('しおり1の未保存入力');
        await page.locator('.slot-tab[data-slot="2"]').click();
        await page.waitForFunction(() => localStorage.getItem('bookReportQuestActiveSlot') === '2');
        assert.equal(await page.locator('#book-title').inputValue(), '');
        await assertChoices('recommend', '悲しかった');
        await page.locator('#book-title').fill('しおり2の未保存入力');
        await page.locator('.slot-tab[data-slot="1"]').click();
        await page.waitForFunction(() => localStorage.getItem('bookReportQuestActiveSlot') === '1');
        assert.equal(await page.locator('#book-title').inputValue(), 'しおり1の未保存入力');
        await assertChoices('cover', '感動した');
        const secondSlot = await page.evaluate(() => JSON.parse(localStorage.getItem('bookReportQuestData_slot_2')).formData);
        assert.equal(secondSlot.motivation, 'recommend');
        assert.equal(secondSlot.sceneFeeling, '悲しかった');
        await page.locator('.slot-tab[data-slot="3"]').click();
        await page.waitForFunction(() => localStorage.getItem('bookReportQuestActiveSlot') === '3');
        await assertChoices('', '');
        await page.locator('#book-title').fill('空のしおりへの入力');
        await page.locator('.slot-tab[data-slot="1"]').click();
        await page.waitForFunction(() => localStorage.getItem('bookReportQuestActiveSlot') === '1');
        const emptySlot = await page.evaluate(() => JSON.parse(localStorage.getItem('bookReportQuestData_slot_3')).formData);
        assert.equal(emptySlot.motivation, '');
        assert.equal(emptySlot.sceneFeeling, '');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('#book-grade-support').waitFor();
        assert.equal(await page.locator('#book-title').inputValue(), 'しおり1の未保存入力');
        await assertChoices('cover', '感動した');
        assert.equal(await page.locator('#book-grade-support').count(), 1);
    }));

    await t.test('カラー: 復帰後も残り時間とボーナスを保つ', () => withPage('color_lab', async page => {
        await page.locator('#tab-game').click();
        await page.clock.install();
        await page.locator('#start-timeattack-game').click();
        await page.clock.runFor(3000);
        assert.equal(await page.locator('#game-timer-display').innerText(), '27');
        await dispatchVisibility(page, true);
        await page.clock.runFor(1000);
        await dispatchVisibility(page, false);
        assert.equal(await page.locator('#game-timer-display').innerText(), '27');
        const target = (await page.locator('#game-target-rgb').innerText()).match(/\d+/g);
        for (const [index, channel] of ['r', 'g', 'b'].entries()) {
            await page.locator(`#game-${channel}`).evaluate((input, value) => {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }, target[index]);
        }
        await page.locator('#check-btn').click();
        const bonusTime = Number(await page.locator('#game-timer-display').innerText());
        assert.ok(bonusTime > 27);
        await dispatchVisibility(page, true);
        await dispatchVisibility(page, false);
        assert.equal(Number(await page.locator('#game-timer-display').innerText()), bonusTime);
    }));

    await t.test('深海: 主・ミニ水深計が描画後にも一致する', () => withPage('deepsea_lab', async page => {
        await page.waitForFunction(() => document.getElementById('creatures-container')?.children.length > 0);
        for (const width of [390, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            for (const scrollTop of [950, 3450, 0]) {
                await page.locator('#scroll-container').evaluate((container, top) => {
                    container.scrollTop = top;
                    container.dispatchEvent(new Event('scroll'));
                }, scrollTop);
                const expected = String(Math.max(0, Math.min(10000, Math.floor(scrollTop - 450))));
                await page.waitForFunction(value => ['depth-val', 'depth-val-mini'].every(id => document.getElementById(id)?.textContent?.replaceAll(',', '') === value), expected);
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                const values = await page.evaluate(() => ['depth-val', 'depth-val-mini'].map(id => document.getElementById(id).textContent.replaceAll(',', '')));
                assert.deepEqual(values, [expected, expected]);
            }
        }
    }));

    await t.test('漢字: 結果表示中はタブ復帰しても計時を再開しない', () => withPage('kanji_lab', async page => {
        await page.waitForFunction(() => Boolean(window.App));
        await page.locator('#tab-game').click();
        await page.locator('#quiz-combine-btn').click();
        await page.clock.install();
        await page.locator('#start-daily-btn').click();
        await page.clock.runFor(1000);
        await page.locator('#quiz-choices-left button').first().click();
        await page.locator('#quiz-choices-right button').first().click();
        await page.locator('#quiz-submit-btn').click();
        const elapsed = await page.locator('#quiz-current-time').innerText();
        await dispatchVisibility(page, true);
        await dispatchVisibility(page, false);
        await page.clock.runFor(2000);
        assert.equal(await page.locator('#quiz-current-time').innerText(), elapsed);
        await page.locator('#result-btn').click();
        await page.clock.runFor(1000);
        assert.ok(Number(await page.locator('#quiz-current-time').innerText()) > Number(elapsed));
    }));
});

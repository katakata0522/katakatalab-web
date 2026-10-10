const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const dist = path.join(root, 'dist');
// 明示的な実行指定は常に有効。CIの変更対象がEduplay以外ならこの重いE2Eだけ省く。
// 対象判定が失敗・欠落した場合は従来どおり実行し、見逃しを防ぐ。
const runBrowser = process.env.PIKALAB_BROWSER_TESTS === '1'
    || (Boolean(process.env.CI) && process.env.PIKALAB_CI_EDUPLAY !== 'false');
const clearGames = ['matching', 'hiragana', 'puzzle', 'shopping', 'zukan'];
const allPages = ['index', ...clearGames, 'piano'];

function serveBuild() {
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    const server = http.createServer((request, response) => {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/pikalab\//, '/');
        const target = path.resolve(dist, '.' + pathname);
        if (!target.startsWith(dist + path.sep)) {
            response.writeHead(403).end();
            return;
        }
        fs.readFile(target, (error, data) => {
            if (error) return response.writeHead(404).end();
            response.setHeader('Content-Type', (types[path.extname(target)] || 'application/octet-stream') + '; charset=utf-8');
            response.end(data);
        });
    });
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}

async function clearMatching(page, keyboard) {
    const cards = page.locator('#card-grid .card-container');
    await cards.first().waitFor();
    const groups = await cards.evaluateAll(nodes => {
        const pairs = {};
        nodes.forEach((node, index) => {
            const identity = node.querySelector('.card-back').textContent.trim();
            (pairs[identity] ||= []).push(index);
        });
        return Object.values(pairs);
    });
    assert.equal(groups.length, 6);
    for (const pair of groups) {
        assert.equal(pair.length, 2);
        for (const index of pair) {
            if (keyboard) await cards.nth(index).press('Enter');
            else await cards.nth(index).click();
        }
        await page.waitForFunction(indices => indices.every(index => document.querySelectorAll('#card-grid .card-container')[index].disabled), pair);
    }
    await page.locator('#clear-overlay').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.activeElement === document.querySelector('#clear-overlay button'));
    assert.equal(await page.locator('#app').getAttribute('inert'), 'true');
    assert.equal(await page.locator('#clear-overlay button').first().evaluate(node => !!node.closest('[inert]')), false);
}

test('Eduplayのクリア後再プレイ・キーボード・保護者モーダルを実ブラウザで確認する', {
    skip: runBrowser ? false : 'CIでChromiumを用意して実行。ローカルは PIKALAB_BROWSER_TESTS=1 で明示実行',
    timeout: 180000
}, async () => {
    assert.ok(fs.existsSync(path.join(dist, 'eduplay/matching.html')), '先に npm run build を実行する');
    let server;
    let browser;
    let page;
    try {
        server = await serveBuild();
        const base = `http://127.0.0.1:${server.address().port}`;
        browser = await chromium.launch({ headless: true });
        for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
            const context = await browser.newContext({ viewport });
            page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
            for (const name of allPages) {
                await page.goto(`${base}/pikalab/eduplay/${name}.html`, { waitUntil: 'load' });
                if (clearGames.includes(name)) {
                    assert.equal(await page.locator('#clear-overlay').evaluate(node => !!node.closest('#app')), false, `${name}: クリア画面をinert対象の外へ置く`);
                }
                const opener = page.locator('[data-action="parents-modal-open"]').first();
                await opener.click();
                await page.waitForFunction(() => document.querySelector('#parents-modal').open);
                await page.keyboard.press('Escape');
                await page.waitForFunction(() => !document.querySelector('#parents-modal').open && document.querySelector('[data-action="parents-modal-open"]').getAttribute('aria-expanded') === 'false');
                assert.equal(await opener.getAttribute('aria-expanded'), 'false', `${name}: Escapeで状態を戻す`);
                assert.equal(await opener.evaluate(node => document.activeElement === node), true);
                await opener.click();
                await page.locator('[data-action="parents-modal-close"]').first().click();
                await page.waitForFunction(() => !document.querySelector('#parents-modal').open);
            }
            await page.goto(`${base}/pikalab/eduplay/matching.html`, { waitUntil: 'load' });
            await clearMatching(page, false);
            const replay = page.locator('#clear-overlay button').first();
            await replay.click();
            await page.waitForFunction(() => !document.querySelector('#app').hasAttribute('inert'));
            assert.equal(await page.locator('#clear-overlay').isVisible(), false);
            assert.equal(await page.locator('#card-grid .card-container:disabled').count(), 0);
            await clearMatching(page, true);
            await page.locator('#clear-overlay a').last().focus();
            await page.keyboard.press('Tab');
            assert.equal(await replay.evaluate(node => document.activeElement === node), true, 'Tabがクリア画面内を循環する');
            await replay.press('Enter');
            await page.waitForFunction(() => !document.querySelector('#app').hasAttribute('inert'));
            await page.goto(`${base}/pikalab/eduplay/hiragana.html`, { waitUntil: 'load' });
            await page.locator('#btn-quiz').click();
            for (let answer = 0; answer < 5; answer++) {
                const prompt = await page.locator('#quiz-prompt').innerText();
                const character = prompt.match(/「(.+)」/)[1];
                await page.getByLabel(`${character}を選ぶ`, { exact: true }).click();
                await page.locator('#feedback-overlay').waitFor({ state: 'hidden' });
            }
            await page.locator('#clear-overlay').waitFor({ state: 'visible' });
            await page.locator('#clear-overlay button').first().click();
            let character = (await page.locator('#quiz-prompt').innerText()).match(/「(.+)」/)[1];
            await page.getByLabel(`${character}を選ぶ`, { exact: true }).click();
            await page.locator('#feedback-overlay').waitFor({ state: 'hidden' });
            // 旧コードは1問目の回答から500ms後に再度クリア画面を出していた。
            await page.waitForTimeout(700);
            assert.equal(await page.locator('#clear-overlay').isVisible(), false, 'ひらがなの再プレイは5問からやり直す');
            character = (await page.locator('#quiz-prompt').innerText()).match(/「(.+)」/)[1];
            await page.getByLabel(`${character}を選ぶ`, { exact: true }).click();
            await page.locator('#btn-learn').click();
            await page.waitForTimeout(2300);
            assert.equal(await page.locator('#quiz-prompt').isVisible(), false, 'モード変更後に古いクイズを再開しない');

            await page.goto(`${base}/pikalab/eduplay/shopping.html`, { waitUntil: 'load' });
            const quantity = Number(await page.locator('#target-number').innerText());
            // 500msの移動演出が終わる前にすべての品物へ連続入力する。
            await page.locator('#shelf-container button').evaluateAll(buttons => buttons.forEach(button => button.click()));
            await page.locator('#clear-overlay').waitFor({ state: 'visible' });
            assert.equal(Number(await page.locator('#counter').innerText()), quantity, '連打でも指定数で止まる');
            assert.deepEqual(errors, [], '操作中に未処理例外を発生させない');
            await context.close();
            page = null;
        }
    } catch (error) {
        if (page && !page.isClosed()) {
            const artifacts = path.join(root, 'visual-guard-artifacts');
            fs.mkdirSync(artifacts, { recursive: true });
            await page.screenshot({ path: path.join(artifacts, 'eduplay-regression-failure.png'), fullPage: true }).catch(() => {});
        }
        throw error;
    } finally {
        try {
            if (browser) await browser.close();
        } finally {
            if (server) await new Promise(resolve => server.close(resolve));
        }
    }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const enabled = process.env.RUN_PIKALAB_KANJI_BROWSER === '1';
const STORAGE_KEY = 'pikalab_kanji_progress';
const INITIAL_GEOMETRY = [
    '#display-left', '#display-right', '#result-box', '#mode-lr', '#mode-ud',
    '#list-p1 button:first-child', '#list-p2 button:first-child'
];

// 実ブラウザは許可されたCIでのみ起動する。通常のnodeテストでは依存物もサーバーも不要。
test('漢字ラボの配信物・全問進行・保存・重ねたダイアログを実ブラウザで確認する', {
    skip: !enabled, timeout: 420000
}, async t => {
    const { chromium } = require('playwright');
    const root = path.resolve(__dirname, '../../dist');
    const baselineRoot = path.resolve(__dirname, '../../../.pikalab-baseline/pikalab/dist');
    if (process.env.PIKALAB_COMPARE_BASELINE === 'true') {
        assert.ok(fs.existsSync(path.join(baselineRoot, 'kanji_lab/index.html')), '表示比較を要求した検証ではbaseline配信物が必要');
    }
    const artifacts = path.resolve(__dirname, '../../visual-guard-artifacts/kanji');
    fs.mkdirSync(artifacts, { recursive: true });
    const report = { viewports: [], catalog: {}, storage: [], visibilityTest: '明示したdocument.hiddenのシミュレーション。ラボ切替と結果画面の停止は実際のUI操作。' };
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
            const bytes = fs.readFileSync(file);
            const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
            res.end(bytes);
        } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    t.after(async () => {
        fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify(report, null, 2));
        await browser?.close();
        await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    });
    browser = await chromium.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const url = `${origin}/pikalab/kanji_lab/`;

    function observe(page, result) {
        result.pageErrors = [];
        result.resourceErrors = [];
        result.externalResourceErrors = [];
        page.on('pageerror', error => result.pageErrors.push(error.message));
        page.on('requestfailed', request => {
            const error = { url: request.url(), error: request.failure()?.errorText };
            (request.url().startsWith(origin) ? result.resourceErrors : result.externalResourceErrors).push(error);
        });
        page.on('response', response => {
            if (response.status() < 400) return;
            const error = { url: response.url(), status: response.status() };
            (response.url().startsWith(origin) ? result.resourceErrors : result.externalResourceErrors).push(error);
        });
    }

    async function ready(page) {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.App?.__kanjiUxPatched && window.App?.__kanjiExposurePatched);
        await page.locator('#list-p1 button').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
    }

    async function noOverflow(page) {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, '横スクロールが発生しない');
    }

    async function waitFocus(page, selector) {
        await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, selector);
    }

    async function assertVisible(locator, message) {
        // 表示直後のscale(0)を回帰と誤判定せず、実際に見える状態を待つ。
        await locator.waitFor({ state: 'visible' });
        assert.equal(await locator.isVisible(), true, message);
    }

    async function visibleCollectionCount(page) {
        // hiddenから現れたカードはpop-inの先頭で寸法ゼロになる。
        // 件数は有限アニメーションが終わった描画で検証し、固定のsleepは置かない。
        const before = await page.locator('#collection-grid [data-kanji]:visible').count();
        await page.locator('#collection-grid').evaluate(async grid => {
            void grid.offsetWidth;
            await Promise.all(grid.getAnimations({ subtree: true })
                .filter(animation => animation.effect.getComputedTiming().iterations !== Infinity)
                .map(animation => animation.finished.catch(() => {})));
        });
        const visible = await page.locator('#collection-grid [data-kanji]:visible').count();
        report.collectionChecks ??= [];
        report.collectionChecks.push({ width: page.viewportSize().width, before, visible });
        return visible;
    }

    async function escapeModal(page, id, returnSelector) {
        await page.keyboard.press('Escape');
        await page.locator(`#${id}`).waitFor({ state: 'hidden' });
        if (returnSelector) await waitFocus(page, returnSelector);
    }

    async function trapKeyboard(page, panelSelector) {
        const targets = await page.locator(panelSelector).evaluate(panel => Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]'))
            .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[inert]'))
            .map((el, index) => { el.dataset.browserFocusIndex = String(index); return String(index); }));
        assert.ok(targets.length, 'ダイアログ内にキーボード操作対象がある');
        const first = `${panelSelector} [data-browser-focus-index="${targets[0]}"]`;
        const last = `${panelSelector} [data-browser-focus-index="${targets.at(-1)}"]`;
        await page.locator(first).focus();
        await page.keyboard.press('Shift+Tab');
        await waitFocus(page, last);
        await page.keyboard.press('Tab');
        await waitFocus(page, first);
    }

    async function combine(page, kanji, mode) {
        const entry = await page.evaluate(k => window.KanjiLabData.KANJI_ALL.find(item => item.k === k), kanji);
        assert.ok(entry, `${kanji}のカタログ項目`);
        await page.locator(`#mode-${mode}`).click();
        // 深いパーツも実際の検索欄を通じて選べる。内部の合体処理は直接呼ばない。
        await page.locator('[data-part-toolbar="left"] input').fill(kanji);
        await page.locator('[data-part-toolbar="right"] input').fill(kanji);
        await page.locator('#list-p1').getByRole('button', { name: entry.l, exact: true }).click();
        await page.locator('#list-p2').getByRole('button', { name: entry.r, exact: true }).click();
        assert.ok((await page.locator('#result-char').textContent()).startsWith(kanji));
        assert.equal(await page.locator('#display-left').textContent(), entry.l);
        assert.equal(await page.locator('#display-right').textContent(), entry.r);
        assert.ok(await page.evaluate(k => window.App.storage.getCollection().includes(k), kanji));
        return entry;
    }

    // 正答は、表示された問題とカタログの対応から求める。採点・進行は常に実ボタンを操作する。
    async function readQuestion(page, mode) {
        const matches = await page.evaluate(mode => {
            const text = id => document.getElementById(id).textContent.trim();
            return window.KanjiLabData.KANJI_ALL.filter(entry => mode === 'decompose'
                ? entry.k === text('quiz-target-char')
                : entry.y === text('quiz-target-reading') && entry.m === text('quiz-target-meaning'));
        }, mode);
        assert.equal(matches.length, 1, '表示中の問題はカタログの1字に対応する');
        return matches[0];
    }

    async function answer(page, mode, wrong = false) {
        const entry = await readQuestion(page, mode);
        assert.equal(await page.locator('#quiz-submit-btn').isDisabled(), true);
        let left = entry.l;
        if (wrong) {
            left = (await page.locator('#quiz-choices-left button').allTextContents()).find(part => part !== entry.l);
            assert.ok(left, '誤答用の別パーツがある');
        }
        await page.locator('#quiz-choices-left').getByRole('button', { name: left, exact: true }).click();
        assert.equal(await page.locator('#quiz-submit-btn').isDisabled(), true, '片方だけでは採点できない');
        await page.locator('#quiz-choices-right').getByRole('button', { name: entry.r, exact: true }).click();
        assert.equal(await page.locator('#quiz-submit-btn').isDisabled(), false);
        await page.locator('#quiz-submit-btn').click();
        await page.locator('#game-result').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#result-title').textContent(), wrong ? 'ざんねん...' : 'せいかい！');
        assert.ok((await page.locator('#result-kanji').textContent()).startsWith(entry.k));
        assert.equal(await page.locator('#quiz-submit-btn').isDisabled(), true, '同じ問題の二重採点を防ぐ');
        return entry;
    }

    async function course(page, mode, courseName, courseId, result) {
        await page.locator(`#quiz-${mode}-btn`).click();
        await page.locator('#courses-grid').getByRole('button', { name: new RegExp(courseName) }).click();
        const expectedExposure = courseId === 'all' ? 'full' : 'default';
        assert.equal(await page.evaluate(() => window.KanjiLabExposure.getQuizExposure()), expectedExposure);
        assert.equal(await page.evaluate(() => window.KanjiLabData.KANJI_ALL.length), 337, '出題プールを絞っても共有カタログは不変');
        assert.equal(await page.evaluate(() => window.KanjiLabExposure.getPool('all').length), courseId === 'all' ? 337 : 312);
        const rounds = [];
        for (let index = 1; index <= 10; index++) {
            const counter = (await page.locator('#quiz-num').locator('..').textContent()).replace(/\s+/g, ' ').trim();
            assert.equal(counter, `もんだい ${index} / 10`);
            assert.equal(await page.locator('#stage-clear').isVisible(), false);
            const entry = await answer(page, mode);
            const expectedScore = index * 100 + index * (index - 1) * 5;
            assert.equal(Number(await page.locator('#quiz-score').textContent()), expectedScore);
            rounds.push({ counter, kanji: entry.k, score: expectedScore });
            await page.locator('#result-btn').click();
            await page.locator('#game-result').waitFor({ state: 'hidden' });
        }
        await page.locator('#stage-clear').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#clear-score').textContent(), '1450');
        assert.equal(rounds.length, 10);
        assert.equal(new Set(rounds.map(round => round.kanji)).size, 10, '同一コース内で10字出題する');
        const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
        assert.equal(stored.quizScores[`${mode}_${courseId}`], 1450);
        assert.equal(stored.quizStars[`${mode}_${courseId}`], 3);
        await page.screenshot({ path: path.join(artifacts, `${result.viewport.width}-${mode}-complete.png`), fullPage: true, animations: 'disabled' });
        result.courses.push({ mode, courseId, exposure: expectedExposure, answered: rounds.length, rounds, score: 1450 });
        await page.locator('#stage-clear-menu-btn').click();
        await page.locator('#stage-clear').waitFor({ state: 'hidden' });
        await assertVisible(page.locator('#game-courses'));
        assert.match(await page.locator('#courses-grid').getByRole('button', { name: new RegExp(courseName) }).textContent(), /1450/);
        await page.locator('#courses-back-btn').click();
        await assertVisible(page.locator('#game-menu'));
    }

    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
        await t.test(`${viewport.width}px: 合体・検索・全問題・キーボード・デイリー`, async () => {
            const result = { viewport, courses: [] };
            report.viewports.push(result);
            const context = await browser.newContext({ viewport, serviceWorkers: 'block', timezoneId: 'UTC' });
            await context.addInitScript(() => {
                // 候補とキラの乱数のみ固定し、日時・レイアウト・フォントは初期撮影まで触らない。
                let seed = 123456;
                Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
            });
            const page = await context.newPage();
            page.setDefaultTimeout(10000);
            observe(page, result);
            try {
                await ready(page);
                await noOverflow(page);
                await page.screenshot({ path: path.join(artifacts, `${viewport.width}-initial.png`), fullPage: true, animations: 'disabled' });
                const geometry = async target => target.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
                    const box = document.querySelector(selector).getBoundingClientRect();
                    return [selector, { width: box.width, height: box.height }];
                })), INITIAL_GEOMETRY);
                result.initialGeometry = await geometry(page);
                if (fs.existsSync(path.join(baselineRoot, 'kanji_lab/index.html'))) {
                    const baseline = await context.newPage();
                    await baseline.goto(`${origin}/baseline/pikalab/kanji_lab/`, { waitUntil: 'networkidle' });
                    await baseline.locator('#list-p1 button').first().waitFor();
                    await baseline.evaluate(() => document.fonts.ready);
                    result.baselineGeometry = await geometry(baseline);
                    assert.deepEqual(result.initialGeometry, result.baselineGeometry, '主要パーツと結果枠は同じ幅の正確な基準ビルドと同寸法');
                    result.baselineComparison = { status: 'passed' };
                    await baseline.close();
                } else {
                    // 通常PRには基準ビルドがない。専用の比較CIでは必ず実測値を比較する。
                    result.baselineComparison = { status: 'skipped', reason: 'このCI実行では基準ビルドを用意していない' };
                }
                result.counts = await page.evaluate(() => window.KanjiLabExposure.getDefaultCounts());
                assert.equal(result.counts.all, 312);
                assert.equal(result.counts.full, 337);

                await page.locator('#mode-ud').click();
                const deep = await page.evaluate(() => window.KanjiLabData.KANJI_UD.find(entry => window.KanjiLabRoles.isDeepOnlyPart(window.KanjiLabData.KANJI_UD, 'right', entry.r)));
                assert.ok(deep, '深い発見専用のパーツがある');
                const deepButton = page.locator('#list-p2').getByRole('button', { name: deep.r, exact: true, includeHidden: true });
                assert.equal(await deepButton.isVisible(), false);
                await page.locator('[data-part-toolbar="right"] input').fill(deep.k);
                await assertVisible(deepButton, '検索すると畳まれた深いパーツに到達できる');
                await page.locator('[data-part-toolbar="right"] input').fill('存在しない検索語XYZ');
                assert.equal(await page.locator('#list-p2 button:visible').count(), 0);
                assert.match(await page.locator('[data-part-toolbar="right"] .kanji-ux-count').textContent(), /^0\//);
                await page.locator('[data-part-toolbar="right"] input').fill('');
                await page.locator('#kanji-deep-parts').click();
                assert.equal(await page.locator('#kanji-deep-parts').getAttribute('aria-pressed'), 'true');
                await assertVisible(deepButton);
                await page.locator('#kanji-deep-parts').click();
                assert.equal(await deepButton.isVisible(), false);

                await combine(page, '洞', 'lr');
                assert.match(await page.locator('#result-reading').textContent(), /ほら/);
                assert.doesNotMatch(await page.locator('#result-reading').textContent(), /どう（ほら）/);
                await page.screenshot({ path: path.join(artifacts, `${viewport.width}-lr.png`), fullPage: true, animations: 'disabled' });
                await combine(page, '志', 'ud');
                assert.equal(await page.locator('#result-char').textContent(), '志', '誤った送り仮名を字形へ付加しない');
                assert.equal(await page.locator('#result-char span').count(), 0);
                assert.match(await page.locator('#result-reading').textContent(), /こころざし/);
                await noOverflow(page);
                await page.screenshot({ path: path.join(artifacts, `${viewport.width}-ud.png`), fullPage: true, animations: 'disabled' });
                await page.locator('#kanji-reset-selection').click();
                assert.equal(await page.locator('#display-left').textContent(), '?');
                assert.equal(await page.locator('#display-right').textContent(), '?');
                assert.equal(await page.locator('#kanji-reset-selection').isDisabled(), true);
                await combine(page, deep.k, 'ud');
                await page.locator('#kanji-reset-selection').click();
                await page.locator('#mode-lr').click();
                await page.locator('[data-part-toolbar="left"] input').fill('');
                await page.locator('[data-part-toolbar="right"] input').fill('');
                if (await page.locator('#kanji-partner-only').getAttribute('aria-pressed') !== 'true') await page.locator('#kanji-partner-only').click();
                await page.locator('#list-p1').getByRole('button', { name: '木', exact: true }).click();
                const partners = await page.locator('#list-p2 button:visible').allTextContents();
                assert.ok(partners.length);
                assert.equal(await page.evaluate(parts => parts.every(part => window.KanjiLabData.KANJI_LR.some(entry => entry.l === '木' && entry.r === part)), partners), true);
                // 相棒絞り込み中も最初の側を選び直せる。
                await page.locator('#list-p1').getByRole('button', { name: '氵', exact: true }).click();
                assert.equal(await page.locator('#display-left').textContent(), '氵');
                await page.locator('#kanji-reset-selection').click();

                await page.locator('#open-collection-btn').focus();
                await page.keyboard.press('Enter');
                await waitFocus(page, '#close-collection-btn');
                assert.equal(await page.locator('main').evaluate(el => el.inert), true);
                await trapKeyboard(page, '#collection-panel');
                await page.locator('[data-collection-filter="ud"]').click();
                await assertVisible(page.locator('#collection-grid [data-kanji="志"]'));
                assert.equal(await page.locator('#collection-grid [data-kanji="洞"]').isVisible(), false);
                await page.locator('[data-collection-filter="deep"]').click();
                await assertVisible(page.locator(`#collection-grid [data-kanji="${deep.k}"]`));
                await page.locator('[data-collection-filter="all"]').click();
                await page.locator('#kanji-collection-search').fill('ほら');
                assert.equal(await visibleCollectionCount(page), 1);
                const collectionCard = '#collection-grid [data-kanji="洞"]';
                await page.locator(collectionCard).focus();
                await page.keyboard.press('Enter');
                await waitFocus(page, '#close-dict-detail-btn');
                await assertVisible(page.locator('#collection-modal'));
                assert.equal(await page.locator('#collection-modal').evaluate(el => el.inert), true);
                assert.equal(await page.evaluate(() => Number(getComputedStyle(document.getElementById('dict-detail-modal')).zIndex) > Number(getComputedStyle(document.getElementById('collection-modal')).zIndex)), true);
                assert.match(await page.locator('#dict-detail-reading').textContent(), /ほら/);
                await trapKeyboard(page, '#dict-detail-content');
                await escapeModal(page, 'dict-detail-modal', collectionCard);
                await assertVisible(page.locator('#collection-modal'), 'Escapeは最前面だけを閉じる');
                assert.equal(await page.locator('#collection-modal').evaluate(el => el.inert), false);
                await escapeModal(page, 'collection-modal', '#open-collection-btn');
                assert.equal(await page.locator('main').evaluate(el => el.inert), false);

                await page.locator('#tab-game').click();
                await course(page, 'combine', '全問コース', 'all', result);
                await course(page, 'decompose', '上下コース', 'vertical', result);

                // 中断した誤答も保存され、再挑戦は1問目・0点から始まる。
                await page.locator('#quiz-combine-btn').click();
                await page.locator('#courses-grid').getByRole('button', { name: /基本コース/ }).click();
                const wrongEntry = await answer(page, 'combine', true);
                assert.ok(await page.evaluate(({ key, kanji }) => JSON.parse(localStorage.getItem(key)).wrongKanjiList.includes(kanji), { key: STORAGE_KEY, kanji: wrongEntry.k }));
                await page.locator('#result-btn').click();
                assert.equal(await page.locator('#quiz-num').textContent(), '2');
                await page.locator('#quiz-exit-btn').click();
                await page.locator('#courses-grid').getByRole('button', { name: /基本コース/ }).click();
                assert.equal(await page.locator('#quiz-num').textContent(), '1');
                assert.equal(await page.locator('#quiz-score').textContent(), '0');
                assert.equal(await page.locator('#quiz-submit-btn').isDisabled(), true);
                await page.locator('#quiz-exit-btn').click();
                await page.locator('#tab-lab').click();
                await page.locator('#open-wrong-btn').focus();
                await page.keyboard.press('Enter');
                await waitFocus(page, '#close-wrong-btn');
                const wrongDetail = page.locator('#wrong-grid').getByRole('button', { name: new RegExp(`${wrongEntry.k}.*漢字カード`) });
                assert.equal(await wrongDetail.count(), 1, 'にがてノートの詳細も独立したキーボード操作対象');
                await wrongDetail.focus();
                await page.keyboard.press('Space');
                await waitFocus(page, '#close-dict-detail-btn');
                assert.equal(await page.locator('#wrong-modal').evaluate(el => el.inert), true);
                await trapKeyboard(page, '#dict-detail-content');
                await escapeModal(page, 'dict-detail-modal');
                assert.equal(await wrongDetail.evaluate(el => el === document.activeElement), true);
                await assertVisible(page.locator('#wrong-modal'));
                await escapeModal(page, 'wrong-modal', '#open-wrong-btn');

                // 日付固定は初期見た目の比較後に行う。時計を進めても結果画面では加算しない。
                await page.clock.install({ time: new Date('2026-10-03T12:00:00Z') });
                await page.locator('#tab-game').click();
                await assertVisible(page.locator('#game-menu'));
                await page.locator('#quiz-combine-btn').click();
                const dailyExpected = await page.evaluate(() => window.App.daily.getDailyQuizzes().map(entry => entry.k));
                assert.equal(dailyExpected.length, 5);
                assert.equal(new Set(dailyExpected).size, 5);
                await page.locator('#start-daily-btn').click();
                assert.equal(await page.evaluate(() => window.KanjiLabExposure.getQuizExposure()), 'default');
                assert.equal(await page.evaluate(() => window.KanjiLabData.KANJI_ALL.length), 337);
                assert.equal(await page.locator('#quiz-score-container').isVisible(), false);
                await assertVisible(page.locator('#quiz-time-container-header'));
                const time = async () => Number(await page.locator('#quiz-current-time').textContent());
                await page.clock.runFor(1200);
                const running = await time();
                assert.ok(running >= 1);
                await page.locator('#tab-lab').click();
                const pausedInLab = await time();
                await page.clock.runFor(2000);
                assert.equal(await time(), pausedInLab, 'ラボを表示中はデイリー時計を止める');
                await page.locator('#tab-game').click();
                await assertVisible(page.locator('#game-menu'), 'クイズへ戻ると既存どおりメニューを表示する');
                await page.clock.runFor(1100);
                assert.equal(await time(), pausedInLab, 'メニューに戻った後も中断した時計は動かない');
                await page.locator('#quiz-combine-btn').click();
                await page.locator('#start-daily-btn').click();
                assert.equal(await page.locator('#quiz-num').textContent(), '1');
                await page.clock.runFor(1100);
                assert.ok(await time() >= 1);
                await page.evaluate(() => {
                    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
                    document.dispatchEvent(new Event('visibilitychange'));
                });
                const hiddenTime = await time();
                await page.clock.runFor(2000);
                assert.equal(await time(), hiddenTime, '非表示イベントの処理は経過時間を加算しない');
                await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
                await page.clock.runFor(1100);
                assert.ok(await time() > hiddenTime);
                const dailyAnswered = [];
                for (let index = 1; index <= 5; index++) {
                    assert.equal((await page.locator('#quiz-num').locator('..').textContent()).replace(/\s+/g, ' ').trim(), `もんだい ${index} / 5`);
                    const entry = await answer(page, 'combine');
                    dailyAnswered.push(entry.k);
                    const feedbackTime = await time();
                    await page.clock.runFor(750);
                    assert.equal(await time(), feedbackTime, '正誤表示中の時計は停止する');
                    await page.locator('#result-btn').click();
                }
                await page.locator('#stage-clear').waitFor({ state: 'visible' });
                assert.equal(await page.locator('#clear-title').textContent(), 'デイリークリア！');
                assert.deepEqual(dailyAnswered, dailyExpected);
                const savedDaily = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
                assert.ok(savedDaily.dailyClearHistory.includes('2026-10-03'));
                assert.ok(savedDaily.dailyBestTimes['2026-10-03'] > 0);
                result.daily = { answered: dailyAnswered.length, kanji: dailyAnswered, recordedSeconds: savedDaily.dailyBestTimes['2026-10-03'], labPause: true, simulatedVisibilityPause: true, feedbackPause: true };
                await page.screenshot({ path: path.join(artifacts, `${viewport.width}-daily-complete.png`), fullPage: true, animations: 'disabled' });
                await page.locator('#stage-clear-menu-btn').click();
                await page.locator('#start-daily-btn').click();
                assert.equal(await page.locator('#quiz-num').textContent(), '1');
                assert.equal((await readQuestion(page, 'combine')).k, dailyExpected[0], '同日の再挑戦は同じ固定問題');
                assert.ok(await time() < 1);
                await page.locator('#quiz-exit-btn').click();
                const exitedTime = await time();
                await page.clock.runFor(2000);
                assert.equal(await time(), exitedTime, '退出後の時計は停止する');
                await page.locator('#courses-grid').getByRole('button', { name: /基本コース/ }).click();
                await assertVisible(page.locator('#quiz-score-container'));
                assert.equal(await page.locator('#quiz-time-container-header').isVisible(), false);
                assert.equal(await page.locator('#quiz-score').textContent(), '0');
                await page.locator('#quiz-exit-btn').click();
                assert.deepEqual(result.pageErrors, []);
                assert.deepEqual(result.resourceErrors, []);
                result.completed = true;
            } catch (error) {
                result.failure = error.message;
                await page.screenshot({ path: path.join(artifacts, `${viewport.width}-failure.png`), fullPage: true }).catch(() => {});
                throw error;
            } finally { await context.close(); }
        });
    }

    await t.test('337字の図鑑と25字の深い発見を検索・絞り込みできる', async () => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'UTC' });
        const page = await context.newPage();
        observe(page, report.catalog);
        try {
            await ready(page);
            // 全件を集めた保存データだけを準備する。以後の図鑑検証は実際の操作で行う。
            await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ collection: window.KanjiLabData.KANJI_ALL.map(entry => entry.k), shiningKanji: ['洞'] })), STORAGE_KEY);
            await ready(page);
            await page.locator('#open-collection-btn').click();
            await waitFocus(page, '#close-collection-btn');
            assert.equal(await page.locator('#kanji-collection-progress').textContent(), '見つけた 337 / 337');
            assert.equal(await page.locator('#collection-grid [data-kanji]').count(), 337, '全337字を描画する');
            assert.equal(await visibleCollectionCount(page), 337);
            report.catalog.counts = {};
            for (const filter of ['lr', 'ud', 'deep', 'shiny', 'all']) {
                await page.locator(`[data-collection-filter="${filter}"]`).click();
                const expected = await page.evaluate(filter => filter === 'lr' ? window.KanjiLabData.KANJI_LR.length : filter === 'ud' ? window.KanjiLabData.KANJI_UD.length : filter === 'deep' ? 25 : filter === 'shiny' ? 1 : 337, filter);
                assert.equal(await visibleCollectionCount(page), expected);
                assert.equal(await page.locator(`[data-collection-filter="${filter}"]`).getAttribute('aria-pressed'), 'true');
                report.catalog.counts[filter] = expected;
            }
            for (const [query, kanji, reading] of [['ほら', '洞', 'ほら'], ['こころざし', '志', 'こころざし']]) {
                await page.locator('#kanji-collection-search').fill(query);
                const card = `#collection-grid [data-kanji="${kanji}"]`;
                await assertVisible(page.locator(card));
                await page.locator(card).focus();
                await page.keyboard.press('Enter');
                await waitFocus(page, '#close-dict-detail-btn');
                assert.equal(await page.locator('#dict-detail-char').textContent(), kanji);
                assert.match(await page.locator('#dict-detail-reading').textContent(), new RegExp(reading));
                await escapeModal(page, 'dict-detail-modal', card);
            }
            await page.locator('#kanji-collection-search').fill('存在しない検索語XYZ');
            assert.equal(await visibleCollectionCount(page), 0);
            await assertVisible(page.locator('#kanji-collection-empty-filter'));
            await page.locator('#kanji-collection-search').fill('');
            assert.equal(await visibleCollectionCount(page), 337);
            await page.screenshot({ path: path.join(artifacts, '390-full-catalog.png'), fullPage: true, animations: 'disabled' });
            await escapeModal(page, 'collection-modal', '#open-collection-btn');
            assert.deepEqual(report.catalog.pageErrors, []);
            assert.deepEqual(report.catalog.resourceErrors, []);
            report.catalog.completed = true;
        } finally { await context.close(); }
    });

    for (const fixture of [
        { name: 'broken-json', raw: '{broken' },
        { name: 'null-json', raw: 'null' },
        { name: 'invalid-fields', raw: JSON.stringify({ collection: ['林', '不明な文字', 7, '林'], quizScores: { combine_basic: 800, decompose_all: -4 }, quizStars: { combine_basic: 2, decompose_all: 7 }, theme: 'missing', configAssist: 'false', configFurigana: [], dailyClearHistory: ['2026-10-01', '2026-02-31', 7], dailyBestTimes: { '2026-10-01': 12.5, '2026-10-02': 'bad' }, shiningKanji: {}, unlockedTitles: null, unlockedThemes: false, selectedTitle: '<bad>', holoTickets: -1, wrongKanjiList: ['林', 5, '不明な文字'] }) },
        { name: 'storage-unavailable', unavailable: true }
    ]) {
        await t.test(`保存境界: ${fixture.name}`, async () => {
            const result = { name: fixture.name };
            report.storage.push(result);
            const context = await browser.newContext({ viewport: { width: 320, height: 740 }, reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'UTC' });
            await context.addInitScript(({ fixture, key }) => {
                if (fixture.unavailable) {
                    for (const method of ['getItem', 'setItem']) Storage.prototype[method] = function () { throw new DOMException('保存が無効です', 'SecurityError'); };
                } else localStorage.setItem(key, fixture.raw);
            }, { fixture, key: STORAGE_KEY });
            const page = await context.newPage();
            observe(page, result);
            try {
                await ready(page);
                await combine(page, '洞', 'lr');
                await page.locator('#open-collection-btn').click();
                await waitFocus(page, '#close-collection-btn');
                await assertVisible(page.locator('#collection-grid [data-kanji="洞"]'));
                await escapeModal(page, 'collection-modal', '#open-collection-btn');
                await page.locator('#kanji-random-discovery').click();
                assert.notEqual(await page.locator('#result-char').textContent(), '?');
                result.collectionCount = await page.evaluate(() => window.App.storage.getCollection().length);
                assert.ok(result.collectionCount >= 2, '保存不可でもメモリ上の発見を維持する');
                if (!fixture.unavailable) {
                    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
                    assert.ok(saved.collection.includes('洞'));
                    assert.equal(saved.collection.includes('不明な文字'), false);
                    assert.equal(saved.holoTickets, 0);
                    if (fixture.name === 'invalid-fields') {
                        assert.ok(saved.collection.includes('林'), '正常な進捗は残す');
                        assert.equal(saved.quizScores.combine_basic, 800);
                        assert.equal(saved.quizScores.decompose_all, undefined);
                        assert.deepEqual(saved.dailyClearHistory, ['2026-10-01']);
                        assert.deepEqual(saved.dailyBestTimes, { '2026-10-01': 12.5 });
                    }
                }
                await page.locator('#tab-game').click();
                await page.locator('#quiz-decompose-btn').click();
                await page.locator('#courses-grid').getByRole('button', { name: /基本コース/ }).click();
                await answer(page, 'decompose');
                assert.equal(await page.locator('#quiz-score').textContent(), '100');
                await page.locator('#result-btn').click();
                assert.equal(await page.locator('#quiz-num').textContent(), '2');
                await page.locator('#quiz-exit-btn').click();
                assert.deepEqual(result.pageErrors, []);
                assert.deepEqual(result.resourceErrors, []);
                result.completed = true;
            } finally { await context.close(); }
        });
    }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { withBrowserPage } = require('./browser-test-helper.cjs');

const projectRoot = path.resolve(__dirname, '..');
const pikalabRoot = path.resolve(projectRoot, '..');
const questBoard = require(path.join(projectRoot, 'script.js'));
const {
    normalizeCount,
    countCharacters,
    truncateCharacters,
    normalizeStoredQuestData,
    calculateContainScale,
    parseStampIndex,
    resizeStampState,
    serializeQuestData,
    deserializeQuestData,
    validateQuestShareData,
    parseQuestShareData,
    getQuestShareDataFromSearch,
    shouldPersistInitialQuestState,
    loadFromUrlParams
} = questBoard;

test('normalizeCount: 最小値・最大値・不正値を安全に正規化する', () => {
    assert.equal(normalizeCount('abc'), 10);
    assert.equal(normalizeCount(1), 5);
    assert.equal(normalizeCount(99), 35);
    assert.equal(normalizeCount(20), 20);
});

test('Unicode文字数: 補助漢字や絵文字を途中分断せず1文字単位で扱う', () => {
    assert.equal(countCharacters('𠮷野家😊'), 4);
    assert.equal(truncateCharacters('𠮷野家😊', 3), '𠮷野家');
    assert.equal(countCharacters(truncateCharacters('𠮷😊あ', 2)), 2);
});

test('calculateContainScale: コンテナ内に収まる縮尺を返す', () => {
    assert.equal(calculateContainScale(1000, 800, 500, 400, 0.1, 1), 1);
    assert.equal(calculateContainScale(600, 400, 900, 700, 0.1, 1), 0.5714285714285714);
    assert.equal(calculateContainScale(60, 40, 900, 700, 0.1, 1), 0.1);
    assert.equal(calculateContainScale(0, 40, 900, 700, 0.1, 1), 1);
});

test('parseStampIndex: 不正なインデックスを除外する', () => {
    assert.equal(parseStampIndex('1', 10), 1);
    assert.equal(parseStampIndex('10', 10), 10);
    assert.equal(parseStampIndex('0', 10), null);
    assert.equal(parseStampIndex('11', 10), null);
    assert.equal(parseStampIndex('abc', 10), null);
});

test('index.html: Tailwind CDNを使わずローカル生成CSSを参照する', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const rootHtaccess = fs.readFileSync(path.join(projectRoot, '..', '..', '.htaccess'), 'utf8');
    assert.ok(!html.includes('https://cdn.tailwindcss.com'));
    assert.ok(html.includes('../style.css'));
    assert.ok(!html.includes("script-src 'self' https://cdn.tailwindcss.com"));
    assert.ok(html.includes("script-src 'self'"));
    assert.ok(!html.includes("'unsafe-eval'"));
    assert.ok(rootHtaccess.includes("frame-ancestors 'self'"));
});

test('resizeStampState: 回数の増減時に既存スタンプを先頭から保持する', () => {
    assert.equal(typeof resizeStampState, 'function');
    assert.deepEqual(
        resizeStampState([true, false, true], 5),
        [true, false, true, false, false]
    );
    assert.deepEqual(
        resizeStampState([true, false, true, true, false, true, true], 5),
        [true, false, true, true, false]
    );
    assert.deepEqual(resizeStampState([true], 1), [true, false, false, false, false]);
    assert.equal(resizeStampState(new Array(40).fill(true), 99).length, 35);
});

test('normalizeStoredQuestData: 壊れた保存値を既定値と安全な型へ正規化する', () => {
    assert.equal(typeof normalizeStoredQuestData, 'function');
    assert.deepEqual(
        normalizeStoredQuestData({
            title: 123,
            count: '不正',
            reward: { text: '不正' },
            stamps: [true, 'true', 1, false]
        }),
        {
            title: '',
            count: 10,
            reward: '',
            stamps: [true, false, false, false, false, false, false, false, false, false]
        }
    );
    assert.deepEqual(
        normalizeStoredQuestData({
            title: 'あ'.repeat(40),
            count: 99,
            reward: 'い'.repeat(40),
            stamps: new Array(40).fill(true)
        }),
        {
            title: 'あ'.repeat(30),
            count: 35,
            reward: 'い'.repeat(30),
            stamps: new Array(35).fill(true)
        }
    );
    const supplementary = normalizeStoredQuestData({
        title: '𠮷'.repeat(31),
        count: 5,
        reward: '😊'.repeat(31),
        stamps: new Array(5).fill(false)
    });
    assert.equal(countCharacters(supplementary.title), 30);
    assert.equal(countCharacters(supplementary.reward), 30);
    assert.equal(supplementary.title, '𠮷'.repeat(30));
    assert.equal(supplementary.reward, '😊'.repeat(30));
    assert.equal(normalizeStoredQuestData(null), null);
    assert.equal(normalizeStoredQuestData([]), null);
});

test('共有データ: UTF-8 Base64URLを往復し、従来形式のリンクとも互換性を保つ', () => {
    const source = {
        title: '𠮷くんの朝😊',
        count: 5,
        reward: 'いっしょに遊ぶ🎮',
        stamps: [true, false, true, false, false]
    };
    const encoded = serializeQuestData(source);
    assert.match(encoded, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(deserializeQuestData(encoded), source);

    // 従来もUTF-8 JSONをBase64URL化した形式なので、既存リンクをそのまま読めることを確認する。
    const legacyEncoded = Buffer.from(JSON.stringify(source), 'utf8').toString('base64url');
    assert.deepEqual(parseQuestShareData(legacyEncoded), source);
});

test('validateQuestShareData: 正常な共有データだけを複製して返す', () => {
    assert.equal(typeof validateQuestShareData, 'function');
    const source = {
        title: '朝のお手伝い',
        count: 5,
        reward: 'いっしょに遊ぶ',
        stamps: [true, false, true, false, false]
    };

    const validated = validateQuestShareData(source);
    assert.deepEqual(validated, source);
    assert.notEqual(validated, source);
    assert.notEqual(validated.stamps, source.stamps);
});

test('validateQuestShareData: 範囲外・型不正・過大な共有データを拒否する', () => {
    assert.equal(typeof validateQuestShareData, 'function');
    const valid = {
        title: 'クエスト',
        count: 5,
        reward: 'ごほうび',
        stamps: [true, false, false, false, false]
    };

    assert.equal(validateQuestShareData({ ...valid, count: 36 }), null);
    assert.equal(validateQuestShareData({ ...valid, count: 5.5 }), null);
    assert.equal(validateQuestShareData({ ...valid, stamps: [true] }), null);
    assert.equal(validateQuestShareData({ ...valid, stamps: [true, false, 1, false, false] }), null);
    assert.equal(validateQuestShareData({ ...valid, title: 'あ'.repeat(31) }), null);
    assert.equal(validateQuestShareData({ ...valid, reward: 'あ'.repeat(31) }), null);
    assert.equal(validateQuestShareData({ ...valid, title: '𠮷'.repeat(30) }).title, '𠮷'.repeat(30));
    assert.equal(validateQuestShareData({ ...valid, title: '𠮷'.repeat(31) }), null);
    assert.equal(validateQuestShareData({ ...valid, reward: '😊'.repeat(30) }).reward, '😊'.repeat(30));
    assert.equal(validateQuestShareData({ ...valid, reward: '😊'.repeat(31) }), null);
    assert.equal(validateQuestShareData({ ...valid, unknown: '予期しない項目' }), null);
});

test('parseQuestShareData: 壊れた文字列と過大な共有パラメータを拒否する', () => {
    assert.equal(typeof parseQuestShareData, 'function');
    assert.equal(parseQuestShareData('%%%'), null);
    assert.equal(parseQuestShareData('a'.repeat(5000)), null);
});

test('getQuestShareDataFromSearch: URLを解析しても保存処理を行わない', () => {
    assert.equal(typeof getQuestShareDataFromSearch, 'function');
    const source = {
        title: '共有クエスト',
        count: 5,
        reward: '共有ごほうび',
        stamps: [true, false, false, false, false]
    };
    const encoded = Buffer.from(JSON.stringify(source), 'utf8').toString('base64url');

    assert.deepEqual(getQuestShareDataFromSearch(`?q=${encoded}`), source);
    assert.equal(getQuestShareDataFromSearch(`?q=${encoded}&q=${encoded}`), null);
    assert.equal(typeof loadFromUrlParams, 'function');
    assert.ok(!loadFromUrlParams.toString().includes('saveState('));
    assert.ok(!loadFromUrlParams.toString().includes('Storage.save('));
    assert.doesNotThrow(() => loadFromUrlParams());
});

test('共有クエスト: 承認前とキャンセル時は既存画面・保存値を維持し、承認後だけ置き換える', async () => {
    const stored = {
        title: '現在のクエスト',
        count: 6,
        reward: '現在のごほうび',
        stamps: [true, true, false, false, false, false]
    };
    const shared = {
        title: '共有クエスト',
        count: 5,
        reward: '共有ごほうび',
        stamps: [true, false, true, false, false]
    };
    const encoded = Buffer.from(JSON.stringify(shared), 'utf8').toString('base64url');

    await withBrowserPage(pikalabRoot, async ({ page, baseUrl }) => {
        await page.addInitScript((initialData) => {
            localStorage.setItem('questBoardData', JSON.stringify(initialData));
        }, stored);

        await page.goto(`${baseUrl}/quest_board/`);
        await page.locator('#quest-count').evaluate((element) => {
            element.value = '5';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(150);
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('questBoardData'))).stamps,
            [true, true, false, false, false]
        );

        await page.locator('#quest-count').evaluate((element) => {
            element.value = '7';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(150);
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('questBoardData'))).stamps,
            [true, true, false, false, false, false, false]
        );

        await page.goto(`${baseUrl}/quest_board/?q=not-base64!`);
        await page.waitForFunction(() => !new URL(location.href).searchParams.has('q'));
        assert.equal(await page.locator('#quest-title').inputValue(), stored.title);
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('questBoardData'))),
            stored
        );

        await page.goto(`${baseUrl}/quest_board/?q=${encoded}`);
        await page.locator('#share-import-modal[aria-hidden="false"]').waitFor();

        assert.equal(await page.locator('#quest-title').inputValue(), stored.title);
        assert.equal(await page.locator('#quest-count').inputValue(), String(stored.count));
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('questBoardData'))),
            stored
        );

        await page.locator('#share-import-cancel-btn').click();
        assert.equal(await page.locator('#quest-title').inputValue(), stored.title);
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'quest-title');
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('questBoardData'))),
            stored
        );
        assert.equal(new URL(page.url()).searchParams.has('q'), false);

        await page.goto(`${baseUrl}/quest_board/?q=${encoded}`);
        await page.locator('#share-import-modal[aria-hidden="false"]').waitFor();
        await page.locator('#share-import-confirm-btn').click();

        assert.equal(await page.locator('#quest-title').inputValue(), shared.title);
        assert.equal(await page.locator('#quest-count').inputValue(), String(shared.count));
        assert.equal(await page.locator('#quest-reward').inputValue(), shared.reward);
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'quest-title');
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('questBoardData'))),
            shared
        );
        assert.equal(new URL(page.url()).searchParams.has('q'), false);
    });
});

test('保護者モーダル: ボタンでhelp-modalを開閉しaria-expandedを同期する', async () => {
    await withBrowserPage(pikalabRoot, async ({ page, baseUrl }) => {
        await page.goto(`${baseUrl}/quest_board/`);
        await page.locator('#help-btn').click();
        await page.waitForFunction(() => document.getElementById('help-modal')?.open === true);
        assert.equal(await page.locator('#help-btn').getAttribute('aria-expanded'), 'true');

        await page.locator('#help-close-btn').click();
        await page.waitForFunction(() => document.getElementById('help-modal')?.open === false);
        assert.equal(await page.locator('#help-btn').getAttribute('aria-expanded'), 'false');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'help-btn');
    });
});

test('shouldPersistInitialQuestState: 共有URLの初期表示ではlocalStorageへ保存しない', () => {
    assert.equal(typeof shouldPersistInitialQuestState, 'function');
    assert.equal(shouldPersistInitialQuestState('?q=valid-looking-data'), false);
    assert.equal(shouldPersistInitialQuestState('?other=value'), true);
    assert.equal(shouldPersistInitialQuestState(''), true);
});

test('index.html: 共有クエストのプレビュー・取り込み・キャンセルUIが存在する', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.ok(html.includes('id="share-import-modal"'));
    assert.ok(html.includes('id="share-import-confirm-btn"'));
    assert.ok(html.includes('id="share-import-cancel-btn"'));
    assert.ok(html.includes('id="share-import-preview"'));
});

test('index.html: 保護者モーダルの実IDと開閉処理・共有説明が一致する', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.ok(html.includes('<dialog id="help-modal"'));
    assert.ok(html.includes("document.getElementById('help-modal')"));
    assert.ok(!html.includes("document.getElementById('parents-modal')"));
    assert.ok(html.includes('共有URLに含まれます'));
    assert.ok(html.includes('クエスト名・ごほうび・回数'));
    assert.ok(!html.includes('データは外部サーバーに送信されません'));
    assert.ok(!html.includes('maxlength="30"'));
});

test('index.html: OGP画像は既存のJPGフォールバックを使用する', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const fallbackUrl = 'https://katakatalab.com/pikalab/pikalab_ogp_compressed.jpg';

    assert.match(html, new RegExp(`<meta property="og:image" content="${fallbackUrl}"`));
    assert.match(html, new RegExp(`<meta name="twitter:image" content="${fallbackUrl}"`));
    assert.ok(!html.includes('ogp-quest-board.svg'));
});

test('script.js: スタンプ要素をbutton生成しkeydown委譲を使わない', () => {
    const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
    assert.ok(script.includes("document.createElement('button')"));
    assert.ok(!script.includes("elements.stampGrid.addEventListener('keydown', handleStampGridInteraction);"));
    assert.ok(script.includes('MAX_VISIBLE_TOASTS'));
    assert.ok(script.includes('validateRequiredElements'));
    assert.match(
        script,
        /function importSharedQuestData\(\)[\s\S]*?stampState = resizeStampState\(data\.stamps, data\.count\);[\s\S]*?generateGrid\(data\.count\);/
    );
});

test('script.js: deprecatedなescape/unescapeを使わずUTF-8標準APIで共有する', () => {
    const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
    assert.ok(!script.includes('unescape('));
    assert.ok(!script.includes('escape(atob'));
    assert.ok(script.includes('new TextEncoder()'));
    assert.ok(script.includes("new TextDecoder('utf-8', { fatal: true })"));
    assert.ok(!script.includes("showToast('共有データを読み込めませんでした', 'error')"));
});

test('style.css: 印刷時の見切れ防止設定が有効', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');
    assert.match(css, /@media print[\s\S]*?html,\s*body[\s\S]*?overflow:\s*visible;/);
    assert.match(css, /@media print[\s\S]*?\.quest-card\s*{[\s\S]*?width:\s*min\(100%,\s*141\.4vh\);/);
    assert.match(css, /@media print[\s\S]*?\.quest-card\s*{[\s\S]*?max-height:\s*100%;/);
    assert.match(css, /@media print[\s\S]*?\.stamp-grid-container\s*{[\s\S]*?overflow:\s*visible;/);
});

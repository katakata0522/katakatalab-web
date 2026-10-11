const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { withBrowserPage } = require('../../quest_board/tests/browser-test-helper.cjs');

const projectRoot = path.resolve(__dirname, '..');
const pikalabRoot = path.resolve(projectRoot, '..');
const scienceMaker = require(path.join(projectRoot, 'script.js'));
const {
    clampNumber,
    normalizeQuizAnswer,
    isValidStepId,
    getTopicsData,
    collectSafetyNotes,
    validatePlanShareData,
    parsePlanShareData,
    getPlanShareDataFromSearch,
    loadFromUrlParams
} = scienceMaker;

test('clampNumber: 範囲外や不正値を安全にクランプする', () => {
    assert.equal(clampNumber('abc', 1, 3, 2), 2);
    assert.equal(clampNumber(-1, 1, 3, 2), 1);
    assert.equal(clampNumber(9, 1, 3, 2), 3);
    assert.equal(clampNumber(2, 1, 3, 2), 2);
});

test('normalizeQuizAnswer: 許可された回答のみを通す', () => {
    assert.equal(normalizeQuizAnswer('time', '1day'), '1day');
    assert.equal(normalizeQuizAnswer('type', 'craft'), 'craft');
    assert.equal(normalizeQuizAnswer('time', 'invalid'), null);
    assert.equal(normalizeQuizAnswer('invalid-key', '1day'), null);
});

test('isValidStepId: 既知のステップIDのみ有効と判定する', () => {
    assert.equal(isValidStepId('step-quiz'), true);
    assert.equal(isValidStepId('step-results'), true);
    assert.equal(isValidStepId('step-plan'), true);
    assert.equal(isValidStepId('step-unknown'), false);
});

test('getTopicsData: 配列形式のtopicsデータを返す', () => {
    const backupTopics = globalThis.topics;
    try {
        globalThis.topics = [{ id: 'dummy' }];
        const data = getTopicsData();
        assert.ok(Array.isArray(data));
        assert.equal(data.length, 1);
    } finally {
        globalThis.topics = backupTopics;
    }
});

test('collectSafetyNotes: 共通注意とテーマ固有注意を安全に合成する', () => {
    const notes = collectSafetyNotes({
        safety: [
            '  テーマ固有の注意  ',
            '',
            '火気・加熱・刃物・薬品を使う作業は、必ず保護者の方と一緒に行ってください。',
            null
        ]
    });

    assert.ok(Array.isArray(notes));
    assert.ok(notes.includes('テーマ固有の注意'));
    assert.match(notes.join('\n'), /保護者/);
    assert.match(notes.join('\n'), /手洗い|片付け/);
    assert.match(notes.join('\n'), /中止/);
    assert.equal(
        notes.filter((note) => note === '火気・加熱・刃物・薬品を使う作業は、必ず保護者の方と一緒に行ってください。').length,
        1
    );
});

test('validatePlanShareData: 許可されたテーマと文字数内の計画書だけを複製して返す', () => {
    assert.equal(typeof validatePlanShareData, 'function');
    const source = {
        topicId: '1d_exp_1',
        createdAt: '2026/7/28',
        studentName: 'ぴか',
        title: '10円玉の研究',
        motivation: '気になったから',
        hypothesis: 'きれいになると思う',
        materials: '10円玉',
        method: '比べる'
    };

    const validated = validatePlanShareData(source, [{ id: '1d_exp_1' }]);
    assert.deepEqual(validated, source);
    assert.notEqual(validated, source);
});

test('validatePlanShareData: 未知のテーマ・型不正・過大な共有データを拒否する', () => {
    assert.equal(typeof validatePlanShareData, 'function');
    const valid = {
        topicId: '1d_exp_1',
        createdAt: '2026/7/28',
        studentName: '',
        title: '研究',
        motivation: '',
        hypothesis: '',
        materials: '',
        method: ''
    };
    const topics = [{ id: '1d_exp_1' }];

    assert.equal(validatePlanShareData({ ...valid, topicId: 'unknown' }, topics), null);
    assert.equal(validatePlanShareData({ ...valid, title: 'あ'.repeat(81) }, topics), null);
    assert.equal(validatePlanShareData({ ...valid, method: 'あ'.repeat(1001) }, topics), null);
    assert.equal(validatePlanShareData({ ...valid, hypothesis: 123 }, topics), null);
    assert.equal(validatePlanShareData({ ...valid, createdAt: 'a'.repeat(31) }, topics), null);
    assert.equal(validatePlanShareData({ ...valid, createdAt: '不正な日付' }, topics), null);
    assert.equal(validatePlanShareData({ ...valid, createdAt: '2026/2/30' }, topics), null);
    assert.equal(validatePlanShareData({ ...valid, unknown: '予期しない項目' }, topics), null);
});

test('parsePlanShareData: 壊れた文字列と過大な共有パラメータを拒否する', () => {
    assert.equal(typeof parsePlanShareData, 'function');
    assert.equal(parsePlanShareData('%%%', [{ id: '1d_exp_1' }]), null);
    assert.equal(parsePlanShareData('a'.repeat(25000), [{ id: '1d_exp_1' }]), null);
});

test('getPlanShareDataFromSearch: URLを解析しても保存処理を行わない', () => {
    assert.equal(typeof getPlanShareDataFromSearch, 'function');
    const source = {
        topicId: '1d_exp_1',
        createdAt: '2026/7/28',
        studentName: 'ぴか',
        title: '共有する研究',
        motivation: '',
        hypothesis: '',
        materials: '',
        method: ''
    };
    const encoded = Buffer.from(JSON.stringify(source), 'utf8').toString('base64url');

    assert.deepEqual(
        getPlanShareDataFromSearch(`?q=${encoded}`, [{ id: '1d_exp_1' }]),
        source
    );
    assert.equal(
        getPlanShareDataFromSearch(`?q=${encoded}&q=${encoded}`, [{ id: '1d_exp_1' }]),
        null
    );
    assert.equal(typeof loadFromUrlParams, 'function');
    assert.ok(!loadFromUrlParams.toString().includes('savePlanState('));
    assert.ok(!loadFromUrlParams.toString().includes('Storage.save('));
    assert.doesNotThrow(() => loadFromUrlParams());
});

test('共有計画書: 承認前とキャンセル時は既存画面・保存値を維持し、承認後だけ置き換える', async () => {
    const stored = {
        topicId: '1d_exp_1',
        createdAt: '2026/7/27',
        studentName: '現在の名前',
        title: '現在の研究',
        motivation: '現在のきっかけ',
        hypothesis: '現在の予想',
        materials: '現在の材料',
        method: '現在の方法'
    };
    const shared = {
        topicId: '1d_exp_1',
        createdAt: '2026/7/28',
        studentName: '共有の名前',
        title: '共有の研究',
        motivation: '共有のきっかけ',
        hypothesis: '共有の予想',
        materials: '共有の材料',
        method: '共有の方法'
    };
    const encoded = Buffer.from(JSON.stringify(shared), 'utf8').toString('base64url');
    const invalidEncoded = Buffer.from(
        JSON.stringify({ ...shared, createdAt: '不正な日付' }),
        'utf8'
    ).toString('base64url');

    await withBrowserPage(pikalabRoot, async ({ page, baseUrl }) => {
        await page.addInitScript((initialData) => {
            localStorage.setItem('scienceMakerData_v1', JSON.stringify(initialData));
        }, stored);

        await page.goto(`${baseUrl}/science_maker/?q=${invalidEncoded}`);
        await page.waitForFunction(() => !new URL(location.href).searchParams.has('q'));
        assert.equal(await page.locator('#plan-title').inputValue(), stored.title);
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('scienceMakerData_v1'))),
            stored
        );

        await page.goto(`${baseUrl}/science_maker/?q=${encoded}`);
        await page.locator('#share-import-modal[open]').waitFor();

        assert.equal(await page.locator('#plan-title').inputValue(), stored.title);
        assert.equal(await page.locator('#student-name').inputValue(), stored.studentName);
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('scienceMakerData_v1'))),
            stored
        );

        await page.locator('#share-import-cancel-btn').click();
        assert.equal(await page.locator('#plan-title').inputValue(), stored.title);
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'plan-title');
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('scienceMakerData_v1'))),
            stored
        );
        assert.equal(new URL(page.url()).searchParams.has('q'), false);

        await page.goto(`${baseUrl}/science_maker/?q=${encoded}`);
        await page.locator('#share-import-modal[open]').waitFor();
        await page.locator('#share-import-confirm-btn').click();

        assert.equal(await page.locator('#plan-title').inputValue(), shared.title);
        assert.equal(await page.locator('#student-name').inputValue(), shared.studentName);
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'plan-title');
        assert.deepEqual(
            JSON.parse(await page.evaluate(() => localStorage.getItem('scienceMakerData_v1'))),
            shared
        );
        assert.equal(new URL(page.url()).searchParams.has('q'), false);
    });
});

test('script.js: 共有計画書のプレビュー・取り込み・キャンセルUIを生成する', () => {
    const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
    assert.ok(script.includes('share-import-modal'));
    assert.ok(script.includes('share-import-confirm-btn'));
    assert.ok(script.includes('share-import-cancel-btn'));
    assert.ok(script.includes('share-import-preview'));
});

test('index.html: すべてのbuttonにtype=\"button\"が設定されている', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const buttonTags = html.match(/<button\b[^>]*>/g) || [];
    assert.ok(buttonTags.length > 0);
    buttonTags.forEach((tag) => {
        assert.match(tag, /type=\"button\"/);
    });
});

test('index.html: インラインonclickを使っていない', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.ok(!html.includes('onclick='));
});

test('index.html: 安全チェックの表示領域が存在する', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.ok(html.includes('id="plan-safety-list"'));
    assert.ok(html.includes('安全に進めるための共通ルール'));
});

test('予想を自動保存し、印刷では研究後の記録を全文表示して通知を除外する', async () => {
    await withBrowserPage(pikalabRoot, async ({ page, baseUrl }) => {
        await page.addInitScript(() => {
            if (localStorage.getItem('scienceMakerData_v1')) return;
            localStorage.setItem('scienceMakerData_v1', JSON.stringify({
                topicId: '1d_exp_1', createdAt: '2026/10/11',
                studentName: '', title: '合成検証の研究', motivation: '',
                hypothesis: '', materials: '', method: ''
            }));
        });
        await page.goto(`${baseUrl}/science_maker/`);
        await page.waitForFunction(() => document.documentElement.dataset.scienceSummerSupportReady === 'true');
        await page.locator('#plan-hypothesis').fill('合成検証：保存する予想');
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('scienceMakerData_v1')).hypothesis === '合成検証：保存する予想');
        await page.reload();
        await page.waitForFunction(() => document.documentElement.dataset.scienceSummerSupportReady === 'true');
        assert.equal(await page.locator('#plan-hypothesis').inputValue(), '合成検証：保存する予想');

        await page.locator('#plan-result').fill('合成検証：結果を印刷する');
        const discussion = `${'合成検証の考察\n'.repeat(24)}考察の最後まで印刷する`;
        await page.locator('#plan-discussion').fill(discussion);
        await page.locator('#plan-next-question').fill('合成検証：次の疑問を印刷する');
        await page.emulateMedia({ media: 'print' });
        await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
        const printedText = await page.locator('#plan-paper').innerText();
        for (const expected of ['合成検証：保存する予想', '合成検証：結果を印刷する', '考察の最後まで印刷する', '合成検証：次の疑問を印刷する']) {
            assert.ok(printedText.includes(expected), expected);
        }
        assert.equal(await page.locator('#toast-container').isVisible(), false);
        await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
        await page.emulateMedia({ media: 'screen' });
        assert.equal(await page.locator('#plan-result').inputValue(), '合成検証：結果を印刷する');
        assert.equal(await page.locator('#plan-discussion').inputValue(), discussion);
    });
});

test('topics.js: 高リスクテーマには safety が定義されている', () => {
    const topicsSource = fs.readFileSync(path.join(projectRoot, 'topics.js'), 'utf8');
    const topicIds = ['1d_craft_1', '1d_obs_2', '1w_obs_1'];

    topicIds.forEach((id) => {
        const pattern = new RegExp(`id: '${id}'[\\s\\S]*?safety:\\s*\\[`, 'm');
        assert.match(topicsSource, pattern);
    });
});

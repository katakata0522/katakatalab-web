const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const {
    clampNumber,
    sanitizePaperType,
    sanitizeKanjiStyle,
    countCharacters,
    truncateCharacters,
    buildShareQuery,
    readSharedDraft,
    calculateAutoScale,
    getHorizontalPaddingPx,
    buildPaperMarkup,
    sanitizeBookReportSlot,
    normalizeBookReportData,
    writeJsonToStorage
} = require(path.join(projectRoot, 'script.js'));

test('clampNumber: 数値範囲を安全にクランプする', () => {
    assert.equal(clampNumber('abc', 0.3, 1.5, 1), 1);
    assert.equal(clampNumber(0.1, 0.3, 1.5, 1), 0.3);
    assert.equal(clampNumber(2.0, 0.3, 1.5, 1), 1.5);
    assert.equal(clampNumber(0.95, 0.3, 1.5, 1), 0.95);
});

test('sanitizePaperType: 不正な用紙種別をkanjiへフォールバックする', () => {
    assert.equal(sanitizePaperType('grid5'), 'grid5');
    assert.equal(sanitizePaperType('invalid-type'), 'kanji');
    assert.equal(sanitizePaperType(undefined), 'kanji');
});

test('sanitizeKanjiStyle: 共有URLなどからの不正なマス数を35字へ戻す', () => {
    assert.equal(sanitizeKanjiStyle('84'), '84');
    assert.equal(sanitizeKanjiStyle('104'), '104');
    assert.equal(sanitizeKanjiStyle('999'), '35');
});

test('Unicode文字数: 補助漢字や絵文字を1文字として数え、途中分断せず切り詰める', () => {
    assert.equal(countCharacters('𠮷😊あ'), 3);
    assert.equal(truncateCharacters('𠮷😊あ', 2), '𠮷😊');
});

test('共有クエリ: 原稿用紙以外へ下書きを持ち出さず、漢字マス数は復元できる', () => {
    const gridParams = new URLSearchParams(buildShareQuery('grid5', '秘密の下書き', '35').query);
    assert.equal(gridParams.has('draft'), false);

    const kanjiParams = new URLSearchParams(buildShareQuery('kanji', '秘密の下書き', '104').query);
    assert.equal(kanjiParams.get('kanji'), '104');
    assert.equal(kanjiParams.has('draft'), false);

    const genko = buildShareQuery('genko200', '𠮷'.repeat(1001), '35', 1000);
    const genkoParams = new URLSearchParams(genko.query);
    assert.equal(countCharacters(readSharedDraft(genkoParams)), 1000);
    assert.equal(genko.draftWasTruncated, true);
});

test('calculateAutoScale: コンテナ幅から期待どおりの縮尺を返す', () => {
    const paperWidth = 210 * 3.7795;
    const scaleLarge = calculateAutoScale(2000, paperWidth, 60, 0.3, 1.5);
    const scaleSmall = calculateAutoScale(400, paperWidth, 60, 0.3, 1.5);
    const scaleMin = calculateAutoScale(100, paperWidth, 60, 0.3, 1.5);

    assert.equal(scaleLarge, 1);
    assert.ok(scaleSmall > 0.3 && scaleSmall < 1);
    assert.equal(scaleMin, 0.3);
});

test('getHorizontalPaddingPx: 非ブラウザ環境や無効要素では0を返す', () => {
    assert.equal(getHorizontalPaddingPx(null), 0);
});

test('buildPaperMarkup: 各用紙タイプで必要な要素数を生成する', () => {
    const paperConfig = {
        A4_W: 210,
        A4_H: 297,
        MARGIN: 15,
        KANJI_COLS: 5,
        KANJI_ROWS: 7,
        ENGLISH_ROWS: 15,
        MUSIC_STAVES: 12
    };

    const kanji = buildPaperMarkup('kanji', paperConfig);
    const english = buildPaperMarkup('english', paperConfig);
    const music = buildPaperMarkup('music', paperConfig);

    assert.equal((kanji.match(/<rect\b/g) || []).length, 35);
    assert.equal((english.match(/<line\b/g) || []).length, 60);
    assert.equal((music.match(/<line\b/g) || []).length, 96);
});

test('sanitizeBookReportSlot: 保存先は1〜3の既知スロットだけを許可する', () => {
    assert.equal(sanitizeBookReportSlot('1'), '1');
    assert.equal(sanitizeBookReportSlot(3), '3');
    assert.equal(sanitizeBookReportSlot('../../other'), '1');
    assert.equal(sanitizeBookReportSlot('4'), '1');
});

test('normalizeBookReportData: 壊れた保存値を安全な形式へ直して下書きを設定する', () => {
    const fromArray = normalizeBookReportData([], '新しい下書き');
    assert.deepEqual(fromArray, {
        formData: { draftText: '新しい下書き' },
        draftText: '新しい下書き'
    });

    const preserved = normalizeBookReportData(
        { formData: { title: '本の題名' }, currentStep: 2 },
        '本文'
    );
    assert.equal(preserved.formData.title, '本の題名');
    assert.equal(preserved.formData.draftText, '本文');
    assert.equal(preserved.draftText, '本文');
    assert.equal(preserved.currentStep, 2);
});

test('writeJsonToStorage: 保存失敗時に画面通知してfalseを返す', () => {
    const messages = [];
    const storage = {
        setItem() {
            throw new Error('storage disabled');
        }
    };

    const originalConsoleError = console.error;
    console.error = () => {};
    try {
        const saved = writeJsonToStorage(storage, 'draft-key', { draftText: '本文' }, (message) => {
            messages.push(message);
        });
        assert.equal(saved, false);
    } finally {
        console.error = originalConsoleError;
    }

    assert.deepEqual(messages, ['下書きを保存できませんでした。ブラウザの保存容量や設定を確認してください。']);
});

test('index.html: Tailwind CDNへ依存せず、基本CSPと共通クリックジャッキング対策を持つ', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const rootHtaccess = fs.readFileSync(path.join(projectRoot, '..', '..', '.htaccess'), 'utf8');
    assert.ok(html.includes("script-src 'self'"));
    assert.ok(!html.includes('https://cdn.tailwindcss.com'));
    assert.ok(!html.includes("script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'"));
    assert.ok(html.includes('../style.css'));
    assert.ok(html.includes("object-src 'none'"));
    assert.ok(html.includes("base-uri 'self'"));
    assert.ok(rootHtaccess.includes("frame-ancestors 'self'"));
});

test('index.html: すべてのbuttonにtype="button"が明示されている', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const buttonTags = html.match(/<button\b[^>]*>/g) || [];
    assert.ok(buttonTags.length > 0);
    buttonTags.forEach((tag) => {
        assert.match(tag, /type="button"/);
    });
});

test('index.html: 保護者モーダルのイベント登録は重複せず、共有時のデータ移動を明示する', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const modalSetupCount = (html.match(/const openBtns = document\.querySelectorAll\('\[data-action="parents-modal-open"\]'\);/g) || []).length;

    assert.equal(modalSetupCount, 1);
    assert.ok(html.includes('家族に共有する'));
    assert.ok(!html.includes('家族にLINEで送る'));
    assert.ok(html.includes('通常の作成・保存では'));
    assert.ok(html.includes('共有URLに含まれ'));
    assert.ok(html.includes('最大1000文字'));
});

test('script.js: 原稿用紙の更新は欠けたtextノードへの差分更新を使わず再構築する', () => {
    const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
    assert.ok(!script.includes("querySelectorAll('text')"));
    assert.ok(!script.includes('flatCells'));
    assert.match(script, /refreshPaper\(\)[\s\S]*?buildPaperMarkup\([\s\S]*?\);/);
});

test('style.css: 印刷時の用紙サイズがA4固定になっている', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');
    assert.match(
        css,
        /@media print[\s\S]*?\.paper-sheet\s*{[\s\S]*?width:\s*210mm/
    );
    assert.match(
        css,
        /@media print[\s\S]*?\.paper-sheet\s*{[\s\S]*?height:\s*297mm/
    );
    assert.match(
        css,
        /@media print[\s\S]*?\.paper-sheet\s*{[\s\S]*?page-break-after:\s*always/
    );
});


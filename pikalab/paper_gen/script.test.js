const test = require('node:test');
const assert = require('node:assert/strict');

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
    mapTextToGenkoGrid,
    getVerticalTextOffset,
    app
} = require('./script.js');

test('clampNumber clamps correctly', () => {
    assert.equal(clampNumber(5, 1, 10), 5);
    assert.equal(clampNumber(0, 1, 10), 1);
    assert.equal(clampNumber(15, 1, 10), 10);
    assert.equal(clampNumber('invalid', 1, 10, 3), 3);
});

test('sanitizePaperType validates types', () => {
    assert.equal(sanitizePaperType('kanji'), 'kanji');
    assert.equal(sanitizePaperType('genko400'), 'genko400');
    assert.equal(sanitizePaperType('genko200'), 'genko200');
    assert.equal(sanitizePaperType('invalid'), 'kanji'); // default fallback
});

test('sanitizeKanjiStyle validates supported grid sizes', () => {
    assert.equal(sanitizeKanjiStyle('35'), '35');
    assert.equal(sanitizeKanjiStyle('84'), '84');
    assert.equal(sanitizeKanjiStyle(104), '104');
    assert.equal(sanitizeKanjiStyle('999'), '35');
});

test('countCharacters and truncateCharacters handle supplementary characters without splitting them', () => {
    assert.equal(countCharacters('𠮷野家😊'), 4);
    assert.equal(truncateCharacters('𠮷野家😊', 3), '𠮷野家');
    assert.equal(countCharacters(truncateCharacters('𠮷😊あ', 2)), 2);
});

test('buildShareQuery only includes draft for manuscript paper and preserves kanji grid style', () => {
    const hiddenDraft = buildShareQuery('grid5', '共有したくない下書き', '35');
    const hiddenParams = new URLSearchParams(hiddenDraft.query);
    assert.equal(hiddenParams.get('type'), 'grid5');
    assert.equal(hiddenParams.has('draft'), false);

    const kanji = buildShareQuery('kanji', '共有したくない下書き', '84');
    const kanjiParams = new URLSearchParams(kanji.query);
    assert.equal(kanjiParams.get('type'), 'kanji');
    assert.equal(kanjiParams.get('kanji'), '84');
    assert.equal(kanjiParams.has('draft'), false);

    const genko = buildShareQuery('genko400', '𠮷'.repeat(1001), '35', 1000);
    const genkoParams = new URLSearchParams(genko.query);
    assert.equal(countCharacters(readSharedDraft(genkoParams)), 1000);
    assert.equal(genko.draftWasTruncated, true);
});

test('getVerticalTextOffset identifies punctuation and brackets', () => {
    // 句読点 (右上にずらす)
    const puncResult = getVerticalTextOffset('。');
    assert.equal(puncResult.dx, '0.3em');
    assert.equal(puncResult.dy, '-0.3em');
    assert.equal(puncResult.isPunc, true);

    // 開き括弧 (左下にずらす)
    const bracketResult = getVerticalTextOffset('「');
    assert.equal(bracketResult.dx, '-0.15em');
    assert.equal(bracketResult.dy, '0.15em');
    assert.equal(bracketResult.isPunc, false);

    // 小書き文字 (右上にずらす)
    const smallResult = getVerticalTextOffset('っ');
    assert.equal(smallResult.dx, '0.15em');
    assert.equal(smallResult.dy, '-0.15em');
    assert.equal(smallResult.isPunc, false);

    // 通常文字 (オフセットなし)
    const normalResult = getVerticalTextOffset('あ');
    assert.equal(normalResult.dx, '0');
    assert.equal(normalResult.dy, '0');
    assert.equal(normalResult.isPunc, false);
});

test('mapTextToGenkoGrid maps basic text and auto-indents', () => {
    const text = '吾輩は猫である。\n名前はまだ無い。';
    // 400字詰 (20行 x 20字)
    const pages = mapTextToGenkoGrid(text, 20, 20);

    // 1ページ生成されているはず
    assert.equal(pages.length, 1);
    const grid = pages[0];

    // 自動字下げ（先頭に全角スペースが入る）
    assert.equal(grid[0][0], '　');
    assert.equal(grid[0][1], '吾');
    assert.equal(grid[0][8], '。');
    assert.equal(grid[0][9], ''); // 改行後の残りマスは空

    // 2番目の行 (2列目) - 2段落目も自動字下げ
    assert.equal(grid[1][0], '　');
    assert.equal(grid[1][1], '名');
    assert.equal(grid[1][8], '。');
    assert.equal(grid[1][9], '');
});

test('mapTextToGenkoGrid wraps lines and splits pages when overflow occurs', () => {
    // 20文字を超えるテキスト
    const text = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ'; // 30文字
    // 1行15文字の小さな設定でテスト (2列 x 15行 = 30文字の用紙)
    const pages = mapTextToGenkoGrid(text, 2, 15);

    // 自動字下げ（1文字全角スペースが追加されるので計31文字になり、2ページに渡るはず）
    assert.equal(pages.length, 2);

    const page1 = pages[0];
    const page2 = pages[1];

    // page 1
    assert.equal(page1[0][0], '　'); // 自動字下げ
    assert.equal(page1[0][1], 'あ');
    assert.equal(page1[0][14], 'せ'); // 15文字目は「せ」

    assert.equal(page1[1][0], 'そ'); // 16文字目は「そ」
    assert.equal(page1[1][14], 'へ'); // 30文字目は「へ」

    // page 2
    assert.equal(page2[0][0], 'ほ'); // 31文字目は「ほ」が入っているはず
});

test('mapTextToGenkoGrid handles burasage (punctuation wrapping)', () => {
    // 自動字下げ（先頭に全角スペース追加）を考慮し、6文字目に「。」が来るようにする。
    // "　あいうえ" (5文字) の次が「。」なので、2行目の行頭に来る。
    const text = 'あいうえ。か';
    // 5文字詰用紙（1行5文字制限）
    const pages = mapTextToGenkoGrid(text, 3, 5);
    const grid = pages[0];

    // 1行目 (5マス)
    assert.equal(grid[0][0], '　'); // 自動字下げ
    assert.equal(grid[0][1], 'あ');
    assert.equal(grid[0][3], 'う');

    // 2行目の行頭に来そうになった「。」が、ぶら下げルールにより1行目の最後のマス「え」に合体する
    assert.equal(grid[0][4], 'え。');

    // 2行目の1文字目には次の文字「か」が入る
    assert.equal(grid[1][0], 'か');
});

test('buildPaperMarkup generates multi-page markup structures', () => {
    const paperConfig = {
        A4_W: 210,
        A4_H: 297,
        MARGIN: 15,
        KANJI_COLS: 5,
        KANJI_ROWS: 7,
        ENGLISH_ROWS: 15,
        MUSIC_STAVES: 12
    };

    // 400字詰でのテスト
    const svgGenko400 = buildPaperMarkup('genko400', paperConfig, 'テスト');
    assert.match(svgGenko400, /<div class="paper-sheet"/);
    assert.match(svgGenko400, /<svg/);
    assert.match(svgGenko400, /class="genko-text"/);

    // 複数ページに渡る長いテキストでのマークアップ生成テスト
    const longText = 'あ'.repeat(500); // 400字を超える
    const multiPageMarkup = buildPaperMarkup('genko400', paperConfig, longText);
    
    // <div class="paper-sheet"> が2つ以上存在することを確認
    const sheetCount = (multiPageMarkup.match(/class="paper-sheet"/g) || []).length;
    assert.equal(sheetCount, 2);
});

test('mapTextToGenkoGrid handles surrogate pairs and emojis correctly', () => {
    // 𠮷などのサロゲートペア文字、絵文字を含むテキスト
    const text = '𠮷野家で食べる😊';
    const pages = mapTextToGenkoGrid(text, 10, 10);
    
    assert.equal(pages.length, 1);
    const grid = pages[0];
    
    // 自動字下げが入るので、0列目の0マス目は全角スペース
    assert.equal(grid[0][0], '　');
    // 0列目の1マス目に「𠮷」が正しく1文字で入るはず（サロゲートペアで2文字に分断されない）
    assert.equal(grid[0][1], '𠮷');
    assert.equal(grid[0][2], '野');
    assert.equal(grid[0][3], '家');
    // 絵文字「😊」も正しく1文字として入る
    assert.equal(grid[0][7], 'る');
    assert.equal(grid[0][8], '😊');
});

test('buildKanjiMarkup generates different grids based on kanjiStyle', () => {
    const paperConfig = {
        A4_W: 210,
        A4_H: 297
    };

    // 35字のテスト
    const svg35 = buildPaperMarkup('kanji', paperConfig, '', '35');
    const rectCount35 = (svg35.match(/<rect/g) || []).length;
    assert.equal(rectCount35, 35);

    // 84字のテスト
    const svg84 = buildPaperMarkup('kanji', paperConfig, '', '84');
    const rectCount84 = (svg84.match(/<rect/g) || []).length;
    assert.equal(rectCount84, 84);

    // 104字のテスト
    const svg104 = buildPaperMarkup('kanji', paperConfig, '', '104');
    const rectCount104 = (svg104.match(/<rect/g) || []).length;
    assert.equal(rectCount104, 104);
});

test('refreshPaper rebuilds manuscript markup so same-page additions and deletions stay in sync', () => {
    const originalDom = app.dom;
    const originalType = app.activePaperType;
    const originalStyle = app.activeKanjiStyle;
    const printTarget = { innerHTML: '' };

    try {
        app.dom = {
            printTarget,
            draftTextarea: { value: 'あ' }
        };
        app.activePaperType = 'genko400';
        app.activeKanjiStyle = '35';

        app.refreshPaper();
        assert.match(printTarget.innerHTML, />あ<\/text>/);

        app.dom.draftTextarea.value = 'あい';
        app.refreshPaper();
        assert.match(printTarget.innerHTML, />い<\/text>/);

        app.dom.draftTextarea.value = 'あ';
        app.refreshPaper();
        assert.doesNotMatch(printTarget.innerHTML, />い<\/text>/);
    } finally {
        app.dom = originalDom;
        app.activePaperType = originalType;
        app.activeKanjiStyle = originalStyle;
    }
});


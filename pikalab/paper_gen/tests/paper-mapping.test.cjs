const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '..', 'script.js');
const {
    countCharacters,
    truncateCharacters,
    buildShareQuery,
    readSharedDraft,
    mapTextToGenkoGrid,
    buildPaperMarkup
} = require(scriptPath);

const PAPER_CONFIG = { A4_W: 210, A4_H: 297 };
const GRAPHEMES = ['か\u3099', '葛\u{E0100}', '👨‍👩‍👧‍👦', '🇯🇵', '👍🏽', '1️⃣'];

test('結合文字・異体字・連結絵文字は、数える・切り詰める・マスへ置く単位が一致する', () => {
    for (const character of GRAPHEMES) {
        assert.equal(countCharacters(character), 1, character);
        assert.equal(truncateCharacters(`${character}次`, 1), character);
        const pages = mapTextToGenkoGrid(`${character}次`, 2, 5);
        assert.equal(pages[0][0][1], character);
        assert.equal(pages[0][0][2], '次');
    }
});

test('原稿用紙の改行・改ページ境界でも結合文字を分断しない', () => {
    for (const character of GRAPHEMES) {
        const exactPage = mapTextToGenkoGrid(`あ${character}`, 1, 3);
        assert.equal(exactPage.length, 1);
        assert.deepEqual(exactPage[0][0], ['　', 'あ', character]);

        const nextPage = mapTextToGenkoGrid(`あ${character}次`, 1, 3);
        assert.equal(nextPage.length, 2);
        assert.equal(nextPage[0][0][2], character);
        assert.equal(nextPage[1][0][0], '次');

        const hanging = mapTextToGenkoGrid(`あ${character}。`, 1, 3);
        assert.equal(hanging.length, 1);
        assert.equal(hanging[0][0][2], `${character}。`);
    }
});

test('SVGでも結合文字は1つのtext要素で描き、句読点だけをぶら下げる', () => {
    const character = 'か\u3099';
    const markup = buildPaperMarkup('genko400', PAPER_CONFIG, `${'あ'.repeat(18)}${character}。`);
    assert.match(markup, new RegExp(`dx="0" dy="0">${character}</text>`));
    assert.doesNotMatch(markup, />か<\/text>|>\u3099<\/text>/u);
    assert.match(markup, /dx="0\.3em" dy="0\.7em">。<\/text>/);

    for (const grapheme of GRAPHEMES) {
        const textMarkup = buildPaperMarkup('genko200', PAPER_CONFIG, grapheme);
        assert.equal((textMarkup.match(/<text\b/g) || []).length, 1);
        assert.ok(textMarkup.includes(`>${grapheme}</text>`));
    }
});

test('連続するぶら下げ句読点に同じ描画座標を割り当てない', () => {
    const text = `${'あ'.repeat(19)}。」』次`;
    const pages = mapTextToGenkoGrid(text, 20, 20);
    assert.equal(pages[0][0][19], 'あ。」');
    assert.equal(pages[0][1][0], '』');
    assert.equal(pages[0][1][1], '次');
    const markup = buildPaperMarkup('genko400', PAPER_CONFIG, text);
    const punctuation = [...markup.matchAll(/<text\b([^>]*)>([。」』])<\/text>/g)];
    assert.equal(punctuation.length, 3);
    const positions = punctuation.map(([, attributes]) => attributes.match(/\bdy="([^"]+)"/)[1]);
    assert.equal(positions[0], '0.7em');
    assert.equal(new Set(positions).size, punctuation.length);
});

test('共有URLの1000文字境界で結合文字や連結絵文字を切り落とさない', () => {
    for (const character of GRAPHEMES) {
        const text = `${'あ'.repeat(999)}${character}`;
        const exact = buildShareQuery('genko400', text, '35');
        assert.equal(readSharedDraft(new URLSearchParams(exact.query)), text);
        assert.equal(exact.draftWasTruncated, false);

        const overLimit = buildShareQuery('genko400', `${text}次`, '35');
        assert.equal(readSharedDraft(new URLSearchParams(overLimit.query)), text);
        assert.equal(overLimit.draftWasTruncated, true);
    }
    assert.equal(truncateCharacters('本文', 0), '');
    assert.equal(truncateCharacters('本文', -1), '');
    assert.equal(truncateCharacters('本文', Number.NaN), '');
    assert.equal(truncateCharacters('本文', 1.9), '本');
});

test('CRとUnicode改行を不可視のマスとして消費せず段落を改める', () => {
    const expected = mapTextToGenkoGrid('あ\n\nい', 3, 5);
    for (const separator of ['\r\n', '\r', '\u2028', '\u2029']) {
        assert.deepEqual(mapTextToGenkoGrid(`あ${separator}${separator}い`, 3, 5), expected);
    }
});

test('結合文字に含まれるXML特殊文字もSVGへ安全にエスケープする', () => {
    const markup = buildPaperMarkup('genko400', PAPER_CONFIG, '<\u0301&\u0301>\u0301');
    assert.ok(markup.includes('>&lt;\u0301</text>'));
    assert.ok(markup.includes('>&amp;\u0301</text>'));
    assert.ok(markup.includes('>&gt;\u0301</text>'));
    assert.doesNotMatch(markup, /><\u0301<\/text>/u);
});

test('Intl.Segmenterがない環境では従来のコードポイント単位で安全に動作する', () => {
    for (const Intl of [undefined, {}]) {
        const context = vm.createContext({ Intl, module: { exports: {} }, URLSearchParams });
        vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context);
        const fallback = context.module.exports;
        assert.equal(fallback.countCharacters('𠮷😊あ'), 3);
        assert.equal(fallback.truncateCharacters('𠮷😊あ', 2), '𠮷😊');
        const pages = fallback.mapTextToGenkoGrid('𠮷😊あ', 2, 5);
        assert.equal(pages[0][0][1], '𠮷');
        assert.equal(pages[0][0][2], '😊');
        assert.match(fallback.buildPaperMarkup('genko200', PAPER_CONFIG, '𠮷😊'), />𠮷<\/text>/u);
    }
});


test('長い句読点の連続を用紙の下端からはみ出させず次のマスへ送る', () => {
    const text = `${'あ'.repeat(19)}${'。'.repeat(10)}`;
    const grid = mapTextToGenkoGrid(text, 10, 20)[0];
    assert.equal(grid[0][19], 'あ。。');
    assert.deepEqual(grid[1].slice(0, 8), Array(8).fill('。'));
    const markup = buildPaperMarkup('genko200', PAPER_CONFIG, text);
    const rendered = [...markup.matchAll(/<text\b([^>]*)>。<\/text>/g)];
    assert.equal(rendered.length, 10);
    for (const [, attributes] of rendered) {
        const y = Number(attributes.match(/\by="([^"]+)"/)[1]);
        const size = Number(attributes.match(/\bfont-size="([^"]+)"/)[1]);
        const dy = Number.parseFloat(attributes.match(/\bdy="([^"]+)"/)[1]);
        assert.ok(y + dy * size + size / 2 < 297, '文字全体がA4の高さ内に収まる');
    }
});


test('長音・括弧は縦書き字形を使い、通常の漢字・かなの配置は変えない', () => {
    const markup = buildPaperMarkup('genko200', PAPER_CONFIG, 'コーヒー「図書館」');
    for (const char of ['ー', '「', '」']) {
        assert.match(markup, new RegExp(`style="writing-mode:vertical-rl;text-orientation:mixed">${char}</text>`));
    }
    assert.match(markup, /dx="0" dy="0">コ<\/text>/);
    assert.match(markup, /dx="0" dy="0">図<\/text>/);
});

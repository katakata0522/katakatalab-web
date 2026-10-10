const test = require('node:test');
const assert = require('node:assert/strict');
const { buildShareQuery, readSharedDraft, countCharacters } = require('../script.js');

const baseUrl = 'https://katakatalab.com/pikalab/paper_gen/';
const lineUrl = query => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(`${baseUrl}?${query}`)}`;

for (const character of ['あ', '𠮷', '😊', 'A']) {
    test(`1000文字の${character}は全文を復元でき、共有先へ渡すURLも上限内に収まる`, () => {
        const source = character.repeat(1000);
        const result = buildShareQuery('genko400', source, '35');
        assert.equal(readSharedDraft(new URLSearchParams(result.query)), source);
        assert.equal(result.draftWasTruncated, false);
        assert.ok(lineUrl(result.query).length < 7500);
    });
}

test('短い既存形式のリンクを変えず、新旧両方から下書きを読み込める', () => {
    const result = buildShareQuery('genko200', '昔の共有リンク', '35');
    assert.equal(new URLSearchParams(result.query).get('draft'), '昔の共有リンク');
    assert.equal(readSharedDraft(new URLSearchParams('draft=%E6%9C%AC%E6%96%87')), '本文');
    assert.equal(readSharedDraft(new URLSearchParams()), null);
});

test('長い連結絵文字は書記素を分断せず、明示的に部分共有として扱う', () => {
    const grapheme = '👨‍👩‍👧‍👦';
    const source = grapheme.repeat(1000);
    const result = buildShareQuery('genko400', source, '35');
    const decoded = readSharedDraft(new URLSearchParams(result.query));
    assert.equal(result.draftWasTruncated, true);
    assert.ok(decoded.length < source.length);
    assert.equal(decoded, grapheme.repeat(countCharacters(decoded)));
    assert.ok(lineUrl(result.query).length < 7500);
    assert.equal(source, grapheme.repeat(1000), '元の入力を変えない');
});

test('不正な符号化・UTF-8を本文として受け入れない', () => {
    for (const encoded of ['@@@', 'a', '_w']) {
        assert.throws(() => readSharedDraft(new URLSearchParams({ draft64: encoded })));
    }
});


test('符号化された本文の先頭にあるBOMも勝手に削除しない', () => {
    const source = '\uFEFF' + 'あ'.repeat(999);
    const result = buildShareQuery('genko400', source, '35');
    assert.equal(readSharedDraft(new URLSearchParams(result.query)), source);
});

const test = require('node:test');
const assert = require('node:assert/strict');
 
const { Utils } = require('./script.js');
 
test('escapeHTML escapes special characters', () => {
    const input = '<script>alert("x")</script>';
    const escaped = Utils.escapeHTML(input);
    assert.equal(escaped, '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});
 
test('removeEmoji removes emoji and keeps text', () => {
    const input = '感動した🥺✨';
    const output = Utils.removeEmoji(input);
    assert.equal(output, '感動した');
});
 
test('sanitizeFilename replaces forbidden characters', () => {
    const input = '読書:感想/文*テスト?.txt';
    const output = Utils.sanitizeFilename(input);
    assert.equal(output, '読書_感想_文_テスト_.txt');
});
 
test('coerceSafeString trims and limits text length', () => {
    const input = '  1234567890  ';
    const output = Utils.coerceSafeString(input, 5);
    assert.equal(output, '12345');
});
 
test('escapeSelectorValue escapes quote and bracket for selector safety', () => {
    const input = 'value"]x';
    const output = Utils.escapeSelectorValue(input);
    assert.match(output, /\\\"/);
    assert.match(output, /\\\]/);
});

test('combineSynopsis story combined correctly with all parts', () => {
    const result = Utils.combineSynopsis('story', 'メロスが', '全力で走って', '約束を守り抜く');
    assert.equal(result, 'メロスが、全力で走って、約束を守り抜くお話');
});

test('combineSynopsis story handles partial inputs (A & C only)', () => {
    const result = Utils.combineSynopsis('story', 'メロスが', '', '約束を守る');
    assert.equal(result, 'メロスが、約束を守るお話');
});

test('combineSynopsis story handles single input (A only)', () => {
    const result = Utils.combineSynopsis('story', '走れメロス', '', '');
    assert.equal(result, '走れメロスについてのお話');
});

test('combineSynopsis story triggers duplicate particle trimming', () => {
    const result = Utils.combineSynopsis('story', '主人公のメロスが', '全力で走って', '約束を守る');
    assert.equal(result, '主人公のメロスが、全力で走って、約束を守るお話');
});

test('combineSynopsis biography handles vertical偉人 style correctly', () => {
    const result = Utils.combineSynopsis('biography', 'エジソンが', '電球を発明して', '世界を明るくした');
    assert.equal(result, 'エジソンが、電球を発明して、世界を明るくした一生を描いた本');
});

test('combineSynopsis science handles science facts structure correctly', () => {
    const result = Utils.combineSynopsis('science', 'アリの社会が', '見事に役割分担をしていて', '助け合っている');
    assert.equal(result, 'アリの社会が、見事に役割分担をしていて、助け合っている様子について詳しく書かれた本');
});

test('combineSynopsis returns empty string when all inputs are empty', () => {
    const result = Utils.combineSynopsis('story', '  ', '', '');
    assert.equal(result, '');
});

test('combineSynopsis story handles subject ending with about particle', () => {
    const result = Utils.combineSynopsis('story', 'メロスについて', '全力で走って', '約束を守り抜く');
    assert.equal(result, 'メロスについて、全力で走って、約束を守り抜くお話');
});

test('combineSynopsis story handles continuative verb endings for part B', () => {
    const result = Utils.combineSynopsis('story', 'メロスが', '全力で走り', '約束を守り抜く');
    assert.equal(result, 'メロスが、全力で走り、約束を守り抜くお話');
});

test('getCharLength counts surrogate pairs and emojis correctly', () => {
    assert.equal(Utils.getCharLength('𠮷野家'), 3);
    assert.equal(Utils.getCharLength('感動した🥺✨'), 6);
    assert.equal(Utils.getCharLength(''), 0);
    assert.equal(Utils.getCharLength(null), 4);
});

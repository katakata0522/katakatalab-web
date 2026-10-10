const test = require('node:test');
const assert = require('node:assert/strict');
const security = require('../assets/code-studio-security.js');

test('壊れた履歴の保存値でも配列を返し、プレビュー実行を止めない', () => {
    for (const value of [null, '', '{bad', 'null', '{}', 'true', '42', '"history"']) {
        assert.deepEqual(security.parseHistoryJson(value), []);
    }
    assert.deepEqual(security.parseHistoryJson(JSON.stringify([null, [], 2, { timestamp: 'today' }, { timestamp: 1, html: {} }])), []);
});

test('旧履歴の省略フィールドを補い、有効なコードと順序は変えない', () => {
    const source = { timestamp: 1720000000000, html: '<p>そのまま</p>', js: 'const constructor = "保存";' };
    const output = security.parseHistoryJson(JSON.stringify([null, source, { ...source, timestamp: 1720000000001 }]));
    assert.deepEqual(output, [
        { ...source, css: '', json: '', php: '' },
        { ...source, timestamp: 1720000000001, css: '', json: '', php: '' }
    ]);
    assert.equal(security.parseHistoryJson(JSON.stringify(Array.from({ length: 20 }, () => source)), 10).length, 10);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

function loadStorage(initialValue) {
    let raw = initialValue;
    const context = vm.createContext({
        localStorage: { getItem: () => raw, setItem: (_key, value) => { raw = value; } }
    });
    vm.runInContext(`${source}\nglobalThis.storage = StorageManager;`, context);
    return { storage: context.storage, read: () => JSON.parse(raw) };
}

test('破損した保存領域でも結果を表示し、次のハイスコアを保存できる', () => {
    for (const raw of ['null', '[]', '12', 'true', '"text"', '{broken']) {
        const { storage, read } = loadStorage(raw);
        assert.equal(storage.getHighScore('meaning', 10), 0, raw);
        assert.equal(storage.saveHighScore('meaning', 10, 350), true, raw);
        assert.equal(read().meaning_10_all_all, 350);
        assert.equal(read().meaning_10, 350);
    }
});

test('既存の新旧スコアを維持し、不正なスコアだけを無視する', () => {
    const { storage, read } = loadStorage(JSON.stringify({
        meaning_10_all_all: null, meaning_10: 75,
        fillin_10_all_all: 'broken', fillin_10: -5,
        meaning_20_all_all: 120,
        meaning_20_kotowaza_1: 45
    }));
    assert.equal(storage.getHighScore('meaning', 10), 75);
    assert.equal(storage.getHighScore('fillin', 10), 0);
    assert.equal(storage.getHighScore('meaning', 20), 120);
    assert.equal(storage.getHighScore('meaning', 20, 'kotowaza', '1'), 45);
    assert.equal(storage.saveHighScore('meaning', 20, 119), false);
    assert.equal(storage.saveHighScore('meaning', 20, NaN), false);
    assert.equal(storage.saveHighScore('meaning', 20, Infinity), false);
    assert.equal(storage.saveHighScore('meaning', 20, -1), false);
    assert.equal(read().meaning_20_all_all, 120);
});

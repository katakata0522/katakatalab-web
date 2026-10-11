const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../js');

function harness() {
    const context = { window: { matchMedia: () => ({ matches: false }) }, console };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(root, 'roles.js'), 'utf8'), context);
    let source = fs.readFileSync(path.join(root, 'ux.js'), 'utf8');
    // DOM初期化だけ置き換え、製品の索引・検索関数そのものを計測する。
    source = source.replace(/    ensureStylesheet\(\);\n    whenAppReady\(init\);/, '    window.searchTest = { poolIndex, entryHaystack };');
    vm.runInContext(source, context);
    return context.window;
}

test('索引のパーツ・相棒・deep分類は全337字の元の全走査結果と一致する', () => {
    const { KanjiLabData: data, KanjiLabRoles: roles, searchTest } = harness();
    for (const pool of [data.KANJI_LR, data.KANJI_UD]) {
        const index = searchTest.poolIndex(pool);
        assert.equal(searchTest.poolIndex(pool), index);
        for (const [side, key, other] of [['left', 'l', 'r'], ['right', 'r', 'l']]) {
            for (const part of new Set(pool.map(entry => entry[key]))) {
                const expected = pool.filter(entry => entry[key] === part);
                assert.deepEqual(Array.from(index[side].get(part).entries, entry => entry.k), Array.from(expected, entry => entry.k));
                assert.deepEqual([...index[side].get(part).partners], [...new Set(expected.map(entry => entry[other]))]);
                assert.equal(index[side].get(part).deepOnly, roles.isDeepOnlyPart(pool, side, part));
            }
        }
    }
});

test('10回の同一カタログ検索で本文読み出しを3370回から337回に抑える', () => {
    const { KanjiLabData: data, searchTest } = harness();
    let reads = 0;
    const entries = data.KANJI_ALL.map(entry => ({ ...entry, get m() { reads++; return entry.m; } }));
    for (let run = 0; run < 10; run++) {
        for (const entry of entries) assert.equal(typeof searchTest.entryHaystack(entry), 'string');
    }
    assert.equal(reads, 337);
});

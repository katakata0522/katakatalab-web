const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { decomposeEgyptianFraction } = require('../script.js');

function settingsHarness(initial) {
    let stored = initial;
    const context = {
        console: { error() {} },
        document: {
            addEventListener() {},
            body: { classList: { add() {}, remove() {} } },
            getElementById() { return null; }
        },
        localStorage: {
            getItem() { return stored; },
            setItem(key, value) { stored = value; }
        }
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), context);
    return { context, get stored() { return JSON.parse(stored); }, set stored(value) { stored = JSON.stringify(value); } };
}

test('分数ラボの設定変更は他のプロフィール項目を消さない', () => {
    const h = settingsHarness(JSON.stringify({ darkMode: true, reduceMotion: false, textSize: 'large', favoriteApps: ['kanji_lab'] }));
    vm.runInContext('loadSettings(); userSettings.darkMode = false; saveSettings();', h.context);
    assert.deepEqual(h.stored, { darkMode: false, reduceMotion: false, textSize: 'large', favoriteApps: ['kanji_lab'] });
    h.stored = { ...h.stored, displayName: '新しい名前' };
    vm.runInContext('userSettings.reduceMotion = true; saveSettings();', h.context);
    assert.equal(h.stored.displayName, '新しい名前');
});

for (const stored of ['null', '[]', '{broken', '{"darkMode":"false","reduceMotion":"false"}']) {
    test(`不正なプロフィールでも設定を安全に保存する: ${stored}`, () => {
        const h = settingsHarness(stored);
        vm.runInContext('loadSettings(); saveSettings();', h.context);
        assert.equal(h.stored.darkMode, true);
        assert.equal(h.stored.reduceMotion, false);
    });
}

test('エジプト分数の途中式も全入力範囲で厳密な残りの値になる', () => {
    for (let d = 2; d <= 100; d++) {
        for (let n = 1; n < d; n++) {
            const result = decomposeEgyptianFraction(n, d);
            let numerator = BigInt(n);
            let denominator = BigInt(d);
            result.terms.forEach((term, index) => {
                const unitD = BigInt(term.split('/')[1]);
                numerator = numerator * unitD - denominator;
                denominator *= unitD;
                if (numerator === 0n) {
                    assert.equal(index, result.remainders.length);
                } else {
                    const [remainingN, remainingD] = result.remainders[index].split('/').map(BigInt);
                    assert.equal(remainingN * denominator, numerator * remainingD, `${n}/${d}, step ${index}`);
                }
            });
        }
    }
});


test('長いエジプト分数の数字を狭い結果枠で折り返す', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
    assert.match(css, /#egypt-formula\s*>\s*span\s*\{[^}]*max-width:\s*100%[^}]*overflow-wrap:\s*anywhere/s);
    assert.match(css, /#egypt-steps\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});

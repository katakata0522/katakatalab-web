const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../.kotoba');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = html.match(/<script[^>]*type="module"[^>]*src="([^"?]+\.js)"/)?.[1];
assert.ok(script, '配信するモジュールをHTMLから取得する');
const bundle = fs.readFileSync(path.resolve(root, script), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');

test('言葉当てパズルのすべての問題を画面キーボードで入力できる', () => {
    // 生成元を回収するまでは、実際に配信される辞書とキー配列を検査する。
    const dictionary = bundle.match(/,t=(\{やさい:.*?\}),n=null;/s)?.[1];
    const keys = bundle.match(/var u=.*?,f=u;/s)?.[0];
    assert.ok(dictionary && keys, '配信バンドルの辞書・キーボードを取得する');
    const words = vm.runInNewContext('(' + dictionary + ')', {}, { timeout: 1000 });
    const keyboard = vm.runInNewContext('(()=>{' + keys + 'return [...u.flat(),...d.flat()];})()', {}, { timeout: 1000 });
    const allowed = new Set(keyboard);
    for (const [category, entries] of Object.entries(words)) {
        assert.ok(entries.length > 0, category);
        for (const word of entries) {
            assert.equal(typeof word, 'string');
            assert.ok(word.length > 0);
            assert.deepEqual([...word].filter(char => !allowed.has(char)), [], `${category}: ${word}`);
        }
    }
});

test('緊急修正は辞書と保存境界の3箇所だけに限定し、資産名を内容のハッシュに更新する', () => {
    assert.equal(bundle.split('ぶろっこりー').length - 1, 1);
    assert.equal(bundle.split('window.KotobaStorage.readBestScore()').length - 1, 1);
    assert.equal(bundle.split('window.KotobaStorage.writeBestScore(e.bestScore)').length - 1, 1);
    const original = bundle
        .replace('ぶろっこりー', 'ブロッコリー')
        .replace('window.KotobaStorage.readBestScore()', 'parseInt(localStorage.getItem(`kotoba_bestScore`)||`0`)')
        .replace('window.KotobaStorage.writeBestScore(e.bestScore)', 'localStorage.setItem(`kotoba_bestScore`,e.bestScore)');
    assert.equal(digest(original), '2acc8cf64d7268ea00717ca701dd834c078cce00932b4aebd715b879c6a0b818');
    assert.equal(path.basename(script), `index-${digest(bundle).slice(0, 12)}.js`);
    assert.ok(!html.includes('index-D1fq8kv9.js'), '旧バンドルをHTMLから参照しない');
    assert.equal(fs.existsSync(path.join(root, 'assets/index-D1fq8kv9.js')), false);
    const helper = html.indexOf('<script src="./assets/storage.js"></script>');
    assert.ok(helper >= 0 && helper < html.indexOf('src="' + script + '"'), '安全な保存ヘルパーを本体より先に読み込む');
    for (const [, asset] of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) {
        assert.ok(fs.existsSync(path.resolve(root, asset)), `ローカル資産が存在する: ${asset}`);
    }
});


const storageSource = fs.readFileSync(path.join(root, 'assets/storage.js'), 'utf8');
function loadStorage(storage) {
    const scope = { localStorage: storage };
    scope.window = scope;
    vm.createContext(scope);
    vm.runInContext(storageSource, scope);
    return scope;
}

test('Kotobaの正常な最高得点は同じ保存キーと整数のまま読み書きする', () => {
    let saved = '1500';
    const storage = {
        getItem(key) { assert.equal(key, 'kotoba_bestScore'); return saved; },
        setItem(key, value) { assert.equal(key, 'kotoba_bestScore'); saved = value; }
    };
    const scope = loadStorage(storage);
    assert.equal(scope.KotobaStorage.readBestScore(), 1500);
    assert.equal(scope.KotobaStorage.writeBestScore(2100), true);
    assert.equal(saved, '2100');
    assert.equal(scope.KotobaStorage.readBestScore(), 2100);
    assert.equal(scope.localStorage, storage, 'Storage本体を置き換えない');
});

test('Kotobaの壊れた得点は0へ戻し、不正な得点で保存値を上書きしない', () => {
    for (const raw of [null, '', ' ', 'NaN', 'Infinity', '-100', '100px', '100.5', '1e3', '9007199254740992']) {
        const scope = loadStorage({ getItem: () => raw });
        assert.equal(scope.KotobaStorage.readBestScore(), 0, String(raw));
    }
    for (const raw of ['0', '100', ' 200 ']) {
        const scope = loadStorage({ getItem: () => raw });
        assert.equal(scope.KotobaStorage.readBestScore(), Number(raw));
    }
    let writes = 0;
    const scope = loadStorage({ setItem() { writes++; } });
    for (const score of [-1, NaN, Infinity, 1.5, '100', Number.MAX_SAFE_INTEGER + 1]) {
        assert.equal(scope.KotobaStorage.writeBestScore(score), false);
    }
    assert.equal(writes, 0);
});

test('Kotobaは保存領域の読み書き拒否を処理する', () => {
    const scope = loadStorage({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } });
    assert.equal(scope.KotobaStorage.readBestScore(), 0);
    assert.equal(scope.KotobaStorage.writeBestScore(100), false);
    const noStorage = loadStorage(undefined);
    assert.equal(noStorage.KotobaStorage.readBestScore(), 0);
    assert.equal(noStorage.KotobaStorage.writeBestScore(100), false);
});

test('保存領域の取得自体が拒否されても実バンドルは起動し、その場の最高得点を更新する', () => {
    const scope = {
        document: { createElement: () => ({ relList: { supports: () => true } }), addEventListener() {} },
        dispatchEvent() {},
        CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
    };
    Object.defineProperty(scope, 'localStorage', { get() { throw new Error('SecurityError'); } });
    const getter = Object.getOwnPropertyDescriptor(scope, 'localStorage').get;
    scope.window = scope;
    vm.createContext(scope);
    vm.runInContext(storageSource, scope);
    assert.doesNotThrow(() => vm.runInContext(bundle, scope));
    assert.equal(vm.runInContext('e.bestScore', scope), 0);
    assert.doesNotThrow(() => vm.runInContext('e.score = 500; l();', scope));
    assert.equal(vm.runInContext('e.bestScore', scope), 500);
    assert.equal(Object.getOwnPropertyDescriptor(scope, 'localStorage').get, getter, 'ブラウザ組み込みのgetterを書き換えない');
});

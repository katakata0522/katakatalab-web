const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(projectRoot, 'script.js');
const corePath = path.join(projectRoot, 'typing-core.js');
const packagePath = path.join(projectRoot, 'package.json');
const maintenancePath = path.join(projectRoot, 'MAINTENANCE.md');
const serviceWorkerPath = path.join(projectRoot, 'sw.js');

const {
    normalizeKanaToHiragana,
    hiraganaToRomaji,
    generateAllPatterns,
    sanitizeTypingInput,
    findMatchingPattern,
    getLastVowel,
    applyLongVowelToPatterns,
    splitSentenceToChunks,
    filterWordsByCharTraining,
    getSentenceBuckets,
    resolveSentenceBucketByScore,
    chooseWordFromPool,
    calcWpm,
    getRankLabel,
    normalizeStatsHistory,
    resolveRestoredRomajiPattern
} = require(corePath);

test('normalizeKanaToHiragana: カタカナをひらがなに正規化する', () => {
    assert.equal(normalizeKanaToHiragana('スーパー'), 'すーぱー');
    assert.equal(normalizeKanaToHiragana('デパート'), 'でぱーと');
});

test('hiraganaToRomaji: 長音を正しい母音で補完する', () => {
    assert.equal(hiraganaToRomaji('すーぱー'), 'suupaa');
    assert.equal(hiraganaToRomaji('でぱーと'), 'depaato');
});

test('generateAllPatterns: 長音語の有効パターンを含む', () => {
    const patterns = generateAllPatterns('たくしー');
    assert.ok(patterns.includes('takushii'));
    assert.ok(patterns.includes('takusii'));
});

test('findMatchingPattern: 入力中の有効パターンを特定できる', () => {
    const patterns = ['si', 'shi', 'ci'];
    assert.equal(findMatchingPattern('sh', patterns), 'shi');
    assert.equal(findMatchingPattern('c', patterns), 'ci');
    assert.equal(findMatchingPattern('zz', patterns), null);
});

test('sanitizeTypingInput: 英字以外を除去して小文字化する', () => {
    assert.equal(sanitizeTypingInput('Shi-Ft 12!'), 'shift');
});

test('getLastVowel: ローマ字末尾の母音を返す', () => {
    assert.equal(getLastVowel('takushi'), 'i');
    assert.equal(getLastVowel('sakura'), 'a');
    assert.equal(getLastVowel('rhythm'), '');
});

test('applyLongVowelToPatterns: 母音を繰り返して長音化する', () => {
    assert.deepEqual(applyLongVowelToPatterns(['su', 'depa']), ['suu', 'depaa']);
});

test('generateAllPatterns: 展開数が上限を超えない', () => {
    const hardWord = 'しゃ'.repeat(20);
    const patterns = generateAllPatterns(hardWord);
    assert.ok(patterns.length <= 4096);
    assert.ok(patterns.length > 0);
});

test('MAINTENANCE.md: typing_dojoテスト実行手順が更新されている', () => {
    const text = fs.readFileSync(maintenancePath, 'utf8');
    assert.match(text, /typing_dojo\/tests\/typing_dojo\.test\.cjs/);
});

test('script.js: ESMとCommonJSの二重エクスポートを持たない', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    assert.doesNotMatch(source, /module\.exports/);
    assert.match(source, /export\s*\{/);
});

test('純粋なタイピングロジックはUI入口から独立したモジュールに分離する', () => {
    assert.ok(fs.existsSync(corePath));
    assert.deepEqual(JSON.parse(fs.readFileSync(packagePath, 'utf8')), {
        private: true,
        type: 'module'
    });
    const scriptSource = fs.readFileSync(scriptPath, 'utf8');
    const coreSource = fs.readFileSync(corePath, 'utf8');
    const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, 'utf8');

    assert.match(scriptSource, /from '\.\/typing-core\.js'/);
    assert.doesNotMatch(scriptSource, /^const ROMAJI_MAP\s*=/m);
    assert.doesNotMatch(scriptSource, /^function generateAllPatterns\s*\(/m);
    assert.doesNotMatch(scriptSource, /^function splitSentenceToChunks\s*\(/m);
    assert.match(coreSource, /^function splitSentenceToChunks\s*\(/m);
    assert.match(serviceWorkerSource, /'\.\/typing-core\.js'/);
});

test('設定読み込みはlocalStorage拒否時も例外安全な読み込み経路を使う', () => {
    const scriptSource = fs.readFileSync(scriptPath, 'utf8');

    assert.doesNotMatch(scriptSource, /typeof localStorage/);
    assert.match(
        scriptSource,
        /const portalData = this\._readJSON\('wonder_school_profile_v2', null\);/
    );
});

test('splitSentenceToChunks: 文章を適切な長さで分割する', () => {
    const chunks = splitSentenceToChunks(['きょうはいいてんきです。こうえんであそびます。'], 4, 8);
    assert.ok(chunks.length >= 2);
    assert.ok(chunks.every((chunk) => chunk.length >= 4 && chunk.length <= 8));
});

test('filterWordsByCharTraining: 拗音と促音を抽出できる', () => {
    const words = ['きゃく', 'がっこう', 'りんご'];
    assert.deepEqual(filterWordsByCharTraining(words, 'youon'), ['きゃく']);
    assert.deepEqual(filterWordsByCharTraining(words, 'sokuon'), ['がっこう']);
});

test('getSentenceBuckets / resolveSentenceBucketByScore: スコアでバケットを切り替える', () => {
    const sentences = [
        'きょうはりかのじっけんをしました',
        'れきしのじゅぎょうでぶんかざいをまなびました'
    ];
    const buckets = getSentenceBuckets(sentences);
    assert.ok(Array.isArray(buckets.short));
    assert.ok(Array.isArray(buckets.medium));
    assert.ok(Array.isArray(buckets.full));
    assert.ok(resolveSentenceBucketByScore(0, buckets).length > 0);
    assert.equal(resolveSentenceBucketByScore(20, buckets), buckets.full);
});

test('chooseWordFromPool: 直近出題を避けて選択する', () => {
    const pool = ['あか', 'あお', 'きいろ'];
    const word = chooseWordFromPool(pool, ['あか', 'あお']);
    assert.equal(word, 'きいろ');
});

test('calcWpm: 文字数と秒数からWPMを算出する', () => {
    assert.equal(calcWpm(250, 60), 50);
    assert.equal(calcWpm(0, 60), 0);
});

test('getRankLabel: 連続日数に応じて段位を返す', () => {
    assert.equal(getRankLabel(0), '見習い');
    assert.equal(getRankLabel(7), '二段');
    assert.equal(getRankLabel(60), '師範');
});

test('normalizeStatsHistory: 壊れた保存履歴を除外して起動を継続できる', () => {
    const normalized = normalizeStatsHistory([
        null,
        'invalid',
        { wpm: 120, accuracy: 98, missRate: 2 }
    ], 10);
    assert.deepEqual(normalized, [{ wpm: 120, accuracy: 98, missRate: 2 }]);
});

test('resolveRestoredRomajiPattern: 保存値は現在の有効パターンだけを復元する', () => {
    const patterns = new Set(['shi', 'si']);
    assert.equal(resolveRestoredRomajiPattern('shi', patterns, 'si'), 'shi');
    assert.equal(
        resolveRestoredRomajiPattern('</span><img src=x onerror=alert(1)>', patterns, 'si'),
        'si'
    );
});

test('StorageManager.saveHighScore: 保存失敗時は新記録成功を返さない', async () => {
    const { StorageManager } = await import(pathToFileURL(scriptPath).href);
    const originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
        getItem() {
            return JSON.stringify({ easy: 10 });
        },
        setItem() {
            throw new Error('storage disabled');
        }
    };

    try {
        assert.equal(StorageManager.saveHighScore('easy', 20), false);
    } finally {
        if (originalLocalStorage === undefined) {
            delete globalThis.localStorage;
        } else {
            globalThis.localStorage = originalLocalStorage;
        }
    }
});

test('StorageManager.saveHighScore: 不正な難易度・点数は保存しない', async () => {
    const { StorageManager } = await import(pathToFileURL(scriptPath).href);
    let writeCount = 0;
    const originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
        getItem() {
            return '{}';
        },
        setItem() {
            writeCount += 1;
        }
    };

    try {
        assert.equal(StorageManager.saveHighScore('unknown', 100), false);
        assert.equal(StorageManager.saveHighScore('easy', Number.NaN), false);
        assert.equal(StorageManager.saveHighScore('easy', -1), false);
        assert.equal(writeCount, 0);
    } finally {
        if (originalLocalStorage === undefined) {
            delete globalThis.localStorage;
        } else {
            globalThis.localStorage = originalLocalStorage;
        }
    }
});

test('quitGame: 途中終了は完了処理を呼ばずスタート画面へ戻す', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    const quitStart = source.indexOf('function quitGame()');
    const nextFunction = source.indexOf('function nextWord()', quitStart);
    assert.ok(quitStart >= 0 && nextFunction > quitStart);

    const quitSource = source.slice(quitStart, nextFunction);
    assert.doesNotMatch(quitSource, /endGame\s*\(/);
    assert.match(quitSource, /clearSessionSnapshot\s*\(/);
    assert.match(quitSource, /showScreen\('start-screen'\)/);
});

test('sw.js: オフライン用Service Workerが存在する', () => {
    assert.ok(fs.existsSync(serviceWorkerPath));
    const text = fs.readFileSync(serviceWorkerPath, 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../../public/pwa-runtime.js'), 'utf8');
    assert.match(text, /self\.addEventListener\('install'/);
    assert.match(text, /self\.addEventListener\('fetch'/);
});

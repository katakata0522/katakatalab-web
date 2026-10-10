const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../typing-core.js');

const compact = (word) => core.buildPatternCache(word, { includePatterns: false });

function assertInput(word, input, accepted = true) {
    const { matcher } = compact(word);
    assert.equal(matcher.isComplete(input), accepted, `${word}: ${input}`);
    assert.equal(core.isCorrectInput(input, word, matcher), accepted, `${word}: 公開入力判定 ${input}`);
    if (!accepted) return;
    for (let i = 0; i <= input.length; i++) {
        const prefix = input.slice(0, i);
        assert.equal(matcher.hasPrefix(prefix), true, `${word}: 接頭辞 ${prefix}`);
        const candidate = matcher.findMatch(prefix);
        assert.ok(candidate.startsWith(prefix), `${word}: 補完 ${prefix}`);
        assert.equal(matcher.isComplete(candidate), true, `${word}: 補完候補 ${candidate}`);
    }
}

test('全マップの表記と各接頭辞をコンパクトな判定器でも受け付ける', () => {
    for (const [kana, variants] of Object.entries(core.ROMAJI_MAP)) {
        for (const variant of variants) assertInput(kana, variant);
    }
});

test('促音は直後に選んだ表記の子音と一致し、母音や撥音を重ねない', () => {
    for (const input of ['ssi', 'sshi', 'cci', 'xtushi', 'ltusi', 'ltsuci', 'xtsushi']) assertInput('っし', input);
    for (const input of ['sci', 'csi', 'cshi']) assertInput('っし', input, false);
    for (const input of ['xtua', 'ltua', 'ltsua', 'xtsua']) assertInput('っあ', input);
    assertInput('っあ', 'aa', false);
    assertInput('っん', 'nn', false);
    for (const input of ['tti', 'cchi', 'tchi', 'xtuchi']) assertInput('っち', input);
    for (const input of ['kkka', 'xtukka', 'kxtuka']) {
        // kxtuka は「k」の直後が「x」なので促音の表記にはならない。
        assertInput('っっか', input, input !== 'kxtuka');
    }
});

test('撥音は後続の実際の表記に応じて曖昧さを避ける', () => {
    for (const input of ['nna', 'nnna', 'xnna']) assertInput('んな', input);
    for (const input of ['konnitiha', 'konnnitiha', 'koxnnitiha']) assertInput('こんにちは', input);
    for (const input of ['nni', 'nnyi', 'xni', 'xnyi']) assertInput('んい', input);
    for (const input of ['ni', 'nyi']) assertInput('んい', input, false);
    for (const input of ['nnu', 'nnwu', 'xnu', 'xnwu', 'nwu']) assertInput('んう', input);
    assertInput('んう', 'nu', false);
    for (const input of ['nnya', 'xnnya', 'nnnya']) assertInput('んにゃ', input);
    assertInput('んや', 'nya', false);
    assertInput('んん', 'nn', false);
    assertInput('んん', 'nnn');
    assert.equal(core.hiraganaToRomaji('んう'), 'nnu');
});

test('小書きのかなを個別入力でき、促音との組み合わせも崩れない', () => {
    for (const input of ['kya', 'kixya', 'kilya']) assertInput('きゃ', input);
    for (const input of ['sha', 'sya', 'sixya', 'shixya', 'cilya']) assertInput('しゃ', input);
    for (const input of ['ssha', 'ssya', 'ssixya', 'sshilya', 'ccixya']) assertInput('っしゃ', input);
    assertInput('っしゃ', 'csha', false);
});

test('候補の列挙上限を超える長文でもすべての入力経路を受け付ける', () => {
    const word = 'しゃ'.repeat(20);
    const fullInput = 'sha'.repeat(20);
    const legacyPatterns = core.generateAllPatterns(word);
    assert.ok(legacyPatterns.length <= 4096);
    assert.equal(legacyPatterns.includes(fullInput), false);
    assertInput(word, fullInput);
    assertInput(word, 'sya'.repeat(10) + 'shixya'.repeat(10));
    assertInput(word, 'cilya'.repeat(20));
    assertInput(word, fullInput + 'z', false);
    const cache = compact(word);
    assert.equal(cache.patterns.length, 1);
    assert.equal(core.findMatchingPattern('sha'.repeat(19), cache.matcher).startsWith('sha'.repeat(19)), true);
    assert.equal(core.resolveRestoredRomajiPattern(fullInput, cache.matcher, cache.defaultPattern), fullInput);
});

test('大量の促音でも列挙数の上限と重複除去を守る', () => {
    const patterns = core.generateAllPatterns('っしゃ'.repeat(12));
    assert.ok(patterns.length > 0 && patterns.length <= 4096);
    assert.equal(new Set(patterns).size, patterns.length);
    assertInput('っしゃ'.repeat(12), 'ssha'.repeat(12));
});

test('かな・半角カタカナ・全角英字を安全なローマ字へ変換する', () => {
    assert.equal(core.normalizeKanaToHiragana('ｶﾞｯｺｳ'), 'がっこう');
    assert.equal(core.sanitizeTypingInput('ＳＨＩ１２!'), 'shi');
    assert.equal(core.sanitizeTypingInput('Shi-Ft 12!'), 'shift');
    for (const word of ['しんあい', 'こんにちは', 'がっこう', 'きゃく', 'スーパー', 'ｺﾝﾋﾟｭｰﾀｰ', 'タクシー']) {
        const input = core.sanitizeTypingInput(word);
        assert.equal(core.isCorrectInput(input, word), true, `${word}: 一括確定`);
        let incremental = '';
        for (const char of core.normalizeKanaToHiragana(word)) {
            incremental = core.sanitizeTypingInput(incremental + char);
            assert.equal(compact(word).matcher.hasPrefix(incremental), true, `${word}: ${incremental}`);
        }
        assert.equal(core.isCorrectInput(incremental, word), true, `${word}: 個別確定`);
    }
    assert.equal(core.sanitizeTypingInput('suーpaー'), 'suupaa');
});

test('空語・不正な型・未対応文字・過大な保存語で例外や空一致を起こさない', () => {
    for (const value of [null, undefined, [], {}, 12, '', '漢字', 'ー', 'あ'.repeat(1025)]) {
        assert.doesNotThrow(() => core.buildPatternCache(value));
        assert.equal(core.isCorrectInput('', value), false);
    }
    assert.deepEqual(core.sanitizeWordList([null, {}, 42, '', '漢字', 'か漢字', ' あ ', 'カタカナ']), ['あ', 'カタカナ']);
    assert.equal(core.hiraganaToRomaji('きょうは、いいてんき。'), 'kyouhaiitenki');
});

test('設定はデフォルトを補い、型・音量・ポータル値を検証する', () => {
    const defaults = core.normalizePreferences();
    assert.deepEqual(defaults, { focusMode: false, soundEnabled: true, soundVolume: 60, autoResume: true, showRomajiHint: true, keyboardType: 'kana' });
    assert.deepEqual(core.normalizePreferences([]), defaults);
    const raw = { focusMode: 'false', soundEnabled: false, soundVolume: -900, autoResume: 0, showRomajiHint: false, keyboardType: 'invalid' };
    const before = JSON.stringify(raw);
    assert.deepEqual(core.normalizePreferences(raw), { ...defaults, soundEnabled: false, soundVolume: 0, showRomajiHint: false });
    assert.equal(JSON.stringify(raw), before);
    assert.equal(core.normalizePreferences({ soundVolume: Infinity }).soundVolume, 60);
    assert.equal(core.normalizePreferences({ soundVolume: 200 }).soundVolume, 100);
    assert.equal(core.normalizePreferences({ keyboardType: 'romaji' }).keyboardType, 'romaji');
    assert.equal(core.normalizePreferences({}, { volumeDb: '-20' }).soundVolume, 50);
    assert.equal(core.normalizePreferences({}, { volumeDb: 'garbage', isMuted: 'false' }).soundEnabled, true);
    assert.equal(core.normalizePreferences({}, { volumeDb: -40 }).soundEnabled, false);
    assert.equal(core.normalizePreferences({}, { isMuted: true }).soundEnabled, false);
    assert.equal(core.normalizePreferences({}, { volumeDb: Infinity }).soundVolume, 60);
});

test('履歴は有限の統計だけを残し、上限ゼロ・割合・負数を正規化する', () => {
    const valid = { wpm: 120, accuracy: 98, missRate: 2 };
    const malformed = [null, [], {}, true, 'invalid', { wpm: 'Infinity', accuracy: 10, missRate: 2 }, { wpm: [], accuracy: 5, missRate: 6 }];
    assert.deepEqual(core.normalizeStatsHistory([...malformed, valid], 10), [valid]);
    assert.deepEqual(core.normalizeStatsHistory([valid], 0), []);
    assert.deepEqual(core.normalizeStatsHistory([valid], -1), []);
    assert.deepEqual(core.normalizeStatsHistory([valid], Infinity), []);
    assert.deepEqual(core.normalizeStatsHistory([valid, { wpm: '12.9', accuracy: '999', missRate: -10, score: -100, miss: '2.8' }], 1), [{ wpm: 12, accuracy: 100, missRate: 0, score: 0, miss: 2 }]);
    assert.equal(core.calcWpm(Infinity, 1), 0);
    assert.ok(Number.isFinite(core.calcWpm(Number.MAX_VALUE, 1)));
});

test('不正なチャンク幅や保存バケットでも無限ループ・不正な型を返さない', () => {
    assert.deepEqual(core.splitSentenceToChunks(['あいうえお'], 1, 0), ['あ', 'い', 'う', 'え', 'お']);
    assert.deepEqual(core.splitSentenceToChunks([{}, null, 'あいうえお'], 1, -5), ['あ', 'い', 'う', 'え', 'お']);
    assert.deepEqual(core.resolveSentenceBucketByScore(1, { short: 'bad' }), []);
    assert.equal(core.chooseWordFromPool([{}, null, 1, 'あ']), 'あ');
});

test('共有の出題データは既定ヒント・一括かな確定・一文字ずつのかな確定で完走できる', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const vm = require('node:vm');
    const source = fs.readFileSync(path.join(__dirname, '../../data/idioms.js'), 'utf8');
    const database = vm.runInNewContext(source + ';IDIOMS_DB');
    const words = Object.values(database).filter(Array.isArray).flat()
        .map((entry) => entry?.hiragana).filter((word) => typeof word === 'string');
    assert.ok(words.length > 0);
    for (const word of words) {
        const cache = compact(word);
        assert.ok(cache.defaultPattern, `${word}: ヒント`);
        assert.equal(cache.matcher.isComplete(cache.defaultPattern), true, `${word}: ヒントの完走`);
        assert.equal(cache.matcher.isComplete(core.hiraganaToRomaji(word)), true, `${word}: 通常表記`);
        assert.equal(cache.matcher.isComplete(core.sanitizeTypingInput(word)), true, `${word}: 一括確定`);
        let input = '';
        for (const char of core.normalizeKanaToHiragana(word)) {
            input = core.sanitizeTypingInput(input + char);
            assert.equal(cache.matcher.hasPrefix(input), true, `${word}: ${input}`);
        }
        assert.equal(cache.matcher.isComplete(input), true, `${word}: 個別確定`);
    }
});

test('起動時のヒントは従来の安全な既定表記を保つ', () => {
    assert.equal(compact('がっこう').defaultPattern, 'gaxtukou');
    assert.equal(compact('こんにちは').defaultPattern, 'konnnitiha');
    assert.equal(compact('しんぶん').defaultPattern, 'sinbun');
    assert.equal(compact('すーぱー').defaultPattern, 'suupaa');
});

test('固定シードの複合語で列挙候補・全接頭辞・通常表記の判定が一致する', () => {
    let seed = 123456789;
    const random = () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 2 ** 32;
    };
    const tokens = ['あ', 'い', 'う', 'し', 'ち', 'ん', 'っ', 'きゃ', 'しゃ', 'りょ', 'ー'];
    for (let n = 0; n < 1000; n++) {
        let word = '';
        for (let i = 0; i < 1 + Math.floor(random() * 5); i++) word += tokens[Math.floor(random() * tokens.length)];
        const cache = core.buildPatternCache(word);
        for (const pattern of cache.patterns) {
            assert.equal(cache.matcher.isComplete(pattern), true, `${word}: ${pattern}`);
            for (let i = 0; i <= pattern.length; i++) {
                assert.equal(cache.matcher.hasPrefix(pattern.slice(0, i)), true, `${word}: ${pattern.slice(0, i)}`);
            }
        }
        if (cache.defaultPattern) assert.equal(cache.matcher.isComplete(core.hiraganaToRomaji(word)), true, word);
    }
});

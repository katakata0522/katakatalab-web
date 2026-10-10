const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const {
    extractBlankInfo,
    sanitizeFillinInput,
    KOTOWAZA_BLANKS
} = require(path.join(projectRoot, 'kotowaza_quiz', 'script.js'));

test('sanitizeFillinInput: ひらがなに正規化し空白を除去する', () => {
    assert.equal(sanitizeFillinInput(' ぼうに あたる '), 'ぼうにあたる');
    assert.equal(sanitizeFillinInput('ボウニアタル'), 'ぼうにあたる');
    assert.equal(sanitizeFillinInput(null), '');
});

test('extractBlankInfo: 辞書登録のあることわざを正しく穴埋めする', () => {
    const item = {
        hiragana: 'いぬもあるけばぼうにあたる',
        kanji: '犬も歩けば棒に当たる',
        type: 'kotowaza'
    };
    const info = extractBlankInfo(item);
    assert.equal(info.displayText, '犬も歩けば【　　】');
    assert.equal(info.answer, 'ぼうにあたる');
});

test('extractBlankInfo: 辞書登録のない四字熟語（後半2文字穴）', () => {
    const item = {
        hiragana: 'いっせきにちょう',
        kanji: '一石二鳥',
        type: 'yojijukugo'
    };
    const info = extractBlankInfo(item);
    assert.equal(info.displayText, '一石【　　】');
    assert.equal(info.answer, 'にちょう');
});

test('extractBlankInfo: 一般フォールバック（文字数ズレの防止）', () => {
    const item = {
        hiragana: 'てすとすることわざ',
        kanji: 'テスト諺',
        type: 'kotowaza'
    };
    const info = extractBlankInfo(item);
    assert.ok(info.displayText.includes('【　　】'));
    assert.notEqual(info.displayText, 'テスト諺');
});

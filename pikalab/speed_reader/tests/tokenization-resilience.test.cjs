const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = ['constants.js', 'app.js']
    .map(file => fs.readFileSync(path.join(root, 'js', file), 'utf8')).join('\n');

function createReader(intl = Intl) {
    const context = vm.createContext({ Intl: intl, console: { warn() {} } });
    vm.runInContext(source + '\nglobalThis.Reader = SpeedReaderApp; globalThis.books = libraries; globalThis.parseRuby = splitRubyParts;', context);
    const app = Object.create(context.Reader.prototype);
    app.state = {};
    return { app, context, books: context.books };
}

function visible(text) {
    return text.replace(/\{[^{}]*\}/g, '');
}

function compact(text) {
    return text.replace(/\s/g, '');
}

function readings(text) {
    return Array.from(text.matchAll(/\{([^{}]*)\}/g), match => match[1]);
}

const modes = {
    native: Intl,
    unavailable: {},
    constructorFailure: { Segmenter: class { constructor() { throw new Error('unavailable'); } } },
    iterationFailure: { Segmenter: class { segment() { throw new Error('cannot segment'); } } },
    partialIterationFailure: { Segmenter: class { *segment(text) { yield { segment: text.slice(0, 1) }; throw new Error('interrupted'); } } }
};

for (const [name, intl] of Object.entries(modes)) {
    test(`全作品の本文・ルビ・語数を1〜3語表示で保持する: ${name}`, () => {
        const { app, books, context } = createReader(intl);
        for (const [key, book] of Object.entries(books)) {
            const single = app.processText(book.text, 1);
            const wordCount = app.state.totalWordCount;
            assert.ok(wordCount > 0, key);
            for (const chunk of single) {
                // 次の文の先頭を前の文末へ取り込まない。自然な単語数そのものは固定しない。
                assert.doesNotMatch(visible(chunk), /[。！？!?].*[\p{Letter}\p{Number}]/u, `${key}: ${chunk}`);
            }
            for (const size of [1, 2, 3]) {
                const chunks = app.processText(book.text, size);
                assert.equal(compact(chunks.join('')), compact(book.text), `${key}: 本文とルビ表記を保存`);
                assert.equal(compact(chunks.map(visible).join('')), compact(visible(book.text)), `${key}: 表示本文を保存`);
                assert.deepEqual(readings(chunks.join('')), readings(book.text), `${key}: ルビの順序と回数を保存`);
                assert.equal(app.state.totalWordCount, wordCount, `${key}: 語数は表示サイズで変わらない`);
                assert.equal(chunks.length, Math.ceil(wordCount / size), key);
                assert.ok(chunks.every(chunk => !chunk.includes('__SR_RUBY_TEMP_')), key);
                assert.deepEqual(Array.from(app.state.chunkDisplayData).flatMap(chunk => Array.from(chunk.parts)).filter(part => part.ruby).map(part => [part.base, part.ruby]),
                    Array.from(context.parseRuby(book.text)).filter(part => part.ruby).map(part => [part.base, part.ruby]), `${key}: 描画用のルビ基底を保存`);
                app.state.chunkDisplayData.forEach((chunk, index) => {
                    assert.equal(chunk.text, chunks[index]);
                    assert.equal(chunk.parts.map(part => part.text).join(''), chunks[index]);
                });
            }
        }
    });
}

test('文頭・前の文・助詞をルビ基底へ取り込まない', () => {
    const { app, context } = createReader();
    const text = '先に読みます。学校{がっこう}に行きます。';
    const chunks = app.processText(text, 1);
    assert.ok(chunks.length > 2);
    assert.ok(chunks.some(chunk => chunk.startsWith('学校{がっこう}')));
    assert.deepEqual(Array.from(context.parseRuby(text)).filter(part => part.ruby).map(part => part.base), ['学校']);
    assert.deepEqual(Array.from(context.parseRuby('お母{かあ}さん狐{きつね}はシラクス{しらくす}へ')).filter(part => part.ruby).map(part => part.base), ['母', '狐', 'シラクス']);
});

test('連続ルビ、漢字だけの入力、英単語、絵文字のルビを失わない', () => {
    for (const intl of Object.values(modes)) {
        const { app, context } = createReader(intl);
        const text = '漢字{かんじ}読書{どくしょ} word{reading} 😀{えがお}';
        assert.deepEqual(Array.from(context.parseRuby(text)).filter(part => part.ruby).map(part => part.base), ['漢字', '読書', 'word', '😀']);
        const chunks = app.processText(text, 1);
        assert.equal(compact(chunks.join('')), compact(text));
        assert.ok(chunks.length >= 4);
    }
});

test('同じ本文の再チャンク化はキャッシュを使用し、本文変更時は再分割する', () => {
    let calls = 0;
    class CountingSegmenter {
        constructor(locale, options) { this.delegate = new Intl.Segmenter(locale, options); }
        segment(text) { calls += 1; return this.delegate.segment(text); }
    }
    const { app } = createReader({ Segmenter: CountingSegmenter });
    const text = '私は学校{がっこう}へ行きます。';
    const first = app.processText(text, 1);
    const firstCalls = calls;
    const originalCount = app.state.totalWordCount;
    assert.ok(firstCalls > 0);
    app.processText(text, 3);
    assert.equal(calls, firstCalls);
    assert.equal(app.state.totalWordCount, originalCount);
    app.processText('別の文章を読みます。', 1);
    assert.ok(calls > firstCalls);
    assert.equal(app.processText(text, 1).join(''), first.join(''));
});

function createElement(tagName) {
    return {
        tagName, children: [], className: '', value: '',
        set textContent(value) { this.value = String(value); this.children = []; },
        get textContent() { return this.value + this.children.map(child => child.textContent).join(''); },
        appendChild(child) { this.children.push(child); return child; }
    };
}

test('描画も同じルビ境界を使い、本文と絵文字をそのまま表示する', () => {
    for (const intl of [Intl, {}]) {
        const { app, context } = createReader(intl);
        context.document = {
            createElement,
            createTextNode(text) { return { tagName: '#text', textContent: text }; }
        };
        const display = createElement('div');
        app.els = { readerDisplay: display };
        app.renderWord('先に読みます。学校{がっこう}へ、お母{かあ}さん狐{きつね}と😀{えがお}');
        const rubies = display.children.filter(element => element.tagName === 'ruby');
        assert.deepEqual(rubies.map(ruby => ruby.children.filter(child => child.tagName !== 'rt').map(child => child.textContent).join('')), ['学校', '母', '狐', '😀']);
        assert.deepEqual(rubies.map(ruby => ruby.children.find(child => child.tagName === 'rt').textContent), ['がっこう', 'かあ', 'きつね', 'えがお']);
        const plain = display.children.map(element => element.tagName === 'ruby'
            ? element.children.filter(child => child.tagName !== 'rt').map(child => child.textContent).join('')
            : element.textContent).join('');
        assert.equal(plain, '先に読みます。学校へ、お母さん狐と😀');
    }
});

test('文末と閉じかっこの後のひらがなを前の文へ結合しない', () => {
    const { normalizeJapaneseSegments } = require('../js/app.js');
    assert.deepEqual(normalizeJapaneseSegments(['読みました', '。', 'お', '母']), ['読みました。', 'お', '母']);
    assert.deepEqual(normalizeJapaneseSegments(['「そう', '。', '」', 'で', 'も']), ['「そう。」', 'でも']);
});

test('読みに含まれる接頭辞だけをルビ基底へ含める', () => {
    const { context } = createReader();
    const parts = Array.from(context.parseRuby('お正月{おしょうがつ}にお話{はなし}をお母{かあ}さんと'));
    assert.deepEqual(parts.filter(part => part.ruby).map(part => part.base), ['お正月', '話', '母']);
});

test('国旗のルビを不可分の基底として描画する', () => {
    for (const intl of [Intl, {}]) {
        const { app, context } = createReader(intl);
        context.document = { createElement, createTextNode: text => ({ tagName: '#text', textContent: text }) };
        const display = createElement('div');
        app.els = { readerDisplay: display };
        app.renderWord('🇯🇵{にほん}');
        const ruby = display.children.find(element => element.tagName === 'ruby');
        assert.ok(ruby);
        assert.equal(ruby.children.filter(child => child.tagName !== 'rt').map(child => child.textContent).join(''), '🇯🇵');
        assert.equal(ruby.children.find(child => child.tagName === 'rt').textContent, 'にほん');
    }
});

test('同じ結合文字列でも元の語のルビ基底を区別し、再チャンク化後も保持する', () => {
    for (const intl of [Intl, {}]) {
        const { app, context } = createReader(intl);
        context.document = { createElement, createTextNode: text => ({ tagName: '#text', textContent: text }) };
        const display = createElement('div');
        app.els = { readerDisplay: display };
        let compactChunk;
        for (const [text, expectedBase] of [['山 川{かわ}', '川'], ['山川{かわ}', '山川'], ['山 川{かわ}', '川']]) {
            for (const size of [1, 2, 3]) {
                app.state.words = app.processText(text, size);
                app.state.index = app.state.words.findIndex(word => word.includes('{'));
                const word = app.state.words[app.state.index];
                app.renderWord(word);
                const ruby = display.children.find(element => element.tagName === 'ruby');
                assert.equal(ruby.children.filter(child => child.tagName !== 'rt').map(child => child.textContent).join(''), expectedBase);
                assert.equal(app.state.chunkDisplayData[app.state.index].parts.map(part => part.text).join(''), word);
                if (size === 2) {
                    if (compactChunk) assert.equal(word, compactChunk);
                    compactChunk = word;
                }
            }
        }
    }
});

test('分割・ルビ解析のキャッシュは再チャンク化と準備済み表示で再利用される', () => {
    const { app, context } = createReader();
    vm.runInContext('const savedParser = splitRubyParts; globalThis.parserCalls = 0; splitRubyParts = (...args) => { parserCalls++; return savedParser(...args); };', context);
    context.document = { createElement, createTextNode: text => ({ tagName: '#text', textContent: text }) };
    app.els = { readerDisplay: createElement('div') };
    const text = '山 川{かわ}を見ます。';
    app.state.words = app.processText(text, 1);
    const calls = context.parserCalls;
    assert.ok(calls > 0);
    for (const size of [2, 3, 1]) {
        app.state.words = app.processText(text, size);
        app.state.index = app.state.words.findIndex(word => word.includes('{'));
        app.renderWord(app.state.words[app.state.index]);
        assert.equal(context.parserCalls, calls);
    }
    app.renderWord('別の学校{がっこう}');
    assert.ok(context.parserCalls > calls, '準備した文字列以外は直接解析する');
});

test('長い混在文字列でも末尾からの文字判定回数は入力長に比例する', () => {
    const { context } = createReader();
    vm.runInContext('const savedTest = RegExp.prototype.test; globalThis.characterChecks = 0; RegExp.prototype.test = function (...args) { characterChecks++; return savedTest.apply(this, args); };', context);
    const text = '漢'.repeat(50000) + 'word{word} ' + 'あ'.repeat(50000) + '字{じ} ' + '😀\u200D'.repeat(10000) + '😀😀{えがお}';
    const parts = Array.from(context.parseRuby(text));
    assert.equal(parts.map(part => part.text).join(''), text);
    assert.deepEqual(parts.filter(part => part.ruby).map(part => part.base), ['word', '字', '😀']);
    assert.ok(context.characterChecks < text.length * 3, '後方走査で同じ長い候補を繰り返し検査しない');
});

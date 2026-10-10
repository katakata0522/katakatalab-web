'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { getHtmlInputs } = require('./html-build-inputs.cjs');
const { writeGeneratedText } = require('./write-generated-text.cjs');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-internals-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}

function write(root, name, content = '') {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
}

test('HTML入力は現行の対象・キー・順序を保ち、通常ファイルを再statしない', (t) => {
    const root = fixture(t);
    for (const file of ['index.html', 'sub/index.html', 'sub/deep/page.html', '日本語/ページ.html', 'assets/app.js',
        'UPPER.HTML', '.hidden/a.html', 'node_modules/pkg/a.html', 'sub/dist/b.html']) write(root, file);
    t.mock.method(fs, 'statSync', () => { throw new Error('通常ファイルの追加statは不要'); });
    assert.deepEqual(getHtmlInputs(root), {
        index: path.join(root, 'index.html'),
        sub_deep_page: path.join(root, 'sub/deep/page.html'),
        sub_index: path.join(root, 'sub/index.html'),
        '日本語_ページ': path.join(root, '日本語/ページ.html'),
    });
});

test('HTML入力のリンクと破損リンクは従来どおり扱う', (t) => {
    const root = fixture(t);
    write(root, 'original/index.html');
    try {
        fs.symlinkSync('original', path.join(root, 'alias'), 'dir');
    } catch (error) {
        if (error.code === 'EPERM') return t.skip('この環境はリンク作成権限がない');
        throw error;
    }
    assert.equal(getHtmlInputs(root).alias_index, path.join(root, 'alias/index.html'));
    fs.symlinkSync('missing', path.join(root, 'broken.html'));
    assert.throws(() => getHtmlInputs(root), { code: 'ENOENT' });
});

test('空の入力ディレクトリは空の一覧を返し、欠損ディレクトリは失敗する', (t) => {
    const root = fixture(t);
    assert.deepEqual(getHtmlInputs(root), {});
    assert.throws(() => getHtmlInputs(path.join(root, 'missing')), { code: 'ENOENT' });
});

test('生成テキストは新規・変更時だけ書き込み、同一内容ならmtimeも保持する', (t) => {
    const root = fixture(t);
    const file = path.join(root, 'generated.css');
    assert.equal(writeGeneratedText(file, ''), true);
    assert.equal(writeGeneratedText(file, '日本語\r\n'), true);
    const oldDate = new Date('2000-01-01T00:00:00Z');
    fs.utimesSync(file, oldDate, oldDate);
    assert.equal(writeGeneratedText(file, '日本語\r\n'), false);
    assert.equal(fs.statSync(file).mtimeMs, oldDate.getTime());
    fs.unlinkSync(file);
    assert.equal(writeGeneratedText(file, '日本語\r\n'), true);
    assert.equal(fs.readFileSync(file, 'utf8'), '日本語\r\n');
});

test('既読の生成元は再readせず、内容が変わった場合のwriteは残す', (t) => {
    const root = fixture(t);
    const file = write(root, 'generated.xml', 'old');
    t.mock.method(fs, 'readFileSync', () => { throw new Error('再読み込みしない'); });
    assert.equal(writeGeneratedText(file, 'old', 'old'), false);
    assert.equal(writeGeneratedText(file, 'new', 'old'), true);
});

test('生成テキストの権限エラーは欠損と取り違えない', (t) => {
    const root = fixture(t);
    const error = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    t.mock.method(fs, 'readFileSync', () => { throw error; });
    assert.throws(() => writeGeneratedText(path.join(root, 'file'), 'new'), { code: 'EACCES' });
});

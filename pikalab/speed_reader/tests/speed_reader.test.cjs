const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const appPath = path.join(projectRoot, 'js', 'app.js');
const constantsPath = path.join(projectRoot, 'js', 'constants.js');
const htmlPath = path.join(projectRoot, 'index.html');
const stylePath = path.join(projectRoot, 'style.css');

const {
    clampWpmValue,
    shouldInsertSpaceBetweenSegments,
    joinChunkSegments,
    createChunksFromSegments,
    normalizeJapaneseSegments
} = require(appPath);

test('clampWpmValue: WPM値を範囲内へ安全にクランプする', () => {
    const config = { MIN: 50, MAX: 1000, DEFAULT: 250 };
    assert.equal(clampWpmValue('abc', config), 250);
    assert.equal(clampWpmValue(-10, config), 50);
    assert.equal(clampWpmValue(9999, config), 1000);
    assert.equal(clampWpmValue(333.7, config), 333);
});

test('shouldInsertSpaceBetweenSegments: 英数字境界のみスペースを挿入する', () => {
    assert.equal(shouldInsertSpaceBetweenSegments('This', 'is'), true);
    assert.equal(shouldInsertSpaceBetweenSegments('テスト', 'です'), false);
    assert.equal(shouldInsertSpaceBetweenSegments('word,', 'next'), false);
    assert.equal(shouldInsertSpaceBetweenSegments('テスト', 'sample'), true);
});

test('joinChunkSegments: 混在テキストの結合で単語間スペースを保持する', () => {
    assert.equal(joinChunkSegments(['This', 'is']), 'This is');
    assert.equal(joinChunkSegments(['テスト', 'です']), 'テストです');
    assert.equal(joinChunkSegments(['テスト', 'sample']), 'テスト sample');
});

test('createChunksFromSegments: 混在テキストを壊さずチャンク化する', () => {
    const chunks = createChunksFromSegments(['This', 'is', 'テスト', 'sample'], 2);
    assert.deepEqual(chunks, ['This is', 'テスト sample']);
});

test('normalizeJapaneseSegments: 助詞・句読点・終端を前に結合する', () => {
    const normalized = normalizeJapaneseSegments(['私', 'は', '学校', 'へ', '行き', 'ます', '。']);
    assert.deepEqual(normalized, ['私は', '学校へ', '行きます。']);
});

test('normalizeJapaneseSegments: かぎかっこと助詞を自然な単位に寄せる', () => {
    const normalized = normalizeJapaneseSegments(['「', '速読', '」', 'を', '学ぶ']);
    assert.deepEqual(normalized, ['「速読」を', '学ぶ']);
});

test('constants.js: WPM設定にMIN/MAX/STEPがある', () => {
    const source = fs.readFileSync(constantsPath, 'utf8');
    assert.match(source, /MIN:\s*50/);
    assert.match(source, /MAX:\s*1000/);
    assert.match(source, /STEP:\s*10/);
});

test('index.html: すべてのbuttonにtype=\"button\"が指定されている', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const buttonTags = html.match(/<button\b[^>]*>/g) || [];
    assert.ok(buttonTags.length > 0);
    buttonTags.forEach((tag) => {
        assert.match(tag, /type=\"button\"/);
    });
});

test('index.html: タブにロービングtabindexが設定されている', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, /id=\"tab-library\"[\s\S]*tabindex=\"0\"/);
    assert.match(html, /id=\"tab-input\"[\s\S]*tabindex=\"-1\"/);
    assert.match(html, /id=\"tab-settings\"[\s\S]*tabindex=\"-1\"/);
});

test('index.html: 学年カテゴリのtab/tabpanel関連付けが設定されている', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, /id=\"cat-btn-junior\"[\s\S]*aria-controls=\"lib-cat-junior\"/);
    assert.match(html, /id=\"lib-cat-junior\"[\s\S]*aria-labelledby=\"cat-btn-junior\"/);
});

test('index.html: 非表示タブパネルにhidden属性が設定されている', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, /id=\"content-input\"[\s\S]*hidden/);
    assert.match(html, /id=\"content-settings\"[\s\S]*hidden/);
    assert.match(html, /id=\"lib-cat-low-elem\"[\s\S]*hidden/);
});

test('index.html: モーダル起動ボタンに対話属性が設定されている', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, /id=\"parents-modal-open-btn\"[\s\S]*aria-haspopup=\"dialog\"/);
    assert.match(html, /id=\"parents-modal-open-btn\"[\s\S]*aria-expanded=\"false\"/);
});

test('index.html: インラインonclick属性を使用していない', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(!html.includes('onclick='));
});

test('style.css: キーボードフォーカスとline-clampの補強が存在する', () => {
    const css = fs.readFileSync(stylePath, 'utf8');
    assert.match(css, /textarea:focus-visible/);
    assert.match(css, /\.line-clamp-2/);
    assert.match(css, /prefers-reduced-motion/);
});

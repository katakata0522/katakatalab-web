const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
    pikalabUrlToHtmlPath,
    verifyBuildOutput
} = require('../scripts/verify-build-output.cjs');

function makeBuildFixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-build-'));
    fs.mkdirSync(path.join(root, 'focus_studio'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(root, 'manifest.webmanifest'), '{}');
    fs.writeFileSync(path.join(root, 'assets', 'favicon.png'), 'image');
    fs.writeFileSync(path.join(root, 'index.html'), '<link rel="manifest" href="./manifest.webmanifest">');
    fs.writeFileSync(path.join(root, 'focus_studio', 'index.html'), '<link rel="icon" href="../assets/favicon.png">');
    return root;
}

test('ビルド後のルートmanifestとローカルアイコン参照を検証する', () => {
    const result = verifyBuildOutput(makeBuildFixture());
    assert.equal(result.htmlFiles, 2);
});

test('必須ページと配信ファイルが不足している場合は失敗する', () => {
    const root = makeBuildFixture();
    assert.throws(
        () => verifyBuildOutput(root, {
            requiredHtmlPaths: ['code-studio/index.html'],
            requiredFilePaths: ['.htaccess']
        }),
        /必須ページ|必須配信ファイル/
    );
});

test('公開URLはbuild内HTMLパスへ安定して変換できる', () => {
    assert.equal(pikalabUrlToHtmlPath('https://katakatalab.com/pikalab/'), 'index.html');
    assert.equal(pikalabUrlToHtmlPath('https://katakatalab.com/pikalab/articles/'), 'articles/index.html');
    assert.equal(pikalabUrlToHtmlPath('/pikalab/articles/example.html'), 'articles/example.html');
    assert.equal(pikalabUrlToHtmlPath('https://example.com/pikalab/'), null);
});

test('本番build検証は公開HTMLの固定総数に依存しない', () => {
    const verifier = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'verify-build-output.cjs'), 'utf8');
    assert.doesNotMatch(verifier, /expectedHtmlFiles:\s*52/);
    assert.match(verifier, /requiredPublicHtmlPathsFromSource/);
});

test('深い階層へmanifestが再挿入された場合は失敗する', () => {
    const root = makeBuildFixture();
    fs.appendFileSync(path.join(root, 'focus_studio', 'index.html'), '<link rel="manifest" href="../manifest.webmanifest">');
    assert.throws(() => verifyBuildOutput(root), /ルート以外のmanifest/);
});

test('存在しないローカルアイコン参照は失敗する', () => {
    const root = makeBuildFixture();
    fs.writeFileSync(path.join(root, 'focus_studio', 'index.html'), '<link rel="icon" href="missing.png">');
    assert.throws(() => verifyBuildOutput(root), /参照先がありません/);
});

test('存在しないローカルJavaScript参照は失敗する', () => {
    const root = makeBuildFixture();
    fs.appendFileSync(path.join(root, 'index.html'), '<script src="./missing.js"></script>');
    assert.throws(() => verifyBuildOutput(root), /missing\.js/);
});

test('存在しないローカルCSS参照は失敗する', () => {
    const root = makeBuildFixture();
    fs.appendFileSync(path.join(root, 'index.html'), '<link rel="stylesheet" href="./missing.css">');
    assert.throws(() => verifyBuildOutput(root), /missing\.css/);
});

test('存在しないローカル画像参照は失敗する', () => {
    const root = makeBuildFixture();
    fs.appendFileSync(path.join(root, 'index.html'), '<img src="./missing.png" alt="">');
    assert.throws(() => verifyBuildOutput(root), /missing\.png/);
});

test('ビルドルート外へ抜ける参照は、参照先が存在しても拒否する', () => {
    const root = makeBuildFixture();
    const outsideName = `${path.basename(root)}-outside.js`;
    fs.writeFileSync(path.join(root, '..', outsideName), 'console.log("outside")');
    fs.appendFileSync(path.join(root, 'index.html'), `<script src="../${outsideName}"></script>`);
    assert.throws(() => verifyBuildOutput(root), /ビルドルート外/);
});

test('Tone.jsがライセンス参照を持つ場合は対応する表示ファイルを必須にする', () => {
    const root = makeBuildFixture();
    fs.writeFileSync(
        path.join(root, 'assets', 'tone-14.8.49.js'),
        '/*! For license information please see Tone.js.LICENSE.txt */\nconsole.log("tone");'
    );

    assert.throws(() => verifyBuildOutput(root), /Tone\.js\.LICENSE\.txt が配布物にありません/);
});

test('Tone.jsと対応ライセンスが同梱されていれば検証に成功する', () => {
    const root = makeBuildFixture();
    fs.writeFileSync(
        path.join(root, 'assets', 'tone-14.8.49.js'),
        '/*! For license information please see Tone.js.LICENSE.txt */\nconsole.log("tone");'
    );
    fs.writeFileSync(
        path.join(root, 'assets', 'Tone.js.LICENSE.txt'),
        'MIT License\nCopyright (c) 2014-2025 Yotam Mann\n'
    );

    const result = verifyBuildOutput(root);
    assert.equal(result.htmlFiles, 2);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const articlesRoot = __dirname;
const preferencesPath = path.join(articlesRoot, 'preferences.js');

test('記事設定はlocalStorageが拒否されても読み書きを継続する', () => {
    const source = fs.readFileSync(preferencesPath, 'utf8');
    const warnings = [];
    const context = {
        console: {
            warn(message) {
                warnings.push(String(message));
            }
        },
        localStorage: {
            getItem() {
                throw new DOMException('blocked', 'SecurityError');
            },
            setItem() {
                throw new DOMException('blocked', 'SecurityError');
            }
        },
        DOMException
    };
    context.window = context;

    vm.runInNewContext(source, context, { filename: 'preferences.js' });

    assert.equal(context.PikaLabArticlePreferences.get('pikalab-dark-mode'), null);
    assert.equal(context.PikaLabArticlePreferences.set('pikalab-dark-mode', true), false);
    assert.equal(warnings.length, 2);
});

test('全記事ページは例外安全な設定ヘルパーを使う', () => {
    const htmlFiles = fs.readdirSync(articlesRoot)
        .filter((name) => name.endsWith('.html'))
        .sort();

    assert.ok(htmlFiles.length >= 11);
    for (const fileName of htmlFiles) {
        const html = fs.readFileSync(path.join(articlesRoot, fileName), 'utf8');
        assert.match(html, /<script src="\.\/preferences\.js"><\/script>/, `${fileName}: 設定ヘルパーを読み込む`);
        assert.match(html, /<script src="\.\/article-common\.js" defer><\/script>/, `${fileName}: 共通UIスクリプトを読み込む`);
        assert.match(html, /<link rel="stylesheet" href="\.\/tailwind\.generated\.css">/, `${fileName}: Tailwind CSSを読み込む`);
        assert.doesNotMatch(
            html,
            /localStorage\.(?:getItem|setItem)\('pikalab-(?:dark-mode|large-text)'/,
            `${fileName}: 設定値をlocalStorageへ直接読み書きしない`
        );
        const spanOpenCount = (html.match(/<span\b/g) || []).length;
        const spanCloseCount = (html.match(/<\/span>/g) || []).length;
        assert.equal(spanCloseCount, spanOpenCount, `${fileName}: spanの開始・終了タグを対応させる`);
        assert.doesNotMatch(html, /`/, `${fileName}: Markdownのバッククォートを本文へ露出させない`);
        assert.doesNotMatch(
            html,
            /小学1年の段階で読書習慣を身につけている子どもは、その後の学年でも/,
            `${fileName}: 縦断調査の追跡時点を取り違えない`
        );
        const referenceHeadingCount = (html.match(/<h3>参考にした研究・資料<\/h3>/g) || []).length;
        if (fileName !== 'index.html') {
            assert.equal(referenceHeadingCount, 1, `${fileName}: 参考文献欄を重複させない`);
        }
    }
});

test('article-common.js は構文的に正しく実行可能である', () => {
    const commonJsPath = path.join(articlesRoot, 'article-common.js');
    assert.ok(fs.existsSync(commonJsPath), 'article-common.jsが存在する');
    const source = fs.readFileSync(commonJsPath, 'utf8');
    assert.doesNotThrow(() => {
        new vm.Script(source);
    }, 'article-common.jsの構文が正常である');
});

test('hub.js は構文的に正しく、記事一覧に必要な要素をindex.htmlが備える', () => {
    const hubJsPath = path.join(articlesRoot, 'hub.js');
    assert.ok(fs.existsSync(hubJsPath), 'hub.jsが存在する');
    const source = fs.readFileSync(hubJsPath, 'utf8');
    assert.doesNotThrow(() => {
        new vm.Script(source);
    }, 'hub.jsの構文が正常である');

    const indexHtml = fs.readFileSync(path.join(articlesRoot, 'index.html'), 'utf8');
    assert.match(indexHtml, /<script src="\.\/hub\.js" defer><\/script>/, 'index.html: hub.jsを読み込む');
    assert.match(indexHtml, /id="load-more-btn"/, 'index.html: もっと見るボタンを持つ');
    assert.match(indexHtml, /id="no-results-state"/, 'index.html: 検索空状態要素を持つ');
    assert.match(indexHtml, /class="[^"]*article-search-input[^"]*"/, 'index.html: 検索入力フィールドを持つ');
});


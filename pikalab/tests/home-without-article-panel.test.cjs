const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

test('index.html: ホームに記事導線セクションと補足説明がない', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.equal(html.includes('id="article-section"'), false);
    assert.equal(html.includes('id="grid-context-copy"'), false);
});

test('constants.js: 記事導線用の定数が残っていない', () => {
    const constants = fs.readFileSync(path.join(projectRoot, 'js', 'constants.js'), 'utf8');
    assert.equal(constants.includes('GRID_DESCRIPTION_BY_CATEGORY'), false);
    assert.equal(constants.includes('ARTICLE_PANEL_CONFIG'), false);
    assert.equal(constants.includes('ARTICLE_PREVIEW_DEFINITIONS'), false);
});

test('apps.js: 記事導線を更新する処理が残っていない', () => {
    const script = fs.readFileSync(path.join(projectRoot, 'js', 'apps.js'), 'utf8');
    assert.equal(script.includes('updateArticlePanel'), false);
    assert.equal(script.includes('ARTICLE_TOOL_BRIDGE_CONFIG'), false);
    assert.equal(script.includes('ARTICLE_PREVIEW_DEFINITIONS'), false);
});

test('index.html: ラボへの通常リンクをJavaScriptなしでも辿れる', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8')
        .replace(/<script\b[\s\S]*?<\/script>/gi, '');
    const appData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'js', 'app-data.json'), 'utf8'));
    const urls = appData.apps.map((app) => app.url).filter(Boolean);

    for (const url of urls) {
        assert.doesNotMatch(url, /\/index\.html$/, `${url}: canonical URLを使う`);
        assert.match(
            html,
            new RegExp(`href=["']${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`),
            `${url}: 静的リンク`
        );
    }
});

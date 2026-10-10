const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const articlePages = [
    'can-concentration-be-grown.html',
    'failure-resilience.html',
    'how-reading-habits-grow.html',
    'low-grade-routines-matter.html',
    'math-difficulty-support.html',
    'play-is-learning.html',
    'rewards-for-learning.html',
    'sibling-comparison-hurts.html',
    'smart-child.html',
    'teacher-fit-matters.html'
];

test('記事ページは現在の共通フッターから信頼リンクを案内する', () => {
    for (const page of articlePages) {
        const html = fs.readFileSync(path.join(projectRoot, 'articles', page), 'utf8');
        assert.match(html, /aria-label="サイト情報"/, `${page} にサイト情報フッターがありません。`);
        assert.match(html, /href="\.\.\/\.\.\/contact\.html"/, `${page} にお問い合わせリンクがありません。`);
        assert.match(html, /href="\.\.\/\.\.\/sitemap\.html"/, `${page} にサイトマップリンクがありません。`);
        assert.match(html, /href="\.\/style\.css"/, `${page} が記事CSSを参照していません。`);
    }
});

test('記事一覧は現在の見た目を保ったまま信頼リンクを案内する', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'articles', 'index.html'), 'utf8');
    assert.match(html, /aria-label="サイト情報"/);
    assert.match(html, /href="\.\.\/\.\.\/contact\.html"/);
    assert.match(html, /href="\.\.\/\.\.\/sitemap\.html"/);
    assert.match(html, /href="\.\/style\.css"/);
});

test('記事本文内の長いリンクは狭い画面でも折り返せる', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'articles', 'style.css'), 'utf8');
    assert.match(css, /\.article-body a\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
    assert.match(css, /\.article-body a\s*\{[^}]*word-break:\s*break-word;/s);
    assert.match(css, /\.article-body \.reference\s*\{[^}]*overflow:\s*hidden;/s);
});

test('未実装アプリは表示もプレイ記録も行わない', () => {
    const { setup } = require('./helpers/homepage-runtime.cjs');
    const catalog = JSON.parse(fs.readFileSync(path.join(projectRoot, 'js/app-data.json'), 'utf8'));
    const unavailable = { ...catalog.apps[0], id: 'unavailable', url: '#' };
    catalog.apps.push(unavailable);
    const runtime = setup({ catalog });
    runtime.renderAppCards();
    runtime.setCategory('middle');
    assert.ok(!runtime.visible().includes(unavailable.id));
    assert.notEqual(runtime.getTodayMissionApp().app.id, unavailable.id);
    runtime.launchApp(unavailable.url, unavailable.appName, unavailable.id);
    assert.equal(runtime.counts.writes, 0);
    assert.ok(!runtime.userProfile.badges.includes(unavailable.id));
    assert.equal(runtime.userProfile.recentApps.length, 0);
});

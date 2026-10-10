const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(root, '..');
const publicBaseUrl = 'https://katakatalab.com/pikalab/';

const appCatalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'app-data.json'), 'utf8'));

function appHtmlRelativePath(app) {
    const relative = String(app?.url || '').trim().replace(/^\.\//, '');
    if (!relative || /^https?:\/\//i.test(relative)) return null;
    return relative.endsWith('/') ? `${relative}index.html` : relative;
}

const indexableLabFiles = new Set(
    (appCatalog.apps || [])
        .filter((app) => !app?.isAmazonCard && app?.indexable === true)
        .map(appHtmlRelativePath)
        .filter(Boolean)
);

function collectHtml(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (['dist', 'node_modules', '.code-studio', '.kotoba'].includes(entry.name)) return [];
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return collectHtml(fullPath);
        return entry.name.endsWith('.html') ? [fullPath] : [];
    });
}

function collectPublishedHtml() {
    return [
        ...collectHtml(root),
        path.join(root, '.code-studio', 'index.html')
    ];
}

function expectedCanonical(filePath) {
    const relative = path.relative(root, filePath).replaceAll('\\', '/');
    if (relative === 'index.html') return 'https://katakatalab.com/pikalab/';
    if (relative.endsWith('/index.html')) {
        return `https://katakatalab.com/pikalab/${relative.slice(0, -'index.html'.length)}`;
    }
    return `https://katakatalab.com/pikalab/${relative}`;
}

function sitemapLocations(filePath) {
    return [...fs.readFileSync(filePath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => match[1]);
}

function isIndexableForSitemap(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (/\bnoindex\b/i.test(html)) return false;

    const relative = path.relative(root, filePath).replaceAll('\\', '/');
    if (relative === 'index.html') return true;
    if (relative === 'privacy.html' || relative === 'terms.html') return true;
    if (relative === 'articles/index.html') return true;
    if (relative.startsWith('articles/') && relative.endsWith('.html')) return true;
    return indexableLabFiles.has(relative);
}

function articleJsonLd(html, label) {
    const blocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [, source] of blocks) {
        const data = JSON.parse(source);
        if (data['@type'] === 'BlogPosting') return data;
    }
    assert.fail(`${label}: BlogPosting JSON-LD`);
}

test('公開HTMLは説明文と自己参照canonicalを持つ', () => {
    for (const filePath of collectHtml(root)) {
        const html = fs.readFileSync(filePath, 'utf8');
        const label = path.relative(root, filePath);
        const interactiveHtml = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');
        assert.match(html, /<meta[^>]+name="description"[^>]+content="[^"]+"/i, `${label}: description`);
        assert.match(
            html,
            new RegExp(`<link[^>]+rel="canonical"[^>]+href="${expectedCanonical(filePath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i'),
            `${label}: canonical`
        );
        assert.equal((interactiveHtml.match(/<h1\b/gi) || []).length, 1, `${label}: 通常表示のh1は1つ`);
    }
});

test('トップと記事ページは機械可読な構造化データを持つ', () => {
    const rootHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(rootHtml, /application\/ld\+json/);
    assert.match(rootHtml, /"@type"\s*:\s*"WebSite"/);

    const articleDir = path.join(root, 'articles');
    for (const name of fs.readdirSync(articleDir).filter((file) => file.endsWith('.html') && file !== 'index.html')) {
        const html = fs.readFileSync(path.join(articleDir, name), 'utf8');
        const data = articleJsonLd(html, name);
        assert.equal(data.author?.['@type'], 'Person', `${name}: author type`);
        assert.equal(data.author?.name, 'かたかた', `${name}: author name`);
        assert.equal(data.author?.url, 'https://katakatalab.com/who-is-katakata.html', `${name}: author url`);
        assert.equal(data.publisher?.name, 'KatakataLab', `${name}: publisher name`);
        assert.match(data.dateModified || '', /^\d{4}-\d{2}-\d{2}$/, `${name}: dateModified`);
    }
});

test('公開HTMLはOG・Twitter・機械可読なページ種別を持つ', () => {
    for (const filePath of collectPublishedHtml()) {
        const html = fs.readFileSync(filePath, 'utf8');
        const label = path.relative(root, filePath);
        assert.match(html, /<meta[^>]+property="og:title"[^>]+content="[^"]+"/i, `${label}: og:title`);
        assert.match(html, /<meta[^>]+property="og:description"[^>]+content="[^"]+"/i, `${label}: og:description`);
        assert.match(html, /<meta[^>]+property="og:image"[^>]+content="https:\/\/[^"]+"/i, `${label}: og:image`);
        assert.match(html, /<meta[^>]+property="og:url"[^>]+content="https:\/\/[^"]+"/i, `${label}: og:url`);
        assert.match(html, /<meta[^>]+name="twitter:card"[^>]+content="[^"]+"/i, `${label}: twitter:card`);
        assert.match(html, /<meta[^>]+name="twitter:title"[^>]+content="[^"]+"/i, `${label}: twitter:title`);
        assert.match(html, /<meta[^>]+name="twitter:description"[^>]+content="[^"]+"/i, `${label}: twitter:description`);
        assert.match(html, /<script[^>]+type="application\/ld\+json"/i, `${label}: JSON-LD`);
    }
});

test('サイトマップはindex対象だけを正規URLで持ち、noindexページを除外する', () => {
    const htmlFiles = collectHtml(root);
    const expectedUrls = [...new Set(htmlFiles.filter(isIndexableForSitemap).map(expectedCanonical))].sort();
    const excludedUrls = [...new Set(htmlFiles.filter((filePath) => !isIndexableForSitemap(filePath)).map(expectedCanonical))];

    const rootUrls = sitemapLocations(path.join(repositoryRoot, 'sitemap.xml'))
        .filter((url) => url.startsWith(publicBaseUrl))
        .sort();
    const allRootUrls = sitemapLocations(path.join(repositoryRoot, 'sitemap.xml'));
    const localUrls = sitemapLocations(path.join(root, 'sitemap.xml')).sort();
    const publicUrls = sitemapLocations(path.join(root, 'public', 'sitemap.xml')).sort();

    assert.ok(allRootUrls.includes('https://katakatalab.com/'), 'ルートサイトマップのトップURLを維持する');
    assert.ok(allRootUrls.some((url) => !url.startsWith(publicBaseUrl)), 'PikaLab以外のURLを維持する');
    assert.deepEqual(rootUrls, [], 'PikaLab URLは専用サイトマップだけで管理する');
    assert.deepEqual(localUrls, expectedUrls, 'PikaLabサイトマップのindex対象URL');
    assert.deepEqual(publicUrls, expectedUrls, 'Vite publicサイトマップのindex対象URL');

    for (const url of [...localUrls, ...publicUrls]) {
        assert.doesNotMatch(url, /\/index\.html$/, `${url}: canonicalと異なるURL`);
    }
    for (const url of excludedUrls) {
        assert.ok(!localUrls.includes(url), `${url}: noindexページをローカルサイトマップへ載せない`);
        assert.ok(!publicUrls.includes(url), `${url}: noindexページをpublicサイトマップへ載せない`);
    }
});

function findSitemapBlock(sitemap, url) {
    return (sitemap.match(/<url>[\s\S]*?<\/url>/g) || [])
        .find((block) => block.includes(`<loc>${url}</loc>`));
}

test('記事のdateModifiedをPikaLabサイトマップへ反映する', () => {
    const sitemapFiles = [path.join(root, 'sitemap.xml'), path.join(root, 'public', 'sitemap.xml')];
    const articleDir = path.join(root, 'articles');
    for (const name of fs.readdirSync(articleDir).filter((file) => file.endsWith('.html') && file !== 'index.html')) {
        const filePath = path.join(articleDir, name);
        const html = fs.readFileSync(filePath, 'utf8');
        const data = articleJsonLd(html, name);
        const canonical = expectedCanonical(filePath);
        for (const sitemapFile of sitemapFiles) {
            const sitemap = fs.readFileSync(sitemapFile, 'utf8');
            const block = findSitemapBlock(sitemap, canonical);
            assert.ok(block, `${path.basename(sitemapFile)}: ${name}のURL`);
            assert.match(block, new RegExp(`<lastmod>${data.dateModified}</lastmod>`), `${path.basename(sitemapFile)}: ${name}のlastmod`);
        }
    }
});

const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedText } = require('./write-generated-text.cjs');

const pikalabRoot = path.resolve(__dirname, '..');
const publicBaseUrl = 'https://katakatalab.com/pikalab/';
const excludedDirectories = new Set(['dist', 'node_modules', '.code-studio', '.kotoba']);

const appCatalogPath = path.join(pikalabRoot, 'js', 'app-data.json');
const appCatalog = JSON.parse(fs.readFileSync(appCatalogPath, 'utf8'));

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

function collectHtml(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (excludedDirectories.has(entry.name)) return [];
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return collectHtml(fullPath);
        return entry.name.endsWith('.html') ? [fullPath] : [];
    });
}

function canonicalFromHtml(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const match = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
    if (!match) throw new Error(`canonicalがありません: ${path.relative(pikalabRoot, filePath)}`);
    return match[1];
}

function escapeHtmlAttribute(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function pageJsonLd(filePath, title, description, canonical) {
    const relative = path.relative(pikalabRoot, filePath).replaceAll('\\', '/');
    let type = 'WebApplication';
    if (relative === 'articles/index.html') type = 'CollectionPage';
    if (relative === 'privacy.html' || relative === 'terms.html') type = 'WebPage';

    const data = {
        '@context': 'https://schema.org',
        '@type': type,
        name: title,
        url: canonical,
        description
    };
    if (type === 'WebApplication') {
        data.applicationCategory = 'EducationalApplication';
        data.operatingSystem = 'Any';
        data.isAccessibleForFree = true;
        data.offers = {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'JPY'
        };
    }
    return data;
}

function syncPageMetadata(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    let nextSource = source;
    const title = source.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const description = source.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1];
    const canonical = source.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
    if (!title || !description || !canonical) {
        throw new Error(`SEOメタデータが不足しています: ${path.relative(pikalabRoot, filePath)}`);
    }

    const fallbackImage = `${publicBaseUrl}pikalab_ogp_compressed.jpg`;
    const additions = [];
    const metaDefinitions = [
        ['property', 'og:url', canonical],
        ['property', 'og:type', 'website'],
        ['property', 'og:title', title],
        ['property', 'og:description', description],
        ['property', 'og:image', fallbackImage],
        ['name', 'twitter:card', 'summary_large_image'],
        ['name', 'twitter:title', title],
        ['name', 'twitter:description', description],
        ['name', 'twitter:image', fallbackImage]
    ];
    for (const [attribute, key, value] of metaDefinitions) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`<meta(?=[^>]*\\b${attribute}="${escapedKey}")[^>]*>`, 'i');
        if (pattern.test(nextSource)) {
            nextSource = nextSource.replace(pattern, (tag) => {
                const escapedValue = escapeHtmlAttribute(value);
                if (/\bcontent="[^"]*"/i.test(tag)) {
                    return tag.replace(/\bcontent="[^"]*"/i, `content="${escapedValue}"`);
                }
                return tag.replace(/>$/, ` content="${escapedValue}">`);
            });
        } else {
            additions.push(`    <meta ${attribute}="${key}" content="${escapeHtmlAttribute(value)}">`);
        }
    }

    nextSource = nextSource.replace(
        /(<script[^>]+type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi,
        (block, openTag, jsonSource, closeTag) => {
            const data = JSON.parse(jsonSource);
            const items = Array.isArray(data) ? data : [data];
            let changed = false;
            for (const item of items) {
                if (!['WebApplication', 'WebPage', 'CollectionPage', 'WebSite'].includes(item?.['@type'])) continue;
                item.name = title;
                item.url = canonical;
                item.description = description;
                changed = true;
            }
            return changed ? `${openTag}${JSON.stringify(data)}${closeTag}` : block;
        }
    );

    if (!/<script[^>]+type="application\/ld\+json"/i.test(nextSource)) {
        const json = JSON.stringify(pageJsonLd(filePath, title, description, canonical));
        additions.push(`    <script type="application/ld+json">${json}</script>`);
    }

    const newline = nextSource.includes('\r\n') ? '\r\n' : '\n';
    if (additions.length > 0) {
        nextSource = nextSource.replace(
            /<\/head>/i,
            `${additions.join(newline)}${newline}</head>`
        );
    }
    if (nextSource === source) return;
    fs.writeFileSync(filePath, nextSource);
}

function normalizeLastmod(value, filePath) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const date = new Date(`${trimmed}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) {
            throw new Error(`lastmodの日付が不正です: ${path.relative(pikalabRoot, filePath)}`);
        }
        return trimmed;
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`lastmodの日付が不正です: ${path.relative(pikalabRoot, filePath)}`);
    }
    return date.toISOString().replace('.000Z', 'Z');
}

function articleLastmod(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const blocks = source.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const [, jsonSource] of blocks) {
        let data;
        try {
            data = JSON.parse(jsonSource);
        } catch (error) {
            throw new Error(`JSON-LDを解析できません: ${path.relative(pikalabRoot, filePath)}: ${error.message}`);
        }
        if (data['@type'] !== 'BlogPosting') continue;
        return normalizeLastmod(data.dateModified || data.datePublished, filePath);
    }
    return null;
}

function sitemapEntry(page, newline) {
    return [
        '<url>',
        `  <loc>${page.url}</loc>`,
        ...(page.lastmod ? [`  <lastmod>${page.lastmod}</lastmod>`] : []),
        '</url>',
    ].join(newline);
}

function writeSitemaps(urls) {
    const localPath = path.join(pikalabRoot, 'sitemap.xml');
    const currentLocalSource = fs.existsSync(localPath) ? fs.readFileSync(localPath, 'utf8') : '';
    const newline = currentLocalSource.includes('\r\n') ? '\r\n' : '\n';
    const entries = urls.map((page) => sitemapEntry(page, newline)).join(`${newline}${newline}`);
    const localSource = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        entries,
        '</urlset>',
        '',
    ].join(newline);
    writeGeneratedText(localPath, localSource, currentLocalSource);
    writeGeneratedText(path.join(pikalabRoot, 'public', 'sitemap.xml'), localSource);
}

function addArticleMetadata() {
    const articleDirectory = path.join(pikalabRoot, 'articles');
    for (const name of fs.readdirSync(articleDirectory).filter((file) => file.endsWith('.html') && file !== 'index.html')) {
        const filePath = path.join(articleDirectory, name);
        const source = fs.readFileSync(filePath, 'utf8');
        let foundBlogPosting = false;
        const nextSource = source.replace(
            /(<script[^>]+type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi,
            (block, openTag, jsonSource, closeTag) => {
                const data = JSON.parse(jsonSource);
                if (data['@type'] !== 'BlogPosting') return block;
                foundBlogPosting = true;
                data.author = {
                    '@type': 'Person',
                    name: 'かたかた',
                    url: 'https://katakatalab.com/who-is-katakata.html'
                };
                data.publisher = {
                    '@type': 'Organization',
                    name: 'KatakataLab',
                    url: 'https://katakatalab.com/'
                };
                data.dateModified = data.dateModified || data.datePublished;
                return `${openTag}\n        ${JSON.stringify(data)}\n    ${closeTag}`;
            }
        );
        if (!foundBlogPosting) throw new Error(`BlogPosting JSON-LDがありません: ${name}`);
        writeGeneratedText(filePath, nextSource, source);
    }
}

addArticleMetadata();

function isIndexableForSitemap(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const html = fs.readFileSync(filePath, 'utf8');
    if (/\bnoindex\b/i.test(html)) return false;

    const relative = path.relative(pikalabRoot, filePath).replaceAll('\\', '/');
    if (relative === 'index.html') return true;
    if (relative === 'privacy.html' || relative === 'terms.html') return true;
    if (relative === 'articles/index.html') return true;
    if (relative.startsWith('articles/') && relative.endsWith('.html')) return true;
    return indexableLabFiles.has(relative);
}

const htmlFiles = collectHtml(pikalabRoot);
const sitemapPages = [
    ...htmlFiles
        .filter((filePath) => isIndexableForSitemap(filePath))
        .map((filePath) => ({
            url: canonicalFromHtml(filePath),
            filePath,
        })),
];

const urls = [...new Map(sitemapPages.map((page) => [page.url, {
    url: page.url,
    lastmod: articleLastmod(page.filePath),
}])).values()].sort((left, right) => left.url.localeCompare(right.url));

for (const filePath of [
    ...htmlFiles,
    path.join(pikalabRoot, '.code-studio', 'index.html')
]) {
    syncPageMetadata(filePath);
}
writeSitemaps(urls);
console.log(`PikaLabのSEOメタデータとサイトマップを同期しました: ${urls.length} URL`);

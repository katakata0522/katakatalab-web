const fs = require('node:fs');
const path = require('node:path');

function collectHtml(root, current = root) {
    return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
        const absolute = path.join(current, entry.name);
        // assets配下のHTMLはViteが内部参照用に生成する資産で、公開ルートではない
        if (entry.isDirectory()) {
            if (current === root && entry.name === 'assets') return [];
            return collectHtml(root, absolute);
        }
        return entry.name.endsWith('.html') ? [absolute] : [];
    });
}

function getAttribute(tag, name) {
    const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
    return match ? match[1] : '';
}

function resolveLocalReference(root, htmlFile, href) {
    const cleanHref = href.split(/[?#]/, 1)[0];
    if (!cleanHref || /^(?:[a-z]+:|\/\/|#)/i.test(cleanHref)) return null;
    if (cleanHref.startsWith('/pikalab/')) {
        return path.join(root, cleanHref.slice('/pikalab/'.length));
    }
    if (cleanHref.startsWith('/')) return null;
    return path.resolve(path.dirname(htmlFile), cleanHref);
}

function isPathInside(root, target) {
    const relative = path.relative(path.resolve(root), path.resolve(target));
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function collectResourceReferences(html) {
    const references = [];
    const tagRules = [
        { pattern: /<script\b[^>]*>/gi, attribute: 'src' },
        { pattern: /<link\b[^>]*>/gi, attribute: 'href' },
        { pattern: /<(?:img|source|audio|video|track|embed)\b[^>]*>/gi, attribute: 'src' },
        { pattern: /<object\b[^>]*>/gi, attribute: 'data' }
    ];

    for (const { pattern, attribute } of tagRules) {
        for (const match of html.matchAll(pattern)) {
            const value = getAttribute(match[0], attribute);
            if (value) references.push(value);

            const srcset = getAttribute(match[0], 'srcset');
            if (!srcset) continue;
            for (const candidate of srcset.split(',')) {
                const source = candidate.trim().split(/\s+/, 1)[0];
                if (source) references.push(source);
            }
        }
    }

    return references;
}

// Classic scriptから追加で読み込む文字列リテラルと、currentScript由来baseUrlを使う new URL() 依存を拾う。
// Vite管理のimportグラフではなく、script/link要素を動的生成する従来資産向け。
// CSSも返すが、再帰探索を続けるのはJSだけ。
function collectRuntimeScriptReferences(source) {
    const references = [];
    const patterns = [
        /\bloadScript\s*\(\s*(['"`])([^'"`]+)\1/g,
        /\bPikaLabToneLoader\s*\.\s*load\s*\(\s*(['"`])([^'"`]+\.js(?:\?[^'"`]*)?)\1/g,
        /\b(?:script|element)\.src\s*=\s*(['"`])([^'"`]+\.js(?:\?[^'"`]*)?)\1/g,
        /\bnew\s+URL\s*\(\s*(['"`])([^'"`]+\.(?:js|css)(?:\?[^'"`]*)?)\1\s*,\s*baseUrl\s*\)/g,
        /\bimportScripts\s*\(\s*(['"`])([^'"`]+)\1/g,
        /\b(?:link|element)\.href\s*=\s*(['"`])([^'"`]+\.css(?:\?[^'"`]*)?)\1/g
    ];

    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const reference = match[2];
            if (!reference || reference.includes('${')) continue;
            references.push(reference);
        }
    }

    return [...new Set(references)];
}

function collectTransitiveScriptReferences(root, htmlFile, initialReferences, scriptReferences = new Map()) {
    const queue = [...initialReferences];
    const seenScripts = new Set();
    const discovered = [];
    const discoveredSet = new Set();

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const reference = queue[cursor];
        const target = resolveLocalReference(root, htmlFile, reference);
        if (!target || !isPathInside(root, target)) continue;
        if (path.extname(target).toLowerCase() !== '.js') continue;
        const absolute = path.resolve(target);
        if (seenScripts.has(absolute)) continue;
        seenScripts.add(absolute);

        // 保存するのは生の参照文字列。HTMLごとに異なる解決先は共有しない。
        let runtimeReferences = scriptReferences.get(absolute);
        if (runtimeReferences === undefined) {
            if (!fs.existsSync(target) || !fs.statSync(target).isFile()) continue;
            runtimeReferences = collectRuntimeScriptReferences(fs.readFileSync(target, 'utf8'));
            scriptReferences.set(absolute, runtimeReferences);
        }
        for (const runtimeReference of runtimeReferences) {
            if (!discoveredSet.has(runtimeReference)) {
                discoveredSet.add(runtimeReference);
                discovered.push(runtimeReference);
            }
            queue.push(runtimeReference);
        }
    }

    return discovered;
}

function pikalabUrlToHtmlPath(urlValue) {
    let parsed;
    try {
        parsed = new URL(urlValue, 'https://katakatalab.com/pikalab/');
    } catch {
        return null;
    }
    if (parsed.origin !== 'https://katakatalab.com' || !parsed.pathname.startsWith('/pikalab/')) return null;

    const relative = decodeURIComponent(parsed.pathname.slice('/pikalab/'.length));
    if (!relative) return 'index.html';
    if (relative.endsWith('/')) return `${relative}index.html`;
    return relative.endsWith('.html') ? relative : null;
}

function requiredPublicHtmlPathsFromSource(projectRoot) {
    const project = path.resolve(projectRoot);
    const required = new Set(['index.html', 'code-studio/index.html', 'kotoba/index.html']);

    const sitemapPath = path.join(project, 'public', 'sitemap.xml');
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    for (const match of sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)) {
        const htmlPath = pikalabUrlToHtmlPath(match[1]);
        if (htmlPath) required.add(htmlPath);
    }

    const catalog = JSON.parse(fs.readFileSync(path.join(project, 'js', 'app-data.json'), 'utf8'));
    for (const app of catalog.apps || []) {
        if (app.isAmazonCard) continue;
        const relative = String(app.url || '').trim();
        if (!relative || /^(?:[a-z]+:|\/\/)/i.test(relative)) continue;
        const htmlPath = pikalabUrlToHtmlPath(relative);
        if (htmlPath) required.add(htmlPath);
    }

    return [...required].sort();
}

function verifyToneLicenseSidecars(root, errors) {
    const pairs = [
        ['assets/tone-14.8.49.js', 'assets/Tone.js.LICENSE.txt'],
        ['focus_studio/assets/tone-14.8.49.js', 'focus_studio/assets/Tone.js.LICENSE.txt']
    ];

    for (const [scriptPath, licensePath] of pairs) {
        const script = path.join(root, ...scriptPath.split('/'));
        if (!fs.existsSync(script)) continue;

        const source = fs.readFileSync(script, 'utf8');
        if (!source.includes('For license information please see Tone.js.LICENSE.txt')) continue;

        const license = path.join(root, ...licensePath.split('/'));
        if (!fs.existsSync(license)) {
            errors.push(`${scriptPath}: Tone.js.LICENSE.txt が配布物にありません`);
            continue;
        }

        const licenseText = fs.readFileSync(license, 'utf8');
        if (!licenseText.includes('MIT License') || !licenseText.includes('Yotam Mann')) {
            errors.push(`${licensePath}: Tone.jsのライセンス表示が不完全です`);
        }
    }
}

function verifyRequiredPath(root, requiredPath, label, errors) {
    const normalized = String(requiredPath).replaceAll('/', path.sep);
    const target = path.resolve(root, normalized);
    if (!isPathInside(root, target) || !fs.existsSync(target)) {
        errors.push(`${label}がありません (${requiredPath})`);
    }
}

function verifyBuildOutput(buildRoot, options = {}) {
    const root = path.resolve(buildRoot);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        throw new Error(`ビルド出力がありません: ${root}`);
    }

    const htmlFiles = collectHtml(root);
    const scriptReferences = new Map();
    const errors = [];
    let rootManifestCount = 0;
    const expectedHtmlFiles = Number.isInteger(options.expectedHtmlFiles)
        ? options.expectedHtmlFiles
        : null;
    const requiredHtmlPaths = Array.isArray(options.requiredHtmlPaths)
        ? options.requiredHtmlPaths
        : [];
    const requiredFilePaths = Array.isArray(options.requiredFilePaths)
        ? options.requiredFilePaths
        : [];

    // fixture単体テストでは件数検査も使えるが、本番は公開契約から必須パスを導出する。
    if (expectedHtmlFiles !== null && htmlFiles.length !== expectedHtmlFiles) {
        errors.push(`公開HTML数が不一致です（期待${expectedHtmlFiles}件、現在${htmlFiles.length}件）`);
    }
    for (const requiredPath of requiredHtmlPaths) verifyRequiredPath(root, requiredPath, '必須ページ', errors);
    for (const requiredPath of requiredFilePaths) verifyRequiredPath(root, requiredPath, '必須配信ファイル', errors);

    for (const htmlFile of htmlFiles) {
        const relative = path.relative(root, htmlFile).replaceAll('\\', '/');
        const html = fs.readFileSync(htmlFile, 'utf8');
        const links = html.match(/<link\b[^>]*>/gi) || [];
        const directReferences = collectResourceReferences(html);
        const runtimeReferences = collectTransitiveScriptReferences(root, htmlFile, directReferences, scriptReferences);

        for (const reference of [...directReferences, ...runtimeReferences]) {
            const target = resolveLocalReference(root, htmlFile, reference);
            if (target && !isPathInside(root, target)) {
                errors.push(`${relative}: ビルドルート外への参照です (${reference})`);
            } else if (target && !fs.existsSync(target)) {
                errors.push(`${relative}: 参照先がありません (${reference})`);
            }
        }

        for (const link of links) {
            const rel = getAttribute(link, 'rel').toLowerCase().split(/\s+/);
            const href = getAttribute(link, 'href');
            if (!href) continue;

            if (rel.includes('manifest')) {
                const isPikaLabManifest = path.basename(href.split(/[?#]/, 1)[0]) === 'manifest.webmanifest';
                if (isPikaLabManifest && relative !== 'index.html') {
                    errors.push(`${relative}: ルート以外のmanifest参照です`);
                } else if (isPikaLabManifest && relative === 'index.html') {
                    rootManifestCount += 1;
                }
            }
        }
    }

    if (rootManifestCount !== 1) {
        errors.push(`ルートmanifest参照は1件必要です（現在${rootManifestCount}件）`);
    }

    verifyToneLicenseSidecars(root, errors);

    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }

    return { htmlFiles: htmlFiles.length, requiredHtmlFiles: requiredHtmlPaths.length };
}

module.exports = {
    collectHtml,
    collectResourceReferences,
    collectRuntimeScriptReferences,
    collectTransitiveScriptReferences,
    isPathInside,
    pikalabUrlToHtmlPath,
    requiredPublicHtmlPathsFromSource,
    resolveLocalReference,
    verifyBuildOutput,
    verifyToneLicenseSidecars
};

if (require.main === module) {
    try {
        const buildRoot = process.argv[2] || 'dist';
        const projectRoot = path.resolve(__dirname, '..');
        const requiredHtmlPaths = requiredPublicHtmlPathsFromSource(projectRoot);
        const result = verifyBuildOutput(buildRoot, {
            requiredHtmlPaths,
            requiredFilePaths: ['.htaccess', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml']
        });
        console.log(`ビルド出力検査: HTML ${result.htmlFiles}件 / 公開契約 ${result.requiredHtmlFiles}件 OK`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

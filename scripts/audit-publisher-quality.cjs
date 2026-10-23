'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://katakatalab.com';
const repositoryRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repositoryRoot, 'public-build');

// 広告は「独自の手順・判断基準がある厚いガイド」に限定（IT用語連載は広告なし）
const AD_ENABLED_PATHS = new Set([
  '/guides/tool-selection-guide.html',
  '/guides/case-studies.html',
  '/guides/aspect-ratio-guide.html',
  '/guides/px-rem-guide.html',
  '/guides/password-guide.html',
  '/guides/codestudio-guide.html',
]);

const AD_FREE_PATHS = [
  /^\/$/,
  /^\/pikalab(?:\/|$)/,
  /^\/en(?:\/|$)/,
  /^\/lab-tools(?:\/|$)/,
  /^\/(?:aspect-ratio-calc|chiritsumo-calc|moyamoya-sorter|screenshot-crop|discount-calc|emphasis-lines|font-lab|ogp-simulator|password-generator|px-rem-converter|qrcode|seireki|text-diff)\/$/,
  /^\/(?:aspect-ratio-calc|emphasis-lines|font-lab|ogp-simulator|px-rem-converter|qrcode|text-diff)\/en(?:\/|$)/,
  /^\/guides\/en(?:\/|$)/,
  /^\/guides\/it-basics(?:\/|$)/,
  /^\/(?:who-is-katakata|about-katakatalab)\.html$/,
  /^\/guides\/(?:sns-image-size-guide|password-storage-guide|css-size-scale-guide|qr-guide|discount-guide)\.html$/,
  /^\/emphasis-lines\/guide\.html$/,
  /^\/qrcode\/guides\.html$/,
  /^\/(?:404\.html|contact\.html|privacy\.html|terms\.html|sitemap\.html|offline\.html|ambition\.html|note-selection\.html|updates\.html)$/,
  /^\/qrcode\/(?:privacy|terms)\.html$/,
];
const EXTERNAL_MANAGED_PATH_PREFIXES = Object.freeze([
  '/asobi-pocket/',
]);
const SCAN_EXCLUDED_DIRECTORIES = new Set([
  '.git', 'node_modules', 'dist', 'tests', 'production', 'test-results',
  'visual-guard-artifacts',
]);

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function getSitemapUrls() {
  const sitemaps = `${read('sitemap.xml')}\n${read('pikalab/sitemap.xml')}`;
  return [...sitemaps.matchAll(/<loc>(https:\/\/katakatalab\.com[^<]*)<\/loc>/g)]
    .map((match) => new URL(match[1]));
}

function urlPathToCandidates(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const withoutLeadingSlash = decodedPath.replace(/^\/+/, '');
  const relativeFile = decodedPath.endsWith('/')
    ? path.join(withoutLeadingSlash, 'index.html')
    : withoutLeadingSlash;

  const candidates = [
    path.join(publicRoot, relativeFile || 'index.html'),
    path.join(repositoryRoot, relativeFile || 'index.html'),
  ];

  // CodeStudioはソース上だけ隠しディレクトリに置き、デプロイ時に正規URLへコピーする
  if (decodedPath === '/pikalab/code-studio/') {
    candidates.push(path.join(repositoryRoot, 'pikalab', '.code-studio', 'index.html'));
  }
  if (decodedPath === '/pikalab/kotoba/') {
    candidates.push(path.join(repositoryRoot, 'pikalab', '.kotoba', 'index.html'));
  }

  return candidates;
}

function findPageFile(urlPath) {
  return urlPathToCandidates(urlPath).find((candidate) => fs.existsSync(candidate));
}

function extractAttribute(html, tagName, attributeName, attributeValue, targetAttribute) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*${attributeName}=["']${attributeValue}["'][^>]*>`, 'i');
  const tag = html.match(tagPattern)?.[0] || '';
  return tag.match(new RegExp(`${targetAttribute}=["']([^"']+)["']`, 'i'))?.[1] || '';
}

function extractCanonical(html) {
  return extractAttribute(html, 'link', 'rel', 'canonical', 'href');
}

function extractMeta(html, name) {
  return extractAttribute(html, 'meta', 'name', name, 'content');
}

function hasAdCode(html) {
  return /pagead2\.googlesyndication\.com|adsbygoogle/.test(html);
}

function normalizeCanonical(value) {
  try {
    const url = new URL(value, SITE_ORIGIN);
    url.hash = '';
    return url.href;
  } catch {
    return value;
  }
}

function isExternallyManagedPath(urlPath) {
  return EXTERNAL_MANAGED_PATH_PREFIXES.some((prefix) => (
    urlPath === prefix.slice(0, -1) || urlPath.startsWith(prefix)
  ));
}

function auditInternalLinks(html, pageUrl) {
  const findings = [];
  const checkedPaths = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || /^(?:mailto|tel|javascript|data):/i.test(href)) continue;

    let target;
    try {
      target = new URL(href, pageUrl);
    } catch {
      findings.push({ severity: 'error', path: pageUrl.pathname, message: `不正なリンクURLです: ${href}` });
      continue;
    }
    if (target.origin !== SITE_ORIGIN) continue;

    const targetPath = target.pathname;
    if (checkedPaths.has(targetPath)) continue;
    checkedPaths.add(targetPath);
    if (isExternallyManagedPath(targetPath)) continue;
    if (!targetPath.endsWith('/') && !targetPath.endsWith('.html')) continue;
    if (!findPageFile(targetPath)) {
      findings.push({
        severity: 'error',
        path: pageUrl.pathname,
        message: `内部リンク先のHTMLがありません: ${href}`,
      });
    }
  }
  return findings;
}

function auditSitemapPage(url) {
  const findings = [];
  const relativeUrl = url.pathname;
  const filePath = findPageFile(relativeUrl);
  if (!filePath) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'サイトマップURLに対応するHTMLがありません' });
    return findings;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const robots = extractMeta(html, 'robots').toLowerCase();
  const canonical = extractCanonical(html);
  const expectedCanonical = url.href;
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const pageHasAdCode = hasAdCode(html);
  const pageAllowsAdCode = AD_ENABLED_PATHS.has(relativeUrl);

  if (!/<html\b[^>]*\blang=["'][^"']+["']/i.test(html)) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'html要素にlang属性がありません' });
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'titleがありません' });
  }
  if (!extractMeta(html, 'description')) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'meta descriptionがありません' });
  }
  if (h1Count === 0) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'h1がありません' });
  } else if (h1Count > 1) {
    findings.push({ severity: 'error', path: relativeUrl, message: `h1が${h1Count}個あります` });
  }
  if (!extractMeta(html, 'viewport')) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'viewportがありません' });
  }
  if (/\bnoindex\b/.test(robots)) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'サイトマップ掲載ページがnoindexです' });
  }
  if (!canonical) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'canonicalがありません' });
  } else if (normalizeCanonical(canonical) !== normalizeCanonical(expectedCanonical)) {
    findings.push({
      severity: 'error',
      path: relativeUrl,
      message: `canonical不一致: ${canonical}`,
    });
  }
  if (pageHasAdCode && !pageAllowsAdCode) {
    findings.push({ severity: 'error', path: relativeUrl, message: '広告許可リスト外のページにAdSenseコードがあります' });
  }
  if (!pageHasAdCode && pageAllowsAdCode) {
    findings.push({ severity: 'error', path: relativeUrl, message: '広告対象ページからAdSenseコードが欠落しています' });
  }
  if (AD_FREE_PATHS.some((pattern) => pattern.test(relativeUrl)) && pageHasAdCode) {
    findings.push({ severity: 'error', path: relativeUrl, message: '広告除外ページにAdSenseコードがあります' });
  }
  if (/\bnoindex\b/.test(robots) && pageHasAdCode) {
    findings.push({ severity: 'error', path: relativeUrl, message: 'noindexページにAdSenseコードがあります' });
  }
  findings.push(...auditInternalLinks(html, url));

  return findings;
}

function collectHtmlFiles(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SCAN_EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectHtmlFiles(entryPath, output);
    if (entry.isFile() && entry.name.endsWith('.html')) output.push(entryPath);
  }
  return output;
}

function auditIndexableCanonicals(sitemapUrls) {
  const sitemapSet = new Set(sitemapUrls.map((url) => normalizeCanonical(url.href)));
  const findings = [];
  const checkedCanonicals = new Set();
  const files = [
    ...collectHtmlFiles(publicRoot),
    ...collectHtmlFiles(path.join(repositoryRoot, 'pikalab')),
  ];

  for (const filePath of files) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (/\bnoindex\b/i.test(extractMeta(html, 'robots'))) continue;
    const canonical = extractCanonical(html);
    if (!canonical) continue;
    const normalized = normalizeCanonical(canonical);
    if (!normalized.startsWith(`${SITE_ORIGIN}/`) || checkedCanonicals.has(normalized)) continue;
    checkedCanonicals.add(normalized);
    if (!sitemapSet.has(normalized)) {
      findings.push({
        severity: 'warning',
        path: new URL(normalized).pathname,
        message: 'index可能なcanonical URLがサイトマップにありません',
      });
    }
  }
  return findings;
}

function auditPublishedAdInventory() {
  const findings = [];
  const files = [
    ...collectHtmlFiles(publicRoot),
    ...collectHtmlFiles(path.join(repositoryRoot, 'pikalab')),
  ];

  for (const filePath of files) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (!hasAdCode(html)) continue;

    const canonical = extractCanonical(html);
    const robots = extractMeta(html, 'robots').toLowerCase();
    const fallbackPath = path.relative(repositoryRoot, filePath).replaceAll('\\', '/');
    let pagePath = fallbackPath;

    if (canonical) {
      try {
        const canonicalUrl = new URL(canonical, SITE_ORIGIN);
        pagePath = canonicalUrl.pathname;
        if (canonicalUrl.origin !== SITE_ORIGIN) {
          findings.push({ severity: 'error', path: pagePath, message: '広告ページのcanonicalが別オリジンです' });
        }
      } catch {
        findings.push({ severity: 'error', path: fallbackPath, message: '広告ページのcanonicalが不正です' });
      }
    } else {
      findings.push({ severity: 'error', path: fallbackPath, message: '広告ページにcanonicalがありません' });
    }

    if (/\bnoindex\b/.test(robots)) {
      findings.push({ severity: 'error', path: pagePath, message: '公開成果物のnoindexページにAdSenseコードがあります' });
    }
    if (!AD_ENABLED_PATHS.has(pagePath)) {
      findings.push({ severity: 'error', path: pagePath, message: '公開成果物の広告許可リスト外ページにAdSenseコードがあります' });
    }
  }

  return findings;
}

function auditPublisherQuality() {
  const urls = getSitemapUrls();
  const findings = [
    ...urls.flatMap(auditSitemapPage),
    ...auditIndexableCanonicals(urls),
    ...auditPublishedAdInventory(),
  ];
  const pageHtml = urls
    .map((url) => findPageFile(url.pathname))
    .filter(Boolean)
    .map((filePath) => fs.readFileSync(filePath, 'utf8'));
  return {
    checkedUrls: urls.length,
    adPages: pageHtml.filter(hasAdCode).length,
    errors: findings.filter((finding) => finding.severity === 'error'),
    warnings: findings.filter((finding) => finding.severity === 'warning'),
  };
}

function printReport(report) {
  console.log(`Publisher quality audit: URLs=${report.checkedUrls}, adPages=${report.adPages}, errors=${report.errors.length}, warnings=${report.warnings.length}`);
  for (const finding of [...report.errors, ...report.warnings]) {
    console.log(`[${finding.severity.toUpperCase()}] ${finding.path}: ${finding.message}`);
  }
}

if (require.main === module) {
  const report = auditPublisherQuality();
  printReport(report);
  if (report.errors.length > 0 || report.warnings.length > 0) process.exitCode = 1;
}

module.exports = {
  AD_ENABLED_PATHS,
  AD_FREE_PATHS,
  EXTERNAL_MANAGED_PATH_PREFIXES,
  auditInternalLinks,
  auditIndexableCanonicals,
  auditPublishedAdInventory,
  auditPublisherQuality,
  findPageFile,
  getSitemapUrls,
  hasAdCode,
  isExternallyManagedPath,
};

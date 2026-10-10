'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://katakatalab.com';
const repositoryRoot = path.resolve(__dirname, '..');
const {
  PUBLIC_ROOT_FILES,
  PUBLIC_DIRECTORIES,
  shouldCopyPublicEntry,
} = require('../.github/scripts/build-public-root.cjs');

const GOOGLE_SOFTWARE_CATEGORIES = new Set([
  'GameApplication',
  'SocialNetworkingApplication',
  'TravelApplication',
  'ShoppingApplication',
  'SportsApplication',
  'LifestyleApplication',
  'BusinessApplication',
  'DesignApplication',
  'DeveloperApplication',
  'DriverApplication',
  'EducationalApplication',
  'HealthApplication',
  'FinanceApplication',
  'SecurityApplication',
  'BrowserApplication',
  'CommunicationApplication',
  'DesktopEnhancementApplication',
  'EntertainmentApplication',
  'MultimediaApplication',
  'HomeApplication',
  'UtilitiesApplication',
  'ReferenceApplication',
]);

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function extractSitemapUrls(relativePath = 'sitemap.xml') {
  const xml = read(relativePath);
  return [...xml.matchAll(/<loc>(https:\/\/katakatalab\.com[^<]*)<\/loc>/g)]
    .map((match) => new URL(match[1]));
}

function urlToRepositoryPath(url) {
  const pathname = decodeURIComponent(url.pathname);
  const withoutLeadingSlash = pathname.replace(/^\/+/, '');
  if (!withoutLeadingSlash) return 'index.html';
  if (pathname.endsWith('/')) {
    return path.join(withoutLeadingSlash, 'index.html').replaceAll('\\', '/');
  }
  return withoutLeadingSlash;
}

function resolvePageFile(url) {
  const candidate = path.join(repositoryRoot, urlToRepositoryPath(url));
  return fs.existsSync(candidate) ? candidate : null;
}

function extractTag(html, tagName, predicate) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || [];
  return tags.find(predicate) || '';
}

function extractAttribute(tag, name) {
  if (!tag) return '';
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1]?.trim() || '';
}

function extractMeta(html, key, attribute = 'name') {
  const tag = extractTag(html, 'meta', (candidate) => (
    extractAttribute(candidate, attribute).toLowerCase() === key.toLowerCase()
  ));
  return extractAttribute(tag, 'content');
}

function extractCanonical(html) {
  const tag = extractTag(html, 'link', (candidate) => (
    extractAttribute(candidate, 'rel').toLowerCase().split(/\s+/).includes('canonical')
  ));
  return extractAttribute(tag, 'href');
}

function extractAlternates(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  return links
    .filter((candidate) => extractAttribute(candidate, 'rel').toLowerCase().split(/\s+/).includes('alternate'))
    .map((candidate) => ({
      hreflang: extractAttribute(candidate, 'hreflang').toLowerCase(),
      href: extractAttribute(candidate, 'href'),
    }))
    .filter((item) => item.hreflang && item.href);
}

function extractTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/\s+/g, ' ')
    .trim() || '';
}

function extractHtmlLang(html) {
  const tag = html.match(/<html\b[^>]*>/i)?.[0] || '';
  return extractAttribute(tag, 'lang');
}

function normalizeUrl(value) {
  try {
    const url = new URL(value, SITE_ORIGIN);
    url.hash = '';
    return url.href;
  } catch {
    return value;
  }
}

function flattenJsonLd(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenJsonLd(item, output);
    return output;
  }

  if (!value || typeof value !== 'object') return output;

  if (Array.isArray(value['@graph'])) {
    flattenJsonLd(value['@graph'], output);
  }

  const item = { ...value };
  delete item['@graph'];
  if (Object.keys(item).length > 0) output.push(item);
  return output;
}

function parseJsonLd(html, pagePath) {
  const findings = [];
  const objects = [];
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const [index, block] of blocks.entries()) {
    try {
      flattenJsonLd(JSON.parse(block[1]), objects);
    } catch (error) {
      findings.push({
        severity: 'error',
        path: pagePath,
        code: 'invalid_json_ld',
        message: `JSON-LD #${index + 1} をJSONとして解析できません: ${error.message}`,
      });
    }
  }

  return { count: blocks.length, findings, objects };
}

function hasOfferPrice(offers) {
  if (Array.isArray(offers)) return offers.some((offer) => hasOfferPrice(offer));
  if (!offers || typeof offers !== 'object') return false;

  if (offers['@type'] === 'AggregateOffer') {
    return offers.lowPrice !== undefined || offers.highPrice !== undefined;
  }

  return offers.price !== undefined && String(offers.price).trim() !== '';
}

function auditStructuredData(objects, pagePath, ogType) {
  const findings = [];
  const article = objects.find((item) => (
    ['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])
  ));

  if (article && ogType && ogType !== 'article') {
    findings.push({
      severity: 'error',
      path: pagePath,
      code: 'article_og_type_mismatch',
      message: `Article系JSON-LDがあるのにog:typeが"${ogType}"です。articleに合わせてください`,
    });
  }

  for (const app of objects.filter((item) => (
    ['SoftwareApplication', 'WebApplication'].includes(item['@type'])
  ))) {
    if (!String(app.name || '').trim()) {
      findings.push({
        severity: 'error',
        path: pagePath,
        code: 'software_missing_name',
        message: 'SoftwareApplication/WebApplicationにnameがありません',
      });
    }

    // 以下2項目はページのindex可否ではなく、Googleのソフトウェアアプリ表示を
    // 狙う場合の補助条件としてwarningに留める。レビュー/評価を捏造して補完しない。
    if (!hasOfferPrice(app.offers)) {
      findings.push({
        severity: 'warning',
        path: pagePath,
        code: 'software_missing_offer_price',
        message: 'SoftwareApplication/WebApplicationに価格情報がありません',
      });
    }

    if (app.applicationCategory && !GOOGLE_SOFTWARE_CATEGORIES.has(app.applicationCategory)) {
      findings.push({
        severity: 'warning',
        path: pagePath,
        code: 'software_nonstandard_google_category',
        message: `Googleのソフトウェアアプリ例にないapplicationCategoryです: ${app.applicationCategory}`,
      });
    }
  }

  return findings;
}

function auditPage(url) {
  const findings = [];
  const filePath = resolvePageFile(url);

  if (!filePath) {
    return {
      url: url.href,
      path: url.pathname,
      filePath: null,
      title: '',
      description: '',
      canonical: '',
      ogTitle: '',
      ogDescription: '',
      ogUrl: '',
      ogImage: '',
      twitterCard: '',
      alternates: [],
      jsonLdCount: 0,
      findings: [{
        severity: 'error',
        path: url.pathname,
        code: 'missing_html',
        message: 'サイトマップURLに対応するHTMLが見つかりません',
      }],
    };
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const title = extractTitle(html);
  const description = extractMeta(html, 'description');
  const canonical = extractCanonical(html);
  const robots = extractMeta(html, 'robots').toLowerCase();
  const viewport = extractMeta(html, 'viewport');
  const lang = extractHtmlLang(html);
  const ogTitle = extractMeta(html, 'og:title', 'property');
  const ogType = extractMeta(html, 'og:type', 'property');
  const ogDescription = extractMeta(html, 'og:description', 'property');
  const ogUrl = extractMeta(html, 'og:url', 'property');
  const ogImage = extractMeta(html, 'og:image', 'property');
  const twitterCard = extractMeta(html, 'twitter:card');
  const alternates = extractAlternates(html);
  const jsonLd = parseJsonLd(html, url.pathname);

  findings.push(...jsonLd.findings);
  findings.push(...auditStructuredData(jsonLd.objects, url.pathname, ogType));

  const required = [
    ['missing_title', title, 'titleがありません'],
    ['missing_description', description, 'meta descriptionがありません'],
    ['missing_canonical', canonical, 'canonicalがありません'],
    ['missing_lang', lang, 'html要素にlang属性がありません'],
    ['missing_viewport', viewport, 'viewportがありません'],
    ['missing_og_title', ogTitle, 'og:titleがありません'],
    ['missing_og_description', ogDescription, 'og:descriptionがありません'],
    ['missing_og_url', ogUrl, 'og:urlがありません'],
    ['missing_og_image', ogImage, 'og:imageがありません'],
    ['missing_twitter_card', twitterCard, 'twitter:cardがありません'],
  ];

  for (const [code, value, message] of required) {
    if (!value) findings.push({ severity: 'error', path: url.pathname, code, message });
  }

  if (/\bnoindex\b/.test(robots)) {
    findings.push({
      severity: 'error',
      path: url.pathname,
      code: 'sitemap_noindex',
      message: 'サイトマップ掲載ページがnoindexです',
    });
  }

  if (canonical && normalizeUrl(canonical) !== normalizeUrl(url.href)) {
    findings.push({
      severity: 'error',
      path: url.pathname,
      code: 'canonical_mismatch',
      message: `canonicalが自己URLと一致しません: ${canonical}`,
    });
  }

  if (ogUrl && canonical && normalizeUrl(ogUrl) !== normalizeUrl(canonical)) {
    findings.push({
      severity: 'error',
      path: url.pathname,
      code: 'og_url_mismatch',
      message: `og:urlがcanonicalと一致しません: ${ogUrl}`,
    });
  }

  if (description && title && description === title) {
    findings.push({
      severity: 'warning',
      path: url.pathname,
      code: 'description_equals_title',
      message: 'meta descriptionがtitleと同一です',
    });
  }

  return {
    url: url.href,
    path: url.pathname,
    filePath: path.relative(repositoryRoot, filePath).replaceAll('\\', '/'),
    title,
    description,
    canonical,
    ogTitle,
    ogType,
    ogDescription,
    ogUrl,
    ogImage,
    twitterCard,
    alternates,
    jsonLdCount: jsonLd.count,
    findings,
  };
}

function walkPublicHtmlSources(directory, output = []) {
  if (!fs.existsSync(directory)) return output;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (!shouldCopyPublicEntry(entryPath)) continue;

    if (entry.isDirectory()) {
      walkPublicHtmlSources(entryPath, output);
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.html') {
      output.push(entryPath);
    }
  }

  return output;
}

function collectPublicHtmlSources() {
  const files = [];

  for (const entry of PUBLIC_ROOT_FILES) {
    if (!entry.toLowerCase().endsWith('.html')) continue;
    const filePath = path.join(repositoryRoot, entry);
    if (fs.existsSync(filePath)) files.push(filePath);
  }

  for (const directory of PUBLIC_DIRECTORIES) {
    walkPublicHtmlSources(path.join(repositoryRoot, directory), files);
  }

  return [...new Set(files)];
}

function repositoryHtmlPathToUrl(filePath) {
  const relative = path.relative(repositoryRoot, filePath).replaceAll('\\', '/');

  if (relative === 'index.html') return `${SITE_ORIGIN}/`;
  if (relative.endsWith('/index.html')) {
    return `${SITE_ORIGIN}/${relative.slice(0, -'index.html'.length)}`;
  }
  return `${SITE_ORIGIN}/${relative}`;
}

function auditPublicSitemapCoverage(sitemapUrls) {
  const findings = [];
  const sitemapSet = new Set(sitemapUrls.map((url) => normalizeUrl(url.href)));
  const publicHtmlFiles = collectPublicHtmlSources();

  for (const filePath of publicHtmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(repositoryRoot, filePath).replaceAll('\\', '/');
    const robots = extractMeta(html, 'robots').toLowerCase();

    if (/\bnoindex\b/.test(robots)) continue;

    const pageUrl = normalizeUrl(repositoryHtmlPathToUrl(filePath));
    const canonical = extractCanonical(html);

    if (!canonical) {
      findings.push({
        severity: 'error',
        path: relativePath,
        code: 'public_indexable_missing_canonical',
        message: '本番公開されるindex可能HTMLにcanonicalがありません',
      });
      continue;
    }

    const canonicalUrl = normalizeUrl(canonical);
    const isLocalCanonical = canonicalUrl === `${SITE_ORIGIN}/` || canonicalUrl.startsWith(`${SITE_ORIGIN}/`);
    if (!isLocalCanonical) continue;

    // 別URLへcanonicalする重複ページは、その正規URL側だけをsitemapへ載せる。
    if (canonicalUrl !== pageUrl) continue;

    if (!sitemapSet.has(canonicalUrl)) {
      findings.push({
        severity: 'error',
        path: relativePath,
        code: 'public_indexable_missing_from_sitemap',
        message: `本番公開・index可能な自己canonicalページがroot sitemapにありません: ${canonicalUrl}`,
      });
    }
  }

  return { checked: publicHtmlFiles.length, findings };
}

function findDuplicates(pages, field, code, label) {
  const groups = new Map();

  for (const page of pages) {
    const value = String(page[field] || '').trim();
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(page.path);
  }

  return [...groups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([value, paths]) => ({
      severity: 'error',
      path: paths.join(', '),
      code,
      message: `${label}が重複しています: "${value}"`,
    }));
}

function auditSeoMetadata() {
  // PikaLabは独立したSEO運用対象のため、この監査ではKatakataLab本体の
  // root sitemapだけを正本とする。PlayPointの外部サイトも対象外。
  const urls = extractSitemapUrls('sitemap.xml');
  const pages = urls.map((url) => auditPage(url));
  const findings = pages.flatMap((page) => page.findings);
  const coverage = auditPublicSitemapCoverage(urls);
  findings.push(...coverage.findings);

  findings.push(...findDuplicates(pages, 'title', 'duplicate_title', 'title'));
  findings.push(...findDuplicates(pages, 'description', 'duplicate_description', 'meta description'));

  const pagesByUrl = new Map(pages.map((page) => [normalizeUrl(page.url), page]));

  for (const page of pages) {
    if (!page.alternates || page.alternates.length === 0) continue;

    const seenLanguages = new Set();
    let hasSelfReference = false;

    for (const alternate of page.alternates) {
      if (seenLanguages.has(alternate.hreflang)) {
        findings.push({
          severity: 'error',
          path: page.path,
          code: 'duplicate_hreflang',
          message: `hreflang="${alternate.hreflang}" が重複しています`,
        });
      }
      seenLanguages.add(alternate.hreflang);

      const targetUrl = normalizeUrl(alternate.href);
      if (targetUrl === normalizeUrl(page.url)) hasSelfReference = true;

      const isLocalTarget = targetUrl === `${SITE_ORIGIN}/` || targetUrl.startsWith(`${SITE_ORIGIN}/`);
      if (!isLocalTarget) continue;

      const targetPage = pagesByUrl.get(targetUrl);
      if (!targetPage) {
        findings.push({
          severity: 'error',
          path: page.path,
          code: 'hreflang_target_not_in_sitemap',
          message: `hreflang="${alternate.hreflang}" のリンク先がroot sitemapにありません: ${alternate.href}`,
        });
        continue;
      }

      const reciprocal = (targetPage.alternates || []).some(
        (candidate) => normalizeUrl(candidate.href) === normalizeUrl(page.url),
      );
      if (!reciprocal) {
        findings.push({
          severity: 'error',
          path: page.path,
          code: 'hreflang_not_reciprocal',
          message: `hreflangリンク先から相互参照されていません: ${alternate.href}`,
        });
      }
    }

    if (!hasSelfReference) {
      findings.push({
        severity: 'error',
        path: page.path,
        code: 'hreflang_missing_self',
        message: 'hreflangを使うページは自分自身の言語版も列挙してください',
      });
    }
  }

  return {
    checked: pages.length,
    publicHtmlChecked: coverage.checked,
    pages,
    errors: findings.filter((finding) => finding.severity === 'error'),
    warnings: findings.filter((finding) => finding.severity === 'warning'),
  };
}

function printReport(report) {
  console.log(
    `SEO metadata audit: root URLs=${report.checked}, public HTML=${report.publicHtmlChecked}, errors=${report.errors.length}, warnings=${report.warnings.length}`,
  );

  for (const finding of [...report.errors, ...report.warnings]) {
    console.log(`[${finding.severity.toUpperCase()}] ${finding.code} ${finding.path}: ${finding.message}`);
  }
}

if (require.main === module) {
  const report = auditSeoMetadata();
  printReport(report);
  if (report.errors.length > 0) process.exitCode = 1;
}

module.exports = {
  auditSeoMetadata,
  auditPage,
  auditPublicSitemapCoverage,
  auditStructuredData,
  collectPublicHtmlSources,
  extractAlternates,
  extractCanonical,
  extractMeta,
  extractTitle,
  flattenJsonLd,
  hasOfferPrice,
  normalizeUrl,
  parseJsonLd,
  repositoryHtmlPathToUrl,
  resolvePageFile,
  urlToRepositoryPath,
};

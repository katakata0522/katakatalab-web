const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifyReleaseReadyPrivacy } = require('../../scripts/verify-releaseready-privacy.cjs');
const { isEducationPage, findTrackingSignals, auditEducationFiles } = require('../../scripts/education-no-tracking.cjs');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const outputRoot = path.join(repositoryRoot, 'public-build');
const GA4_MEASUREMENT_ID = 'G-FYFPS7L9X9';
const ANALYTICS_SCRIPT_PATH = '/analytics.js';
const ANALYTICS_SCRIPT_TAG = `    <script defer src="${ANALYTICS_SCRIPT_PATH}"></script>\n`;

const PUBLIC_ROOT_FILES = Object.freeze([
  '.htaccess', '.user.ini', '404.html', 'about-katakatalab.html', 'ads.txt',
  'ambition.html', 'analytics.js', 'education-sw-privacy.js', 'contact.html', 'favicon.ico', 'favicon.svg', 'gear.html', 'icon.svg',
  'index.html', 'icon-192.png', 'icon-512.png', 'manifest.json', 'note-selection.html', 'offline.html', 'ogp.png', 'project-filter-state.js', 'project-history.js',
  'ogp.svg', 'pikalab_screenshot.jpg', 'privacy.html', 'projects.json', 'robots.txt',
  'pwa-runtime.js', 'script.js', 'sitemap.html', 'sitemap.xml', 'style.css', 'sw.js', 'terms.html', 'tool-chrome.css',
  'updates.html', 'who-is-katakata.html',
]);

const PUBLIC_DIRECTORIES = Object.freeze([
  'aspect-ratio-calc', 'chiritsumo-calc', 'moyamoya-sorter', 'discount-calc', 'doujin-calc', 'emphasis-lines', 'en', 'font-lab', 'guides',
  'international', 'ogp-simulator', 'password-generator', 'privacy', 'px-rem-converter', 'screenshot-crop',
  'lab-tools/gravity-todo', 'lab-tools/kids-smile-land', 'qrcode', 'seireki', 'text-diff',
]);

const RETIRED_PUBLIC_DIRECTORIES = Object.freeze([
  'lab-tools/side-fire-dashboard',
  'lab-tools/rakuten-sim',
  'lab-tools/sub-health',
  'lab-tools/kindle-tracker',
  'lab-tools/doujin-shi-calculator',
  'lab-tools/savings-game-fire',
]);

// これらはソース管理用または審査対象外であり、本番ルートへ含めない
const FORBIDDEN_PUBLIC_ENTRIES = Object.freeze([
  '.git', '.github', '_archive', 'docs', 'tests', 'scripts', 'scratch', 'temp-artifacts',
  'IT_Book_Vol1_Basics', 'CLI_AUTO', 'dist_lite', 'liverepo', 'liverepo-pages',
  'site-hub', 'himitsukichi', 'kakata-game-playground', 'kirarin-play-park',
  'okatanoEdit', 'tool-wc-v1', 'usagi-app', 'zukai',
]);

const FORBIDDEN_NESTED_DIRECTORIES = new Set(['.git', '.github', 'node_modules', 'tests', 'test-results', 'production', 'coverage']);

function normalizeRepositoryPath(filePath) {
  if (typeof filePath !== 'string') throw new TypeError('公開対象パスは文字列で指定してください');
  return filePath.trim().replaceAll('\\', '/').replace(/^\.\/+/, '').replace(/\/{2,}/g, '/').replace(/\/$/, '');
}

function isPublicRootSourcePath(filePath) {
  const normalized = normalizeRepositoryPath(filePath);
  if (!normalized) return false;
  if (PUBLIC_ROOT_FILES.includes(normalized)) return true;
  return PUBLIC_DIRECTORIES.some((directory) => normalized === directory || normalized.startsWith(`${directory}/`));
}

function isForbiddenNestedFile(name) {
  return name.endsWith('.md')
    || name === 'story.html'
    || name === 'package.json'
    || name === 'package-lock.json'
    || /^tests_report.*\.txt$/i.test(name)
    || /\.test\.(?:js|mjs|cjs|ts)$/i.test(name)
    || /^(?:vite|tailwind|playwright)\.config\./i.test(name);
}

function assertSafeSource(sourcePath, entry) {
  const resolved = path.resolve(sourcePath);
  const relative = path.relative(repositoryRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`公開対象がリポジトリ外を指しています: ${entry}`);
  }
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink()) throw new Error(`シンボリックリンクは公開できません: ${entry}`);
}

function copyEntry(entry) {
  const sourcePath = path.join(repositoryRoot, entry);
  const destinationPath = path.join(outputRoot, entry);
  if (!fs.existsSync(sourcePath)) throw new Error(`公開対象が見つかりません: ${entry}`);
  assertSafeSource(sourcePath, entry);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.cpSync(sourcePath, destinationPath, {
    recursive: true,
    dereference: false,
    filter: shouldCopyPublicEntry,
  });
}

// 通常の資産には追加statを行わず、除外候補だけ種別を確認する。
// 同名のディレクトリやリンクをファイルと誤認しない（従来のpruneと同じ規則）。
function shouldCopyPublicEntry(sourcePath) {
  const name = path.basename(sourcePath);
  const excludedDirectory = FORBIDDEN_NESTED_DIRECTORIES.has(name);
  const excludedFile = isForbiddenNestedFile(name);
  if (!excludedDirectory && !excludedFile) return true;
  const stat = fs.lstatSync(sourcePath);
  return !(stat.isDirectory() && excludedDirectory) && !(stat.isFile() && excludedFile);
}

function validateOutput() {
  for (const entry of FORBIDDEN_PUBLIC_ENTRIES) {
    if (fs.existsSync(path.join(outputRoot, entry))) {
      throw new Error(`公開禁止の項目が混入しました: ${entry}`);
    }
  }
  if (fs.existsSync(path.join(outputRoot, 'pikalab'))) {
    throw new Error('PikaLabは専用ビルドで公開するため、ルート成果物へ含めません');
  }
  for (const entry of RETIRED_PUBLIC_DIRECTORIES) {
    if (fs.existsSync(path.join(outputRoot, entry))) {
      throw new Error(`公開終了コンテンツが混入しました: ${entry}`);
    }
  }
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

function stripLegacyAnalytics(html) {
  let next = String(html);

  next = next.replace(
    new RegExp(
      `<script\\b[^>]*\\bsrc=["']https://www\\.googletagmanager\\.com/gtag/js\\?id=${GA4_MEASUREMENT_ID}["'][^>]*>\\s*</script>\\s*`,
      'gi',
    ),
    '',
  );

  next = next.replace(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (scriptTag, body) => {
    if (body.includes(GA4_MEASUREMENT_ID) && /(?:dataLayer|gtag\s*\()/i.test(body)) return '';
    return scriptTag;
  });

  return next;
}

function ensureAnalyticsCoverage(publicRoot = outputRoot) {
  const htmlFiles = walkFiles(publicRoot).filter((filePath) => path.extname(filePath).toLowerCase() === '.html');
  let injected = 0;
  let existing = 0;
  let legacyRemoved = 0;

  for (const filePath of htmlFiles) {
    const originalHtml = fs.readFileSync(filePath, 'utf8');
    const relative = path.relative(publicRoot, filePath).replaceAll('\\', '/');
    if (isEducationPage(relative)) {
      const forbidden = findTrackingSignals(originalHtml);
      if (forbidden.length) throw new Error(`教育ページに広告・解析コードが混入しました: ${relative}: ${forbidden.join('、')}`);
      continue;
    }
    let html = stripLegacyAnalytics(originalHtml);
    if (html !== originalHtml) legacyRemoved += 1;

    const sharedLoaderPattern = /<script\b[^>]*\bsrc=["']\/analytics\.js["'][^>]*>/gi;
    const existingLoaders = html.match(sharedLoaderPattern) || [];

    if (existingLoaders.length > 1) {
      throw new Error(`Analytics共通ローダーが重複しています: ${path.relative(publicRoot, filePath).replaceAll('\\', '/')}`);
    }

    if (existingLoaders.length === 1) {
      existing += 1;
    } else {
      if (!/<\/head>/i.test(html)) {
        const relative = path.relative(publicRoot, filePath).replaceAll('\\', '/');
        throw new Error(`GA4ローダーを注入できません（head終了タグなし）: ${relative}`);
      }
      html = html.replace(/<\/head>/i, `${ANALYTICS_SCRIPT_TAG}</head>`);
      injected += 1;
    }

    // Analytics must never hold up the offline tool's deferred application scripts.
    if (/^(?:index\.html|(?:discount-calc|screenshot-crop|qrcode|emphasis-lines|password-generator|lab-tools\/gravity-todo)\/.*\.html)$/.test(path.relative(publicRoot, filePath).replaceAll('\\', '/'))) {
      // フォント配信の停滞もアプリのdefer/module実行を止めない。
      html = html.replace(/<link\b[^>]*>/gi, tag => {
        if (!/href=["']https:\/\/fonts\.googleapis\.com\//i.test(tag) || !/rel=["']stylesheet["']/i.test(tag)) return tag;
        return tag.replace(/\s*\/?\>$/, ' media="print" onload="this.media=\'all\'">');
      });
      html = html.replace(/<script\b[^>]*\bsrc=["']\/analytics\.js["'][^>]*><\/script>/gi,
        '<script async src="/analytics.js"></script>');
    }
    if (html !== originalHtml) fs.writeFileSync(filePath, html, 'utf8');
  }

  return { checked: htmlFiles.length, injected, existing, legacyRemoved };
}

function validateAnalyticsCoverage(publicRoot = outputRoot) {
  const findings = [];

  for (const filePath of walkFiles(publicRoot).filter((candidate) => path.extname(candidate).toLowerCase() === '.html')) {
    const html = fs.readFileSync(filePath, 'utf8');
    const relative = path.relative(publicRoot, filePath).replaceAll('\\', '/');
    const loaderCount = (html.match(/<script\b[^>]*\bsrc=["']\/analytics\.js["'][^>]*>/gi) || []).length;

    if (isEducationPage(relative)) {
      if (loaderCount !== 0) findings.push(`${relative}: educational page must not load analytics.js`);
      const forbidden = findTrackingSignals(html);
      if (forbidden.length) findings.push(`${relative}: ${forbidden.join('、')}`);
    } else if (loaderCount !== 1) {
      findings.push(`${relative}: analytics.js count=${loaderCount}`);
    }
    if (html.includes(GA4_MEASUREMENT_ID)) findings.push(`${relative}: legacy GA4 snippet remains`);
  }

  if (findings.length > 0) {
    throw new Error(`Analytics公開成果物の統一に失敗しました: ${findings.join(', ')}`);
  }
}
function assertLocalReferenceExists(publicRoot, sourceFile, reference, baseHref = '', existingAssets) {
  const trimmed = String(reference || '').trim();
  if (!trimmed || trimmed.startsWith('#') || /^(?:data:|blob:|mailto:|tel:|javascript:|https?:|\/\/)/i.test(trimmed)) return;

  const sourceRelative = path.relative(publicRoot, sourceFile).replaceAll('\\', '/');
  const sourceUrl = new URL(sourceRelative, 'https://katakatalab.local/');
  let resolvedUrl;
  try {
    const documentBase = baseHref ? new URL(baseHref, sourceUrl) : sourceUrl;
    resolvedUrl = new URL(trimmed, documentBase);
  } catch {
    throw new Error(`不正なローカル資産URLです: ${sourceRelative} -> ${trimmed}`);
  }
  if (resolvedUrl.origin !== 'https://katakatalab.local') return;

  let pathname;
  try {
    pathname = decodeURIComponent(resolvedUrl.pathname).replace(/^\/+/, '');
  } catch {
    throw new Error(`URLエンコードを解釈できません: ${sourceRelative} -> ${trimmed}`);
  }
  const candidate = path.resolve(publicRoot, pathname || 'index.html');
  const relativeCandidate = path.relative(publicRoot, candidate);
  if (relativeCandidate === '..' || relativeCandidate.startsWith(`..${path.sep}`) || path.isAbsolute(relativeCandidate)) {
    throw new Error(`公開ルート外の資産を参照しています: ${sourceRelative} -> ${trimmed}`);
  }
  if (existingAssets?.has(candidate)) return;
  if (!fs.existsSync(candidate)) {
    throw new Error(`公開資産が見つかりません: ${sourceRelative} -> ${trimmed}`);
  }
  existingAssets?.add(candidate);
}

function validatePublicAssets(publicRoot = outputRoot) {
  // この検査中だけ共有する。次回の検査で削除・更新された資産を見逃さない。
  const existingAssets = new Set();
  for (const filePath of walkFiles(publicRoot)) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.html') {
      const html = fs.readFileSync(filePath, 'utf8');
      const baseHref = html.match(/<base\b[^>]*\bhref=["']([^"']+)["']/i)?.[1] ?? '';
      const references = [];
      for (const match of html.matchAll(/<(?:script|img|source|video|audio|iframe)\b[^>]*\b(?:src|poster)=["']([^"']+)["']/gi)) references.push(match[1]);
      for (const match of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)) references.push(match[1]);
      for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
        for (const candidate of match[1].split(',')) references.push(candidate.trim().split(/\s+/)[0]);
      }
      for (const reference of references) assertLocalReferenceExists(publicRoot, filePath, reference, baseHref, existingAssets);
    }
    if (extension === '.css') {
      const css = fs.readFileSync(filePath, 'utf8');
      for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s][^)]*))\s*\)/gi)) {
        assertLocalReferenceExists(publicRoot, filePath, match[1] ?? match[2] ?? match[3], '', existingAssets);
      }
    }
  }
}


// Derive the installed shell's revision from the exact public bytes, including
// injected HTML. App-only changes therefore always produce a new worker.
function stampScreenshotCropWorker(publicRoot = outputRoot) {
  const appRoot = path.resolve(publicRoot, 'screenshot-crop');
  const workerPath = path.join(appRoot, 'sw.js');
  const worker = fs.readFileSync(workerPath, 'utf8');
  const assetsBlock = worker.match(/const CORE_ASSETS = \[([\s\S]*?)\];/);
  if (!assetsBlock) throw new Error('スクショ端カットのプリキャッシュ一覧がありません');
  const hash = crypto.createHash('sha256');
  hash.update(worker.replace(/const STATIC_CACHE = '[^']+';/, "const STATIC_CACHE = '';"));
  for (const match of assetsBlock[1].matchAll(/'([^']+)'/g)) {
    const asset = match[1] === './' ? './index.html' : match[1];
    const resolved = path.resolve(appRoot, asset);
    if (!resolved.startsWith(appRoot + path.sep)) throw new Error('PWA資産がscope外です');
    hash.update(asset);
    hash.update(fs.readFileSync(resolved));
  }
  const revision = hash.digest('hex').slice(0, 20);
  fs.writeFileSync(workerPath, worker.replace(
    /const STATIC_CACHE = '[^']+';/,
    `const STATIC_CACHE = 'screenshot-crop-static-${revision}';`
  ));
  return revision;
}


// 必須資産と共通ランタイムの最終配信バイトから各PWAの更新版を作る。
const RUNTIME_WORKERS = [["sw.js","CACHE_NAME","CACHE_PREFIX","ASSETS"],["qrcode/sw.js","STATIC_CACHE","CACHE_PREFIX","STATIC_ASSETS"],["emphasis-lines/sw.js","CACHE_NAME","CACHE_PREFIX","ASSETS_TO_CACHE"],["password-generator/sw.js","CACHE_NAME","CACHE_PREFIX","ASSETS"],["lab-tools/gravity-todo/sw.js","APP_SHELL_CACHE","APP_SHELL_CACHE_PREFIX","APP_SHELL_URLS"],["lab-tools/kids-smile-land/service-worker.js","CACHE_NAME","CACHE_PREFIX","ASSETS"]];
function stampRuntimeWorkers(publicRoot = outputRoot) {
  const runtime = fs.readFileSync(path.join(publicRoot, 'pwa-runtime.js'));
  const educationPrivacy = fs.readFileSync(path.join(publicRoot, 'education-sw-privacy.js'));
  return RUNTIME_WORKERS.map(([file, name, prefixName, list]) => {
    const workerPath = path.join(publicRoot, file);
    const worker = fs.readFileSync(workerPath, 'utf8');
    const namePattern = new RegExp('const ' + name + ' = [^;]+;');
    const prefix = worker.match(new RegExp("const " + prefixName + " = ['\"]([^'\"]+)['\"];"))?.[1];
    const assets = worker.match(new RegExp('const ' + list + ' = \\[([\\s\\S]*?)\\];'))?.[1];
    if (!prefix || !assets || !namePattern.test(worker)) throw new Error(file + ': PWA定義がありません');
    const hash = crypto.createHash('sha256');
    hash.update(worker.replace(namePattern, 'const ' + name + " = '';"));
    hash.update(runtime);
    if (isEducationPage(file)) hash.update(educationPrivacy);
    for (const match of assets.matchAll(/['"]([^'"]+)['"]/g)) {
      const url = new URL(match[1], 'https://katakatalab.local/' + path.posix.dirname(file) + '/');
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') + (url.pathname.endsWith('/') ? 'index.html' : '');
      const assetPath = path.resolve(publicRoot, relative);
      if (!assetPath.startsWith(path.resolve(publicRoot) + path.sep)) throw new Error('PWA資産が公開ルート外です');
      hash.update(relative);
      hash.update(fs.readFileSync(assetPath));
    }
    const cacheName = prefix + hash.digest('hex').slice(0, 20);
    fs.writeFileSync(workerPath, worker.replace(namePattern, 'const ' + name + ' = ' + JSON.stringify(cacheName) + ';'));
    return { file, cacheName };
  });
}

function buildPublicRoot() {
  if (fs.existsSync(outputRoot)) fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  [...PUBLIC_ROOT_FILES, ...PUBLIC_DIRECTORIES].forEach(copyEntry);
  // 英語ページはレビュー済みのチェックイン済みHTMLを正本として、そのまま公開成果物へコピーする。
  // ビルド時の再生成で確認済みUIや文言を古いテンプレートへ巻き戻さない。
  validateOutput();
  const analyticsCoverage = ensureAnalyticsCoverage(outputRoot);
  validateAnalyticsCoverage(outputRoot);
  validatePublicAssets(outputRoot);
  stampScreenshotCropWorker(outputRoot);
  stampRuntimeWorkers(outputRoot);
  const educationAudit = auditEducationFiles({ requireRootBuild: true });
  if (educationAudit.errors.length) throw new Error(educationAudit.errors.join('\n'));
  // コピー・解析ローダー挿入後の最終成果物で公開必須ページを確認する。
  verifyReleaseReadyPrivacy(outputRoot);
  console.log(`公開成果物を作成しました: files=${PUBLIC_ROOT_FILES.length}, directories=${PUBLIC_DIRECTORIES.length}, analytics=${analyticsCoverage.checked}, injected=${analyticsCoverage.injected}, existing=${analyticsCoverage.existing}, legacyRemoved=${analyticsCoverage.legacyRemoved}`);
}

if (require.main === module) buildPublicRoot();

module.exports = {
  PUBLIC_ROOT_FILES,
  PUBLIC_DIRECTORIES,
  RETIRED_PUBLIC_DIRECTORIES,
  FORBIDDEN_PUBLIC_ENTRIES,
  ANALYTICS_SCRIPT_PATH,
  GA4_MEASUREMENT_ID,
  buildPublicRoot,
  ensureAnalyticsCoverage,
  isForbiddenNestedFile,
  isPublicRootSourcePath,
  normalizeRepositoryPath,
  stripLegacyAnalytics,
  stampScreenshotCropWorker,
  stampRuntimeWorkers,
  validateAnalyticsCoverage,
  validatePublicAssets,
  shouldCopyPublicEntry,
};

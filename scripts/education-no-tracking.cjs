'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repositoryRoot = path.resolve(__dirname, '..');
const EDUCATION_ROOTS = Object.freeze([
  '/pikalab',
  '/lab-tools/kids-smile-land',
]);
// Other educational projects remain in the private operations repository.
const EDUCATION_EXTRA_PAGES = new Set();
const SKIP_DIRECTORIES = new Set([
  '.git', 'node_modules', 'dist', 'tests', '__tests__',
  'test-results', 'coverage', 'visual-guard-artifacts', '.pikalab-baseline', '_archive',
]);
const RUNTIME_EXTENSIONS = new Set(['.html', '.htm', '.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx', '.css', '.svg', '.json', '.webmanifest']);
const FORBIDDEN_SIGNALS = Object.freeze([
  {
    name: '広告配信',
    pattern: /\badsbygoogle\b|\bca-pub-\d+\b|(?:googlesyndication|doubleclick|googletagservices|googleadservices)\.(?:com|net)|google\.com\/pagead\//i,
  },
  {
    name: '外部アクセス解析',
    pattern: /(?:googletagmanager|google-analytics|analytics\.google|clarity\.ms|hotjar\.com|connect\.facebook\.net|cdn\.segment\.com|cdn\.amplitude\.com|plausible\.io\/js\/|umami\.is\/script)\b/i,
  },
  {
    name: 'KatakataLab共通アクセス解析',
    pattern: /(?:["'=(\s]|^)(?:(?:https?:\/\/[^/\s"'<>]+\/)|(?:\.\.\/|\.\/|\/)*)analytics\.js(?:[?#"'\s<)]|$)|\bKatakataAnalytics\b/i,
  },
  {
    name: '解析イベント送信',
    pattern: /\b(?:gtag\s*\(\s*['"](?:js|config|event)|(?:window\.)?dataLayer\s*[=.\[]|navigator\.sendBeacon\s*\()/i,
  },
]);

function normalizePagePath(relativePath) {
  let normalized = String(relativePath || '').replaceAll('\\', '/').split(/[?#]/, 1)[0];
  try { normalized = decodeURIComponent(normalized); } catch { /* 不正なURLは通常のパスとして判定する */ }
  normalized = normalized.replace(/^\.?\/+/, '').replace(/\/{2,}/g, '/');
  return new URL(`/${normalized.replace(/^\/+/, '')}`, 'https://education.invalid').pathname.toLowerCase();
}

function isEducationPage(relativePath) {
  const pathname = normalizePagePath(relativePath);
  return EDUCATION_EXTRA_PAGES.has(pathname)
    || EDUCATION_ROOTS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function findTrackingSignals(content) {
  return FORBIDDEN_SIGNALS
    .filter(({ pattern }) => pattern.test(content))
    .map(({ name }) => name);
}

function walkRuntimeFiles(directory, excludedScriptRoot = '', build = false) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`監査対象にシンボリックリンクが混入: ${fullPath}`);
    if (entry.isDirectory()) {
      if (build || (!SKIP_DIRECTORIES.has(entry.name) && fullPath !== excludedScriptRoot)) {
        files.push(...walkRuntimeFiles(fullPath, excludedScriptRoot, build));
      }
    } else if (entry.isFile() && RUNTIME_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      if (!build && /^package(?:-lock)?\.json$/.test(entry.name)) continue;
      if (build || !/\.(?:test|spec)\.(?:js|cjs|mjs|ts|tsx|jsx)$/i.test(entry.name)) files.push(fullPath);
    }
  }
  return files;
}

function auditDormantAffiliateCard(root) {
  const catalogFile = path.join(root, 'pikalab', 'js', 'app-data.json');
  if (!fs.existsSync(catalogFile)) return [];
  const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  const entries = Array.isArray(catalog.apps) ? catalog.apps : [];
  if (!entries.some((app) => app?.isAmazonCard || (Array.isArray(app?.amazonLinks) && app.amazonLinks.length))) return [];

  const constantsFile = path.join(root, 'pikalab', 'js', 'constants.js');
  const rendererFile = path.join(root, 'pikalab', 'js', 'apps.js');
  if (!fs.existsSync(constantsFile) || !fs.existsSync(rendererFile)) {
    return ['PikaLab: 非公開の紹介カードに表示制御の必須ファイルがありません'];
  }
  const constants = fs.readFileSync(constantsFile, 'utf8');
  const renderer = fs.readFileSync(rendererFile, 'utf8');
  const errors = [];
  if (!/^export const SHOW_AMAZON_ASSOCIATE_CARD\s*=\s*false\s*;/m.test(constants)) {
    errors.push('PikaLab: 広告なし方針によりAmazon紹介カードは常に非表示としてください');
  }
  if (!/if\s*\(app\.isAmazonCard\)\s*return\s+SHOW_AMAZON_ASSOCIATE_CARD\s*;/.test(renderer)) {
    errors.push('PikaLab: Amazon紹介カードを表示前に除外する処理がありません');
  }
  return errors;
}

function auditEducationFiles(options = {}) {
  const root = options.root || repositoryRoot;
  const targets = [
    path.join(root, 'pikalab'),
    path.join(root, 'lab-tools', 'kids-smile-land'),
  ];
  const rootBuild = path.join(root, 'public-build', 'lab-tools', 'kids-smile-land');
  const pikalabBuild = path.join(root, 'pikalab', 'dist');
  if (options.requireRootBuild || fs.existsSync(path.join(root, 'public-build'))) {
    // 現在公開中の入口を必須にし、将来allowlistへ入る教育ページも全体から拾う。
    targets.push(rootBuild);
    const publicRoot = path.join(root, 'public-build');
    if (fs.existsSync(publicRoot)) {
      targets.push(...walkRuntimeFiles(publicRoot, '', true)
        .filter(file => isEducationPage(path.relative(publicRoot, file))));
    }
  }
  if (options.requirePikalabBuild || fs.existsSync(pikalabBuild)) targets.push(pikalabBuild);

  let checkedFiles = 0;
  const errors = [];
  const checked = new Set();
  for (const target of targets) {
    if (!fs.existsSync(target)) {
      errors.push(`${path.relative(root, target)}: 必須監査対象がありません`);
      continue;
    }
    if (fs.lstatSync(target).isSymbolicLink()) {
      errors.push(`${path.relative(root, target)}: シンボリックリンクは監査できません`);
      continue;
    }
    const build = target.startsWith(path.join(root, 'public-build') + path.sep)
      || target === pikalabBuild || target.startsWith(pikalabBuild + path.sep);
    if (fs.statSync(target).isDirectory() && !fs.existsSync(path.join(target, 'index.html'))) {
      errors.push(`${path.relative(root, target)}: 必須のindex.htmlがありません`);
    }
    const files = fs.statSync(target).isDirectory()
      ? walkRuntimeFiles(target, path.join(root, 'pikalab', 'scripts'), build)
      : [target];
    if (files.length === 0) {
      errors.push(`${path.relative(root, target)}: 監査対象の配信ファイルがありません`);
      continue;
    }
    for (const filePath of files) {
      if (checked.has(filePath)) continue;
      if (fs.lstatSync(filePath).isSymbolicLink()) {
        errors.push(`${path.relative(root, filePath)}: 共有資産のシンボリックリンクは監査できません`);
        continue;
      }
      checked.add(filePath);
      checkedFiles += 1;
      const content = fs.readFileSync(filePath, 'utf8');
      let matches = findTrackingSignals(content);
      // 旧ストーリーの共通UIには、存在しないproject-shareボタン専用の任意計測フックがある。
      // ローダー・初期化・送信は含まない既知blobだけ許容し、共通UI変更時は再レビューを要求する。
      if (filePath === path.join(root, 'script.js') || filePath === path.join(root, 'public-build', 'script.js')) {
        const bytes = fs.readFileSync(filePath);
        const blob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
        if (blob === '3856b5447f15393a228ef427d46452d63aafb312') matches = matches.filter(name => name !== 'KatakataLab共通アクセス解析');
      }
      // TypeScript内蔵lib.domの説明文にあるsendBeacon例だけを、レビュー済みの完全一致blobに限定する。
      // ライブラリへ実行コードが追加された場合はhashが変わり、この例外を適用しない。
      if (filePath.endsWith(`${path.sep}code-studio${path.sep}assets${path.sep}ts.worker-B0J26iPs.js`)
        || filePath.endsWith(`${path.sep}.code-studio${path.sep}assets${path.sep}ts.worker-B0J26iPs.js`)) {
        const bytes = fs.readFileSync(filePath);
        const blob = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
        if (blob === '265427f9ec6773d50878785bf73baf38d2f96ca0') matches = matches.filter(name => name !== '解析イベント送信');
      }
      if (matches.length > 0) {
        errors.push(`${path.relative(root, filePath).replaceAll('\\', '/')}: ${matches.join('、')}`);
      }
      // 教育領域外にある共通スクリプトを読み込む場合も、参照先をたどって監査する。
      const references = [
        ...content.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi),
        ...content.matchAll(/\b(?:importScripts|import)\s*\(\s*["']([^"']+)["']/g),
        ...content.matchAll(/\b(?:import|export)\b[^;\n]*?\bfrom\s*["']([^"']+)["']/g),
        ...content.matchAll(/\bimport\s*["']([^"']+)["']/g),
      ];
      const publicRoot = path.join(root, 'public-build');
      const inPikaBuild = filePath.startsWith(pikalabBuild + path.sep);
      const servedRoot = build ? (inPikaBuild ? pikalabBuild : publicRoot) : root;
      const mount = inPikaBuild ? 'pikalab/' : '';
      const page = new URL(mount + path.relative(servedRoot, filePath).replaceAll('\\', '/'), 'https://katakatalab.com/');
      for (const reference of references) {
        const url = new URL(reference[1], page);
        if (url.origin !== page.origin || !/\.(?:js|mjs|cjs)$/.test(url.pathname)) continue;
        const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        const dependency = inPikaBuild && relative.startsWith('pikalab/')
          ? path.join(pikalabBuild, relative.slice('pikalab/'.length))
          : path.join(build ? publicRoot : root, relative);
        if (fs.existsSync(dependency) && !checked.has(dependency) && !files.includes(dependency)) files.push(dependency);
      }
    }
  }
  errors.push(...auditDormantAffiliateCard(root));
  return { checkedFiles, errors };
}

if (require.main === module) {
  const requireRootBuild = process.argv.includes('--root-build');
  const requirePikalabBuild = process.argv.includes('--pikalab-build');
  const report = auditEducationFiles({ requireRootBuild, requirePikalabBuild });
  console.log(`Education no-ads/no-analytics: checked=${report.checkedFiles}, errors=${report.errors.length}`);
  for (const error of report.errors) console.error(`[ERROR] ${error}`);
  if (report.errors.length > 0) process.exitCode = 1;
}

module.exports = {
  EDUCATION_ROOTS,
  auditDormantAffiliateCard,
  auditEducationFiles,
  findTrackingSignals,
  isEducationPage,
  normalizePagePath,
};

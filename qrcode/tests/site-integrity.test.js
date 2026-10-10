'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function getI18nFromScript(script) {
  const anchor = script.indexOf('const I18N =');
  assert.notEqual(anchor, -1, 'script.js から I18N 宣言を検出できません');
  const open = script.indexOf('{', anchor);
  assert.notEqual(open, -1, 'script.js から I18N 開始位置を検出できません');
  let depth = 0;
  let end = -1;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = open; i < script.length; i += 1) {
    const ch = script[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }
    if (ch === '"' || ch === '\'' || ch === '`') {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.notEqual(end, -1, 'script.js から I18N 終端位置を検出できません');
  const literal = script.slice(open, end + 1);
  const context = {};
  vm.runInNewContext(`result = ${literal};`, context);
  return context.result;
}

function collectMessageKeys(node, prefix = '') {
  const keys = new Set();
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return keys;
  }
  Object.entries(node).forEach(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectMessageKeys(value, next).forEach((nested) => keys.add(nested));
      return;
    }
    if (typeof value === 'string') {
      keys.add(next);
    }
  });
  return keys;
}

function collectHtmlI18nKeys(html) {
  const keys = new Set();
  const attrs = [
    'data-i18n',
    'data-i18n-html',
    'data-i18n-placeholder',
    'data-i18n-title',
    'data-i18n-aria-label',
    'data-i18n-option'
  ];
  attrs.forEach((attr) => {
    const regex = new RegExp(`${attr}=\"([^\"]+)\"`, 'g');
    for (const match of html.matchAll(regex)) {
      keys.add(match[1]);
    }
  });
  return keys;
}

test('index.html は現行タイトルと canonical / manifest / PWA スクリプトを含む', () => {
  const html = read('index.html');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
  assert.match(title, /QR(?:コード| Maker Lab)/i);
  assert.match(title, /KatakataLab/);
  assert.match(html, /<link rel="canonical" href="https:\/\/katakatalab\.com\/qrcode\/">/);
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<link rel="icon" href="assets\/icon-192\.png" type="image\/png">/);
  assert.match(html, /<link rel="stylesheet" href="style\.css\?v=[^"]+">/);
  assert.match(html, /<script src="js\/pwa\.js" defer><\/script>/);
  assert.match(html, /<script src="js\/pro-config\.js" defer><\/script>/);
  assert.match(html, /<script src="vendor\/qrious\.min\.js" defer><\/script>/);
  assert.match(html, /<script src="script\.js\?v=[^"]+" defer><\/script>/);
});

test('index.html はフッターに利用規約/プライバシーポリシーリンクを含む', () => {
  const html = read('index.html');
  assert.match(html, /class="(?:site-footer|tool-footer)(?:\s[^"]*)?"/);
  assert.match(html, /href="terms\.html"/);
  assert.match(html, /href="privacy\.html"/);
  assert.match(html, /href="\.\.\/contact\.html"/);
  assert.match(html, /href="guides\.html"/);
  assert.match(html, /href="pro-plan\.html"/);
  assert.match(html, /<script src="js\/details-ui\.js" defer><\/script>/);
});

test('index.html は詳細設定UIを含む', () => {
  const html = read('index.html');
  assert.match(html, /class="settings-sidebar"/);
  assert.match(html, /id="openSidebarBtn"/);
  assert.match(html, /id="closeSidebarBtn"/);
  assert.match(html, /id="sidebarBackdrop"/);
  assert.match(html, /<details class="advanced-settings"/);
  assert.match(html, /id="dataType"/);
  assert.match(html, /class="quick-template-buttons"/);
  assert.match(html, /data-quick-template="plain"/);
  assert.match(html, /data-quick-template="wifi"/);
  assert.match(html, /data-quick-template="mailto"/);
  assert.match(html, /data-quick-template="social"/);
  assert.match(html, /data-quick-template="vcard"/);
  assert.match(html, /data-quick-template="line"/);
  assert.match(html, /id="templateHint"/);
  assert.match(html, /id="templateErrorMsg"/);
  assert.match(html, /id="eccLevel"/);
  assert.match(html, /id="qrPadding"/);
  assert.match(html, /id="qrForeground" value="#111827"/);
  assert.match(html, /class="color-swatches"/);
  assert.match(html, /data-color-value="#d11a2a"/);
  assert.match(html, /id="exportFormat"/);
  assert.match(html, /id="filePrefix"/);
  assert.match(html, /id="socialPlatform"/);
  assert.match(html, /id="bulkCsvText"/);
  assert.match(html, /for="bulkCsvFile"/);
  assert.match(html, /for="bulkCsvText"/);
  assert.match(html, /id="scannerToggleBtn"/);
  assert.match(html, /id="planPro"/);
  assert.match(html, /id="logoFile"/);
  assert.match(html, /id="qualityGrade"/);
  assert.match(html, /id="savePresetBtn"/);
  assert.match(html, /id="bulkZipBtn"/);
  assert.match(html, /id="mobileTemplateBtn"/);
  assert.match(html, /id="mobileSettingsBtn"/);
  assert.match(html, /id="mobileDownloadBtn"/);
  assert.match(html, /class="template-optional-fields"/);
  assert.match(html, /class="[^"]*pro-feature-tag/);
  assert.match(html, /class="preset-manage"/);
});

test('index.html は日本語/英語タブ切替UIを含む', () => {
  const html = read('index.html');
  assert.match(html, /id="langJaBtn"/);
  assert.match(html, /id="langEnBtn"/);
  assert.match(html, /data-lang-block="ja"/);
  assert.match(html, /data-lang-block="en"/);
});

test('index.html の i18n キーは ja/en 辞書に存在する', () => {
  const html = read('index.html');
  const script = read('script.js');
  const i18n = getI18nFromScript(script);
  const htmlKeys = collectHtmlI18nKeys(html);
  const jaKeys = collectMessageKeys(i18n.ja);
  const enKeys = collectMessageKeys(i18n.en);
  const missingInJa = Array.from(htmlKeys).filter((key) => !jaKeys.has(key)).sort();
  const missingInEn = Array.from(htmlKeys).filter((key) => !enKeys.has(key)).sort();
  assert.deepEqual(missingInJa, []);
  assert.deepEqual(missingInEn, []);
});

test('index.html は外部CDNの qrious に依存しない', () => {
  const html = read('index.html');
  assert.equal(html.includes('cdnjs.cloudflare.com/ajax/libs/qrious'), false);
});

test('index.html は広告枠と計測スクリプトを含まない', () => {
  const html = read('index.html');
  assert.equal(html.includes('Sponsored Link'), false);
  assert.equal(html.includes('googletagmanager.com'), false);
  assert.equal(html.includes('google-analytics.com'), false);
  assert.equal(html.includes('gtag('), false);
});

test('index.html は送信ポリシーを事実ベースで記載している', () => {
  const html = read('index.html');
  assert.match(html, /QR作成データ/);
  assert.match(html, /ライセンス検証時のみ、ライセンスキーと利用ドメイン/);
  assert.match(html, /QR作成データは送信されません。なお、Proライセンス検証時のみ/);
});

test('script.js は厳格モードと初期化防御を持つ', () => {
  const script = read('script.js');
  assert.match(script, /'use strict';/);
  assert.match(script, /required elements are missing/);
  assert.match(script, /typeof window\.QRious !== 'function'/);
  assert.match(script, /showCriticalError/);
  assert.match(script, /buildTemplateValue/);
  assert.match(script, /applyDataType/);
  assert.match(script, /normalizeDataType/);
  assert.match(script, /syncQuickTemplateButtons/);
  assert.match(script, /resolveDataTypeFromLocation/);
  assert.match(script, /updateDataTypeInLocation/);
  assert.match(script, /updateTemplateHint/);
  assert.match(script, /validateTemplateInput/);
  assert.match(script, /getTemplateValidation/);
  assert.match(script, /isLikelyEmail/);
  assert.match(script, /validationMailInvalid/);
  assert.match(script, /syncWifiAuthInputState/);
  assert.match(script, /MIME_BY_FORMAT/);
  assert.match(script, /parseBulkCsv/);
  assert.match(script, /downloadBulkQr/);
  assert.match(script, /startScanner/);
  assert.match(script, /buildSocialUrl/);
  assert.match(script, /openSidebar/);
  assert.match(script, /closeSidebar/);
  assert.match(script, /focusTemplateField/);
  assert.match(script, /syncMobileDownloadState/);
  assert.match(script, /observeDownloadButtonState/);
  assert.match(script, /openGenerateOptionsPanel/);
  assert.match(script, /sidebar-open/);
  assert.match(script, /const I18N =/);
  assert.match(script, /setLanguage/);
  assert.match(script, /setPlan/);
  assert.match(script, /applyLicense/);
  assert.match(script, /verifyLicenseWithApi/);
  assert.match(script, /reconcileStoredLicense/);
  assert.match(script, /loadOptionalScript/);
  assert.match(script, /ensureJsPdfLoaded/);
  assert.match(script, /ensureJsZipLoaded/);
  assert.match(script, /updateQualityReport/);
  assert.match(script, /downloadBulkZip/);
  assert.match(script, /isUnresolvedI18n/);
  assert.match(script, /observeDownloadButtonState/);
  assert.match(script, /data-i18n/);
  assert.match(script, /MIN_RECOMMENDED_QUIET_ZONE_MODULES/);
  assert.match(script, /getQuietZoneMetrics/);
  assert.match(script, /qualityContrastUnknown/);
  assert.match(script, /licenseNotice/);
});

test('details-ui.js は開閉状態保存とFAQ一括開閉を実装している', () => {
  const detailsUi = read('js/details-ui.js');
  assert.match(detailsUi, /STORAGE_KEY/);
  assert.match(detailsUi, /details\[data-details-id\]/);
  assert.match(detailsUi, /localStorage/);
  assert.match(detailsUi, /data-faq-open-all/);
  assert.match(detailsUi, /data-faq-close-all/);
});

test('pwa.js は更新通知と再読み込み導線を実装している', () => {
  const pwa = read('js/pwa.js');
  assert.match(pwa, /showUpdatePrompt/);
  assert.match(pwa, /SKIP_WAITING/);
  assert.match(pwa, /controllerchange/);
  assert.match(pwa, /registration\.update/);
});

test('manifest は PWA 必須キーを含む', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'QR Maker Lab');
  assert.equal(manifest.short_name, 'QR Maker');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './index.html');
  assert.equal(manifest.scope, './');
  assert.equal(Array.isArray(manifest.icons), true);
  assert.equal(manifest.icons.length >= 2, true);
});

test('service worker は install/activate/fetch を実装', () => {
  const sw = read('sw.js') + '\n' + fs.readFileSync(path.join(ROOT, '..', 'pwa-runtime.js'), 'utf8');
  assert.match(sw, /self\.addEventListener\('install'/);
  assert.match(sw, /self\.addEventListener\('activate'/);
  assert.match(sw, /self\.addEventListener\('message'/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(sw, /self\.addEventListener\('fetch'/);
  assert.match(sw, /\.\/guides\.html/);
  assert.match(sw, /\.\/pro-plan\.html/);
  assert.match(sw, /\.\/guide-wifi\.html/);
  assert.match(sw, /\.\/guide-line\.html/);
  assert.match(sw, /\.\/guide-vcard\.html/);
  assert.match(sw, /\.\/guide-mail\.html/);
  assert.match(sw, /\.\/guide-social\.html/);
  assert.match(sw, /\.\/guide-print\.html/);
  assert.match(sw, /\.\/lp-restaurant\.html/);
  assert.match(sw, /\.\/lp-beauty\.html/);
  assert.match(sw, /\.\/lp-events\.html/);
  const html = read('index.html');
  const styleVersion = html.match(/href="style\.css\?v=([^"]+)"/)?.[1];
  const scriptVersion = html.match(/src="script\.js\?v=([^"]+)"/)?.[1];
  assert.ok(styleVersion && scriptVersion, '公開HTMLのCSS/JS cache-bust tokenが必要です');
  assert.ok(
    sw.includes('./style.css?v=' + styleVersion),
    'Service Workerは公開中のCSS tokenをprecacheしてください',
  );
  assert.ok(
    sw.includes('./script.js?v=' + scriptVersion),
    'Service Workerは公開中のJS tokenをprecacheしてください',
  );
  assert.match(sw, /\.\/content\.css/);
  assert.match(sw, /\.\/js\/details-ui\.js/);
  assert.match(sw, /\.\/terms\.html/);
  assert.match(sw, /\.\/privacy\.html/);
});

test('style.css は hidden テンプレートを非表示にする', () => {
  const style = read('style.css');
  assert.match(style, /\.template-group\[hidden\]/);
});



test('SEO 用 robots / sitemap は現行の公開方針と本番URLを指す', () => {
  const robots = read('robots.txt');
  const sitemap = read('sitemap.xml');
  assert.match(robots, /Sitemap: https:\/\/katakatalab\.com\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/katakatalab\.com\/qrcode\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/katakatalab\.com\/qrcode\/en\/<\/loc>/);
  assert.doesNotMatch(sitemap, /<loc>https:\/\/katakatalab\.com\/qrcode\/(?:guides|guide-|lp-|pro-plan|terms|privacy)/);
});

test('ルート sitemap はQR本体と規約系だけを公開導線として持つ', () => {
  const rootSitemap = fs.readFileSync(path.join(ROOT, '..', 'sitemap.xml'), 'utf8');
  assert.match(rootSitemap, /<loc>https:\/\/katakatalab\.com\/qrcode\/<\/loc>/);
  assert.match(rootSitemap, /<loc>https:\/\/katakatalab\.com\/qrcode\/terms\.html<\/loc>/);
  assert.match(rootSitemap, /<loc>https:\/\/katakatalab\.com\/qrcode\/privacy\.html<\/loc>/);
  assert.doesNotMatch(rootSitemap, /<loc>https:\/\/katakatalab\.com\/qrcode\/(?:guides|guide-|lp-|pro-plan)/);
});

test('PWA アイコンが存在する', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'assets/icon-192.png')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'assets/icon-512.png')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'ogp.png')), true);
});

test('SEO導線ページと共通スタイルが存在する', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'content.css')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'js/details-ui.js')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'guides.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'pro-plan.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'guide-wifi.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'guide-line.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'guide-vcard.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'guide-mail.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'guide-social.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'guide-print.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'lp-restaurant.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'lp-beauty.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'lp-events.html')), true);
});

test('E2Eテスト構成ファイルが存在する', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'package.json')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'playwright.config.js')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'tests/e2e/server.mjs')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'tests/e2e/qrcode-lab.spec.mjs')), true);
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts['test:e2e'], 'string');
  assert.equal(typeof pkg.scripts['check:prod'], 'string');
  assert.equal(typeof pkg.scripts['license:admin'], 'string');
});

test('pro-plan はFAQ一括開閉ボタンを持つ', () => {
  const pro = read('pro-plan.html');
  assert.match(pro, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(pro, /pagead2\.googlesyndication\.com|adsbygoogle/);
  assert.match(pro, /data-faq-controls/);
  assert.match(pro, /data-faq-open-all/);
  assert.match(pro, /data-faq-close-all/);
  assert.match(pro, /data-details-id="pro-faq-price"/);
  assert.match(pro, /data-details-id="pro-faq-resend"/);
  assert.match(pro, /<script src="js\/details-ui\.js" defer><\/script>/);
});

test('guides は人気テンプレート先頭にPro導線を配置している', () => {
  const guides = read('guides.html');
  assert.match(guides, /<h2>人気テンプレートガイド<\/h2>/);
  assert.match(guides, /guide-card-pro-spotlight/);
  assert.match(guides, /買い切り 2,980円/);
  assert.doesNotMatch(guides, /買い切り 3,980円/);
  assert.match(guides, /Proプラン詳細を見る/);
  assert.match(guides, /<h2>人気テンプレートガイド<\/h2>[\s\S]*guide-card-pro-spotlight[\s\S]*Wi-Fi共有QR/);
});

test('guides は業種別LP導線を持つ', () => {
  const guides = read('guides.html');
  assert.match(guides, /id="industry-lp"/);
  assert.match(guides, /lp-restaurant\.html/);
  assert.match(guides, /lp-beauty\.html/);
  assert.match(guides, /lp-events\.html/);
});

test('pro-plan は時短インパクト列とProバッジを表示する', () => {
  const pro = read('pro-plan.html');
  assert.match(pro, /<th>時短インパクト<\/th>/);
  assert.match(pro, /<span class="pro-chip">PRO<\/span>/);
});

test('ローカル同梱の qrious が存在する', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'vendor/qrious.min.js')), true);
});

test('pro-config が存在する', () => {
  const config = read('js/pro-config.js');
  assert.match(config, /strictVerification:\s*true/);
  assert.match(config, /allowLocalLicenseFallback:\s*false/);
});

test('Pro ライセンスはAPI未設定時にローカル判定で有効化しない', () => {
  const script = read('script.js');
  assert.match(script, /if \(!canUseLocalLicenseFallback\(\)\) \{/);
  assert.match(script, /return \{ valid: false, reason: 'unconfigured', source: 'none' \};/);
  assert.match(script, /valid:\s*VALID_LICENSE_PATTERN\.test\(licenseKey\)/);
});

test('ローカル同梱の Pro 用ライブラリが存在する', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'vendor/jszip.min.js')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'vendor/jspdf.umd.min.js')), true);
});

test('サードパーティ告知ファイルが存在する', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.txt')), true);
});











test('利用規約/プライバシーポリシーのページが存在する', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'terms.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'privacy.html')), true);
});

test('利用規約は運営者名と裁判管轄を明記している', () => {
  const terms = read('terms.html');
  assert.match(terms, /運営者名: かたかた/);
  assert.match(terms, /東京地方裁判所/);
  assert.match(terms, /href="\.\.\/contact\.html"/);
});

test('プライバシーポリシーは運営者名を明記している', () => {
  const policy = read('privacy.html');
  assert.match(policy, /運営者名: かたかた/);
  assert.match(policy, /href="\.\.\/contact\.html"/);
});

test('ガイドとProページのフッターに問い合わせ導線がある', () => {
  const guides = read('guides.html');
  const pro = read('pro-plan.html');
  assert.match(guides, /href="\.\.\/contact\.html"/);
  assert.match(pro, /href="\.\.\/contact\.html"/);
});

test('QRの公開ページは専用の利用規約とプライバシーポリシーへ到達できる', () => {
  const publicPages = [
    'index.html',
    'guides.html',
    'pro-plan.html',
    'guide-wifi.html',
    'guide-line.html',
    'guide-vcard.html',
    'guide-mail.html',
    'guide-social.html',
    'guide-print.html',
    'lp-restaurant.html',
    'lp-beauty.html',
    'lp-events.html',
  ];

  for (const relativePath of publicPages) {
    const html = read(relativePath);
    assert.match(html, /href="terms\.html"/, `${relativePath} に利用規約への導線がありません`);
    assert.match(html, /href="privacy\.html"/, `${relativePath} にプライバシーポリシーへの導線がありません`);
  }
});

test('ブランド名はトップと規約系ページで統一されている', () => {
  const index = read('index.html');
  const terms = read('terms.html');
  const policy = read('privacy.html');
  assert.match(index, /QR Maker Lab/);
  assert.match(terms, /QR Maker Lab/);
  assert.match(policy, /QR Maker Lab/);
  assert.equal(terms.includes('QR Forge Lab'), false);
  assert.equal(policy.includes('QR Forge Lab'), false);
});

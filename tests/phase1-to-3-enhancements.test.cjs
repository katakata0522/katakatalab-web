const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

const IT_BASICS_PAGES = [
  'api.html',
  'bug.html',
  'build.html',
  'cache.html',
  'cdn.html',
  'cloud.html',
  'commit.html',
  'cookie-storage.html',
  'cors.html',
  'database.html',
  'debug.html',
  'deploy.html',
  'dns.html',
  'domain.html',
  'encoding-newline.html',
  'endpoint.html',
  'env-vars.html',
  'git.html',
  'https.html',
  'json.html',
  'library-framework.html',
  'merge.html',
  'ogp.html',
  'pull-request.html',
  'responsive.html',
  'security.html',
  'senzogaeri.html',
  'server.html',
  'static-dynamic.html',
  'status-code.html',
];

const FORBIDDEN_INTERNAL_COPY = /AdSense審査対応|クローラー評価|noindex\s*解除|AdSenseプレースホルダー|SEO対策/;

test('px-rem-converter/clamp-math.js computes accurate responsive clamp() and scale tokens', () => {
  const clampMath = require('../px-rem-converter/clamp-math.js');
  const res = clampMath.buildClampExpression({
    minPx: 16,
    maxPx: 28,
    minVw: 375,
    maxVw: 1280,
    root: 16,
  });
  assert.ok(res, 'clamp result should be returned');
  assert.equal(res.minRem, 1);
  assert.equal(res.maxRem, 1.75);
  assert.match(res.css, /^clamp\(1rem, [\d.-]+rem \+ [\d.-]+vw, 1\.75rem\)$/);

  // Verify slope math directly: (28-16)/(1280-375)*100 = 12/905*100 ≈ 1.3260vw
  assert.ok(Math.abs(res.slopeVw - (12 / 905) * 100) < 0.0001);

  // Equal min/max produces flat clamp with zero slope
  const flat = clampMath.buildClampExpression({ minPx: 20, maxPx: 20, minVw: 375, maxVw: 1280, root: 16 });
  assert.equal(flat.slopeVw, 0);
  assert.equal(flat.css, 'clamp(1.25rem, 1.25rem, 1.25rem)');

  // Invalid inputs return null
  assert.equal(clampMath.buildClampExpression({ minPx: 16, maxPx: 28, minVw: 1280, maxVw: 375, root: 16 }), null);
  assert.equal(clampMath.buildClampExpression({ minPx: 16, maxPx: 28, minVw: 375, maxVw: 1280, root: 0 }), null);
  assert.equal(clampMath.buildClampExpression({ minPx: -4, maxPx: 28, minVw: 375, maxVw: 1280, root: 16 }), null);

  // Scale variables at root 16 and root 10
  const scale16 = clampMath.buildCssScaleVariables(16);
  assert.match(scale16, /--text-xs: 0\.75rem; \/\* 12px \*\//);
  assert.match(scale16, /--text-base: 1rem; \/\* 16px \*\//);
  assert.match(scale16, /--text-3xl: 2rem; \/\* 32px \*\//);

  const scale10 = clampMath.buildCssScaleVariables(10);
  assert.match(scale10, /--text-base: 1\.6rem; \/\* 16px \*\//);
});

test('text-diff/diff-engine.js normalizeForCompare ignores whitespace/CRLF when enabled', () => {
  const Diff = require('../text-diff/diff-engine.js');
  assert.equal(typeof Diff.normalizeForCompare, 'function');
  assert.equal(Diff.normalizeForCompare('a  b \r\nc\t\td  ', false), 'a  b \r\nc\t\td  ');
  assert.equal(Diff.normalizeForCompare('a  b \r\nc\t\td  ', true), 'a b\nc d');
  const changes = Diff.diffLines(
    Diff.normalizeForCompare('line 1  \r\nline   2', true),
    Diff.normalizeForCompare('line 1\nline 2', true)
  );
  assert.equal(changes.some((p) => p.added || p.removed), false);
});

test('aspect-ratio-calc includes 1.91:1 (OGP) detection and destination size presets', () => {
  const script = read('aspect-ratio-calc/script.js');
  const html = read('aspect-ratio-calc/index.html');
  assert.match(script, /1\.91:1 \(OGP\)/);
  assert.match(script, /1200 \/ 630/);
  assert.ok(html.includes('data-width="1200" data-height="630"'));
  assert.ok(html.includes('id="compareCurrentRect"'));
});

test('password-generator/pwd-logic.js generates CSPRNG passphrases with expected format and entropy', async () => {
  const modUrl = pathToFileURL(path.join(ROOT, 'password-generator/pwd-logic.js')).href;
  const { PasswordLogic } = await import(modUrl);
  const logic = new PasswordLogic();
  assert.ok(Array.isArray(logic.PASSPHRASE_WORDS));
  assert.equal(logic.PASSPHRASE_WORDS.length, 128);
  assert.equal(new Set(logic.PASSPHRASE_WORDS).size, 128);

  const list = logic.generatePassphrase({
    wordCount: 4,
    separator: '-',
    capitalize: true,
    appendNumber: true,
    count: 3,
  });
  assert.equal(list.length, 3);
  for (const item of list) {
    assert.match(item, /^[A-Z][a-z]+-[A-Z][a-z]+-[A-Z][a-z]+-[A-Z][a-z]+\d{2}$/);
  }
  assert.ok(logic.lastGeneratedEntropyBits > 30);

  const plain = logic.generatePassphrase({
    wordCount: 5,
    separator: '.',
    capitalize: false,
    appendNumber: false,
    count: 1,
  })[0];
  assert.match(plain, /^[a-z]+(\.[a-z]+){4}$/);
});

test('doujin-calc change-preparation table matches DoujinCalculator output exactly', async () => {
  const modUrl = pathToFileURL(path.join(ROOT, 'doujin-calc/js/calculator.js')).href;
  const { DoujinCalculator } = await import(modUrl);
  const html = read('doujin-calc/index.html');

  const expectedPrices = [500, 600, 700, 800, 900, 1000];
  for (const price of expectedPrices) {
    const pay = DoujinCalculator.paymentChange(price);
    const std = DoujinCalculator.calculateChange(price, 100, 'standard');
    const totalLabel = `${std.totalAmount.toLocaleString('en-US')}円`;
    assert.ok(
      html.includes(`>${std.bills1000Count}枚<`) &&
      html.includes(`>${std.coins500Count}枚<`) &&
      html.includes(`>${std.coins100Count}枚<`) &&
      html.includes(`>${totalLabel}<`),
      `doujin-calc table must match computed values for ${price}円 (change=${pay.change}, total=${totalLabel})`
    );
  }
});

test('homepage removes asobi-pocket/seo links and consolidates QR guide link', () => {
  const home = read('index.html');
  assert.equal(home.includes('asobi-pocket/seo'), false, 'index.html should not contain asobi-pocket/seo links');
  assert.equal(home.includes('qrcode/guides.html'), false, 'index.html should route QR guide to guides/qr-guide.html');
  assert.ok(home.includes('guides/qr-guide.html'), 'index.html should link to guides/qr-guide.html');

  const projects = read('projects.json');
  assert.ok(projects.includes('guides/qr-guide.html'));
});

test('duplicate guides have clear integration notice banners to canonical guides', () => {
  const qrOld = read('qrcode/guides.html');
  assert.ok(qrOld.includes('../guides/qr-guide.html'));
  const cssOld = read('guides/css-size-scale-guide.html');
  assert.ok(cssOld.includes('px-rem-guide.html'));
  const pwOld = read('guides/password-storage-guide.html');
  assert.ok(pwOld.includes('password-guide.html'));
});

test('Phase 1 enhancements: motion-atlas, updates.html, and SVG diagrams in core guides', () => {
  const motion = read('motion-atlas/index.html');
  assert.ok(motion.includes('data-verification-note'));
  assert.ok(motion.includes('prefers-reduced-motion'));

  const updates = read('updates.html');
  assert.match(updates, /<h2\b/);
  assert.ok(updates.includes('IT用語ノートを16語→30語へ拡張'));

  for (const guide of ['guides/aspect-ratio-guide.html', 'guides/px-rem-guide.html', 'guides/password-guide.html', 'guides/qr-guide.html']) {
    const html = read(guide);
    assert.match(html, /<svg\b/, `${guide} should include an inline SVG diagram`);
  }

  assert.ok(read('guides/case-studies.html').includes('screenshot-crop/'));
  assert.ok(read('guides/tool-selection-guide.html').includes('motion-atlas/'));
});

test('Phase 2 IT Basics dictionary has all 30 terms with inline SVG, JSON-LD, no ads, and sitemap coverage', () => {
  const sitemapXml = read('sitemap.xml');
  const sitemapHtml = read('sitemap.html');
  const itIndex = read('guides/it-basics/index.html');

  assert.equal(IT_BASICS_PAGES.length, 30);
  for (const page of IT_BASICS_PAGES) {
    const rel = `guides/it-basics/${page}`;
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} must exist`);
    const html = read(rel);
    assert.match(html, /<svg\b/, `${rel} must include an inline SVG diagram`);
    assert.ok(html.includes('"@type": "Article"') || html.includes('"@type":"Article"'), `${rel} must include Article JSON-LD`);
    assert.ok(html.includes('"@type": "BreadcrumbList"') || html.includes('"@type":"BreadcrumbList"'), `${rel} must include BreadcrumbList JSON-LD`);
    assert.equal(html.includes('pagead2.googlesyndication.com'), false, `${rel} must not load ad scripts`);
    assert.ok(html.includes('tool-link-banner'), `${rel} must link to related KatakataLab tool`);
    assert.ok(sitemapXml.includes(`https://katakatalab.com/${rel}`), `${rel} must be listed in sitemap.xml`);
    assert.ok(itIndex.includes(`href="${page}"`), `${rel} must be linked from guides/it-basics/index.html`);
    assert.equal(FORBIDDEN_INTERNAL_COPY.test(html), false, `${rel} must not contain internal review jargon`);
  }
  assert.ok(sitemapHtml.includes('IT用語30語'));
});

test('Follow-up enhancements: 5 synced EN tools, guide SVGs, secondary tool verification notes, and refreshed about page', () => {
  const aspectEn = read('aspect-ratio-calc/en/index.html');
  assert.ok(aspectEn.includes('data-width="1200" data-height="630"'));
  assert.ok(aspectEn.includes('id="compareCurrentRect"'));
  assert.equal(/\sstyle\s*=\s*["']/.test(aspectEn), false, 'aspect-ratio-calc/en/index.html should have no inline style= attributes');

  const diffEn = read('text-diff/en/index.html');
  assert.ok(diffEn.includes('id="ignoreWhitespace"'));
  assert.ok(diffEn.includes('id="sampleSelect"'));

  const ogpEn = read('ogp-simulator/en/index.html');
  assert.ok(ogpEn.includes('id="safeZoneToggle"'));

  const pxEn = read('px-rem-converter/en/index.html');
  assert.ok(pxEn.includes('id="clampSection"'));
  assert.ok(pxEn.includes('id="copyScaleBtn"'));
  assert.ok(pxEn.includes('clamp-math.js'));
  const clampMatch = pxEn.match(/<section[^>]*id="clampSection"[\s\S]*?<\/section>/);
  assert.ok(clampMatch, 'px-rem-converter/en/index.html should contain clampSection');
  assert.equal(/\sstyle\s*=\s*["']/.test(clampMatch[0]), false, 'clampSection should have no inline style= attributes');

  const fontEn = read('font-lab/en/index.html');
  assert.ok(fontEn.includes('class="pairing-preset-btn'));
  assert.ok(fontEn.includes('id="pairing-status"'));

  for (const guide of ['guides/playpoint-guide.html', 'guides/discount-guide.html']) {
    const html = read(guide);
    assert.match(html, /<svg\b/, `${guide} should include an inline SVG diagram`);
  }

  const seirekiHtml = read('seireki/index.html');
  assert.ok(seirekiHtml.includes('data-verification-note'));
  assert.ok(seirekiHtml.includes('平成31年'));
  assert.ok(seirekiHtml.includes('2018年3月'));
  assert.equal(/\sstyle\s*=\s*["']/.test(seirekiHtml), false, 'seireki/index.html should have no inline style= attributes');

  const chiritsumoHtml = read('chiritsumo-calc/index.html');
  assert.ok(chiritsumoHtml.includes('data-verification-note'));
  assert.ok(chiritsumoHtml.includes('16,715円'));
  assert.ok(chiritsumoHtml.includes('1,136,722円'));
  assert.ok(chiritsumoHtml.includes('2,595,543円'));

  const aboutHtml = read('about-katakatalab.html');
  assert.ok(aboutHtml.includes('motion-atlas/'));
  assert.ok(aboutHtml.includes('IT用語30語'));
});

test('no modified public pages contain forbidden internal review jargon', () => {
  const targets = [
    'index.html',
    'updates.html',
    'sitemap.html',
    'about-katakatalab.html',
    'motion-atlas/index.html',
    'aspect-ratio-calc/index.html',
    'aspect-ratio-calc/en/index.html',
    'text-diff/index.html',
    'text-diff/en/index.html',
    'ogp-simulator/index.html',
    'ogp-simulator/en/index.html',
    'px-rem-converter/index.html',
    'px-rem-converter/en/index.html',
    'font-lab/index.html',
    'font-lab/en/index.html',
    'password-generator/index.html',
    'screenshot-crop/index.html',
    'qrcode/index.html',
    'doujin-calc/index.html',
    'seireki/index.html',
    'chiritsumo-calc/index.html',
    'guides/qr-guide.html',
    'guides/aspect-ratio-guide.html',
    'guides/px-rem-guide.html',
    'guides/password-guide.html',
    'guides/playpoint-guide.html',
    'guides/discount-guide.html',
    'guides/case-studies.html',
    'guides/tool-selection-guide.html',
    'guides/it-basics/index.html',
  ];
  for (const rel of targets) {
    const html = read(rel);
    assert.equal(FORBIDDEN_INTERNAL_COPY.test(html), false, `${rel} contains forbidden internal copy`);
  }
});

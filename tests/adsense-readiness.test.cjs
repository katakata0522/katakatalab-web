const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  read: readFile,
  repositoryRoot: rootDir,
} = require('./helpers/repository.cjs');
const {
  extractEffectiveModifiedDate,
  sitemapLastmodForUrl,
} = require('./helpers/content-metadata.cjs');

test('独立した価値ページが6本そろっている', () => {
  const requiredPages = [
    'guides/aspect-ratio-guide.html',
    'guides/px-rem-guide.html',
    'guides/password-guide.html',
    'guides/sns-image-size-guide.html',
    'guides/css-size-scale-guide.html',
    'guides/password-storage-guide.html',
  ];

  for (const relativePath of requiredPages) {
    assert.equal(fs.existsSync(path.join(rootDir, relativePath)), true, `${relativePath} が必要です`);
  }
});



test('トップは静的作品棚と補足導線を操作可能な形でまとめる', () => {
  const html = readFile('index.html');
  const css = readFile('style.css');
  const script = readFile('script.js');

  assert.match(html, /href="style\.css\?v=[0-9A-Za-z._-]+"/);
  assert.match(html, /src="script\.js\?v=[0-9A-Za-z._-]+"/);
  assert.match(html, /class="projects-grid"/);
  assert.match(html, /data-project-card="static"/);
  assert.match(html, /id="secondary-projects-grid"/);
  assert.match(html, /data-shelf="learning"/);
  assert.match(html, /data-shelf="tool"/);
  assert.match(html, /data-shelf="story"/);
  assert.match(html, /data-guide="guides\/aspect-ratio-guide\.html"/);
  assert.match(html, /data-guide="guides\/password-guide\.html"/);
  assert.match(html, /class="btn btn-secondary modal-guide-link modal-action-link"/);
  assert.match(html, /使い方・Q&amp;A/);
  assert.match(html, /開発秘話/);
  assert.match(css, /scroll-margin-top:\s*calc\(var\(--header-height\) \+ 1rem\)/);
  assert.match(script, /const modal/);
  assert.match(script, /const modalClose/);
  assert.match(script, /const modalMainLink/);
  assert.match(script, /const modalStoryLink/);
  assert.match(script, /readStaticProjects/);
  assert.doesNotMatch(script, /grid\.innerHTML\s*=\s*`[\s\S]*データの読み込みに失敗しました/);
});

test('トップのSEO情報は作品世界に一致し過剰なFAQマークアップを使わない', () => {
  const html = readFile('index.html');
  const sitemapXml = readFile('sitemap.xml');

  assert.match(html, /<meta property="og:site_name" content="KatakataLab">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/katakatalab\.com\/">/);

  const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? '';
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';
  const twitterTitle = html.match(/<meta[^>]+name="twitter:title"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';
  const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';
  const twitterDescription = html.match(/<meta[^>]+name="twitter:description"[^>]+content="([^"]+)"/i)?.[1]?.trim() ?? '';

  assert.ok(pageTitle, 'トップのtitleが必要です');
  assert.equal(ogTitle, pageTitle, 'og:titleを現行titleと同期してください');
  assert.equal(twitterTitle, pageTitle, 'twitter:titleを現行titleと同期してください');
  assert.equal(twitterDescription, ogDescription, 'SNS説明文を同じ公開説明へ同期してください');
  assert.match(ogDescription, /主要ツールの基本機能は登録不要ですぐ試せます。/);
  assert.match(html, /"alternateName":\s*"かたかたラボ"/);
  assert.doesNotMatch(html, /"@type":\s*"FAQPage"/);
  assert.match(html, /よくある質問\(FAQ\)/);
  sitemapLastmodForUrl(sitemapXml, 'https://katakatalab.com/');
});

test('トップの共通UIはクラスで管理しダミーリンクを残さない', () => {
  const html = readFile('index.html');
  const css = readFile('style.css');
  const script = readFile('script.js');

  assert.doesNotMatch(html, /class="projects-subhead"[^>]*style=/);
  assert.doesNotMatch(html, /class="about-card home-narrow-card"[^>]*style=/);
  assert.doesNotMatch(html, /class="modal-actions"[^>]*style=/);
  assert.doesNotMatch(html, /class="(?:btn btn-primary modal-main-link|btn btn-secondary modal-story-link)"[^>]*style=/);
  assert.doesNotMatch(html, /href="#"/);
  assert.match(css, /\.lab-shelf/);
  assert.match(css, /\.lab-overview/);
  assert.match(css, /\.modal-action-link/);
  assert.match(script, /modalMainLink\.style\.display\s*=\s*'inline-flex'/);
  assert.match(script, /modalStoryLink\.style\.display\s*=\s*'inline-flex'/);
});



test('審査中に誤解を招くダミー広告枠が消えている', () => {
  const formalToolPages = [
    'aspect-ratio-calc/index.html',
    'px-rem-converter/index.html',
    'text-diff/index.html',
    'ogp-simulator/index.html',
    'discount-calc/index.html',
  ];

  for (const relativePath of formalToolPages) {
    assert.doesNotMatch(readFile(relativePath), /class="ad-placeholder"|Sponsored(?: Link)?/);
  }
});

test('主要ガイドに著者情報と更新日が見える', () => {
  const guideFiles = [
    'guides/aspect-ratio-guide.html',
    'guides/px-rem-guide.html',
    'guides/password-guide.html',
    'guides/sns-image-size-guide.html',
    'guides/css-size-scale-guide.html',
    'guides/password-storage-guide.html',
  ];

  for (const relativePath of guideFiles) {
    const html = readFile(relativePath);
    assert.match(html, /作成者[:：]\s*かたかた/);
    const dateMatch = html.match(/更新日[:：]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
    assert.ok(dateMatch, `${relativePath} に更新日が表示されていません`);

    const [, year, month, day] = dateMatch.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    assert.equal(date.getUTCFullYear(), year, `${relativePath} の更新年が不正です`);
    assert.equal(date.getUTCMonth() + 1, month, `${relativePath} の更新月が不正です`);
    assert.equal(date.getUTCDate(), day, `${relativePath} の更新日が不正です`);
  }
});

test('sitemap掲載ガイドとツールは現行の信頼導線を持つ', () => {
  const sitemapHtml = readFile('sitemap.html');
  const monetizedGuideFiles = [
    'guides/aspect-ratio-guide.html',
    'guides/px-rem-guide.html',
    'guides/password-guide.html',
  ];
  // SNS画像ガイドは英語版との多言語ペアとして検索公開するが、広告は載せない。
  const indexableAdFreeGuideFiles = [
    'guides/sns-image-size-guide.html',
  ];
  // 役割が補助的で内容が近いガイドはnoindexを維持する。
  const thinAuxGuideFiles = [
    'guides/css-size-scale-guide.html',
    'guides/password-storage-guide.html',
  ];
  const toolFiles = [
    'text-diff/index.html',
    'ogp-simulator/index.html',
    'discount-calc/index.html',
    'seireki/index.html',
    'emphasis-lines/index.html',
  ];

  for (const relativePath of monetizedGuideFiles) {
    const html = readFile(relativePath);
    assert.match(html, /adsbygoogle/);
    assert.match(sitemapHtml, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const relativePath of indexableAdFreeGuideFiles) {
    const html = readFile(relativePath);
    assert.doesNotMatch(html, /pagead2\.googlesyndication\.com|adsbygoogle/);
    assert.doesNotMatch(html, /noindex/i);
    assert.match(sitemapHtml, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const relativePath of thinAuxGuideFiles) {
    const html = readFile(relativePath);
    assert.doesNotMatch(html, /pagead2\.googlesyndication\.com|adsbygoogle/);
    assert.match(html, /noindex/i);
    assert.doesNotMatch(sitemapHtml, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const relativePath of toolFiles) {
    const canonicalPath = relativePath.replace(/index\.html$/, '');
    assert.match(sitemapHtml, new RegExp(canonicalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(readFile(relativePath), /contact\.html/);
  }
});

test('sitemapのlastmodはページの構造化更新日と矛盾しない', () => {
  const rootSitemap = readFile('sitemap.xml');
  const pages = [
    'guides/password-guide.html',
    'guides/px-rem-guide.html',
    'guides/case-studies.html',
    'guides/aspect-ratio-guide.html',
    'guides/tool-selection-guide.html',
    'guides/it-basics/git.html',
    'guides/it-basics/commit.html',
    'guides/it-basics/deploy.html',
    'guides/it-basics/bug.html',
    'guides/it-basics/debug.html',
  ];

  for (const relativePath of pages) {
    const html = readFile(relativePath);
    const modified = extractEffectiveModifiedDate(html, relativePath);
    const url = `https://katakatalab.com/${relativePath}`;
    assert.equal(
      sitemapLastmodForUrl(rootSitemap, url),
      modified,
      `${relativePath} の dateModified と sitemap lastmod を一致させてください`,
    );
  }
});

test('薄い補助ページは noindex かつメインsitemap外', () => {
  const sitemap = readFile('sitemap.xml');
  const thin = [
    ['lab-tools/gravity-todo/index.html', 'https://katakatalab.com/lab-tools/gravity-todo/'],
    ['lab-tools/kids-smile-land/index.html', 'https://katakatalab.com/lab-tools/kids-smile-land/'],
    ['qrcode/guide-wifi.html', 'https://katakatalab.com/qrcode/guide-wifi.html'],
    ['emphasis-lines/index.html', 'https://katakatalab.com/emphasis-lines/'],
  ];
  for (const [relativePath, canonical] of thin) {
    assert.match(readFile(relativePath), /noindex/i, `${relativePath} に noindex が必要です`);
    // 完全一致で判定（emphasis-lines/en/ を誤検出しない）
    assert.equal(
      sitemap.includes(`<loc>${canonical}</loc>`),
      false,
      `${canonical} をメインsitemapから外してください`
    );
  }
});

test('掲載済み小型ツールの既知不備を防ぐ', () => {
  const discountCss = readFile('discount-calc/style.css');
  const discountJs = readFile('discount-calc/script.js');
  const textDiffJs = readFile('text-diff/script.js');
  const ogpJs = readFile('ogp-simulator/script.js');
  const seirekiHtml = readFile('seireki/index.html');

  assert.match(discountCss, /\.calc-controls/);
  assert.match(discountCss, /\.discount-item/);
  assert.doesNotMatch(discountCss, /これまでのCSSはそのまま維持|Variables等省略/);
  assert.match(discountJs, /!navigator\.clipboard \|\| !navigator\.clipboard\.writeText/);
  assert.match(discountJs, /li\.tabIndex = 0;/);
  assert.match(textDiffJs, /typeof Diff === 'undefined'/);
  assert.match(ogpJs, /MAX_IMAGE_BYTES:\s*10 \* 1024 \* 1024/);
  assert.match(ogpJs, /file\.size > CONFIG\.MAX_IMAGE_BYTES/);
  const currentTokyoYear = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date())
  );
  const currentReiwaYear = currentTokyoYear - 2018;

  assert.doesNotMatch(seirekiHtml, /playpoint-sim\.com|href="#"/);
  assert.match(
    seirekiHtml,
    new RegExp(`${currentTokyoYear}年・令和${currentReiwaYear}年最新対応`),
    '西暦早見表の「最新対応」年は日本時間の現在年へ更新してください',
  );
});

test('掲載ツールの安全説明と操作性は実装内容に一致する', () => {
  const discountHtml = readFile('discount-calc/index.html');
  const textDiffHtml = readFile('text-diff/index.html');
  const ogpHtml = readFile('ogp-simulator/index.html');
  const ogpJs = readFile('ogp-simulator/script.js');
  const seirekiHtml = readFile('seireki/index.html');

  assert.doesNotMatch(discountHtml, /user-scalable=no|maximum-scale=1\.0/);
  assert.match(discountHtml, /id="price"[^>]*aria-label="商品価格"/);
  assert.doesNotMatch(discountHtml, /class="discount-item custom-row[^"]*" role="button"/);

  assert.doesNotMatch(textDiffHtml, /外部サーバーへの通信は発生しません/);
  assert.match(textDiffHtml, /入力した文章は比較処理のために外部送信しません/);

  assert.match(ogpHtml, /画像データを外部送信しない/);
  assert.match(ogpJs, /e\.target === els\.imageInput/);

  assert.doesNotMatch(seirekiHtml, /user-scalable=no|maximum-scale=1\.0/);
  assert.match(seirekiHtml, /今年迎える年齢/);
  assert.match(seirekiHtml, /id="inputYear"/);
  assert.doesNotMatch(seirekiHtml, /document\.write/);
  assert.match(seirekiHtml, /aria-live="polite"/);
});

test('追加コンテンツは具体性と更新責任を示す', () => {
  const snsGuide = readFile('guides/sns-image-size-guide.html');
  const aspectRatioGuide = readFile('guides/aspect-ratio-guide.html');
  const cssGuide = readFile('guides/css-size-scale-guide.html');
  const passwordGuide = readFile('guides/password-storage-guide.html');
  const emphasisIndex = readFile('emphasis-lines/index.html');
  const emphasisGuide = readFile('emphasis-lines/guide.html');
  const emphasisEnglish = readFile('emphasis-lines/en/index.html');
  const sitemapHtml = readFile('sitemap.html');

  assert.match(snsGuide, /aspect-ratio-guide\.html#ichiran-de-kireru/);
  assert.match(aspectRatioGuide, /1200\s*[×x]\s*630|1080\s*[×x]\s*1080/);
  assert.match(cssGuide, /--space-|--text-/);
  assert.match(passwordGuide, /二要素認証|多要素認証/);
  assert.match(passwordGuide, /復旧|リカバリー/);
  assert.doesNotMatch(emphasisIndex, /© 2025/);
  assert.doesNotMatch(emphasisGuide, /© 2025|完全無料。/);
  assert.match(emphasisGuide, /作成者[:：]\s*かたかた/);
  assert.match(emphasisGuide, /更新日[:：]\s*\d{4}年\d{1,2}月\d{1,2}日/);
  assert.match(emphasisIndex, /"url":\s*"https:\/\/katakatalab\.com\/emphasis-lines\/"/);
  assert.doesNotMatch(emphasisEnglish, /© 2025/);
  assert.match(emphasisEnglish, /contact\.html/);
  assert.doesNotMatch(sitemapHtml, /全ページ一覧/);
});

test('PikaLabはトップで見つけられるが実用ツールと区分されている', () => {
  const html = readFile('index.html');

  const pikalabIndex = html.indexOf('data-id="pikalab"');
  const qrIndex = html.indexOf('data-id="qrcode"');

  assert.ok(pikalabIndex >= 0, 'PikaLab をトップの作品棚に表示してください');
  assert.ok(qrIndex < pikalabIndex, '実用ツールをPikaLabより先に説明してください');
  assert.match(html, /実用ツールとは目的が違うものです/);
  assert.doesNotMatch(html, /ひみつきち|ゲーム遊び場|きらりん/);
});

test('トップにかたかた紹介の独立コンテンツがある', () => {
  const html = readFile('index.html');

  assert.match(html, /かたかたとは/);
  assert.match(html, /「好奇心は無限大∞」をモットーに、.*WebサイトやAndroidアプリの.*開発を行っています。/);
  assert.match(html, /KatakataLabを運営する.*個人クリエイター.*「かたかた」/);
  assert.match(html, /who-is-katakata\.html/);
});

test('主要QRガイドに著者情報と更新日が見える', () => {
  const guideFiles = [
    'qrcode/guide-wifi.html',
    'qrcode/guide-line.html',
    'qrcode/guide-vcard.html',
    'qrcode/guide-mail.html',
    'qrcode/guide-social.html',
    'qrcode/guide-print.html',
  ];

  for (const relativePath of guideFiles) {
    const html = readFile(relativePath);
    assert.match(html, /作成者[:：]\s*かたかた/);
    assert.match(html, /更新日[:：]\s*\d{4}年\d{1,2}月\d{1,2}日/);
  }
});

test('プライバシーポリシーが現行運用に沿った記述になっている', () => {
  const html = readFile('privacy.html');

  assert.doesNotMatch(html, /Amazonアソシエイト・プログラム/);
});

test('PikaLabのプライバシーポリシーも現行運用に沿った記述になっている', () => {
  const html = readFile('pikalab/privacy.html');

  assert.doesNotMatch(html, /Amazonアソシエイト・プログラム/);
});

test('PikaLabのAmazonカードは審査期間中は非表示設定になっている', () => {
  const constantsJs = readFile('pikalab/js/constants.js');
  const appsJs = readFile('pikalab/js/apps.js');

  assert.match(constantsJs, /export const SHOW_AMAZON_ASSOCIATE_CARD = false;/);
  assert.match(appsJs, /if \(app\.isAmazonCard\) return SHOW_AMAZON_ASSOCIATE_CARD;/);
  assert.match(appsJs, /if \(appId === 'amazon-bookshelf' && !SHOW_AMAZON_ASSOCIATE_CARD\) return false;/);
});



test('保留中のstory下書きは公開サーバーへの同期対象外である', () => {
  const publicBuildScript = readFile('.github/scripts/build-public-root.cjs');
  const homepage = readFile('index.html');
  const deferredStoryFiles = [
    'aspect-ratio-story.html',
    'minitools-story.html',
    'password-generator-story.html',
    'px-rem-story.html',
    'qrcode-story.html',
  ];

  for (const relativePath of deferredStoryFiles) {
    assert.doesNotMatch(publicBuildScript.match(/PUBLIC_ROOT_FILES[\s\S]*?\]\);/)[0], new RegExp(relativePath));
    assert.doesNotMatch(homepage, new RegExp(`data-story="${relativePath}"`));
  }
});



test('Katakata Font-Labの品質・SEO・信頼導線の検証', () => {
  const html = readFile('font-lab/index.html');
  const css = readFile('font-lab/style.css');
  const script = readFile('font-lab/script.js');

  // HTML存在確認とSEOマークアップ検証
  assert.match(html, /<title>[^<]*Katakata Font-Lab[^<]*<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/katakatalab\.com\/font-lab\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/katakatalab\.com\/font-lab\/">/);
  assert.match(html, /<meta property="og:type" content="website">/);
  assert.match(html, /href="\.\/style\.css\?v=[^"]+"/);
  assert.match(html, /src="\.\/script\.js\?v=[^"]+"/);

  // コンテンツの三本柱の検証
  assert.match(html, /id="preview-container"/); // シミュレータ
  assert.match(html, /Zen Maru Gothic/); // 見本市
  assert.match(html, /日本語Webフォントが重いのは昔の話？/); // コラム

  // フッターの信頼性導線の検証 (ダミーリンクがないこと)
  assert.match(html, /href="\.\.\/terms\.html"/);
  assert.match(html, /href="\.\.\/privacy\.html"/);
  assert.match(html, /href="\.\.\/contact\.html"/);
  assert.match(html, /href="\.\.\/sitemap\.html"/);
  assert.doesNotMatch(html, /href="#"/);

  // CSS & JS 整合性の軽度検証
  assert.match(css, /--primary/);
  assert.match(script, /document\.addEventListener\('DOMContentLoaded'/);
});


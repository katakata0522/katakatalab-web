const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  read,
  repositoryRoot,
} = require('./helpers/repository.cjs');
const { generateEnglishPages } = require('../scripts/generate-english-pages.cjs');

const englishPages = Object.freeze([
  {
    file: 'en/index.html',
    canonical: 'https://katakatalab.com/en/',
    type: 'CollectionPage',
  },
  {
    file: 'emphasis-lines/en/index.html',
    canonical: 'https://katakatalab.com/emphasis-lines/en/',
    japanese: 'https://katakatalab.com/emphasis-lines/',
    type: 'WebApplication',
    requiredIds: ['fileInput', 'lineCanvas', 'btnExportSVG'],
  },
  {
    file: 'font-lab/en/index.html',
    canonical: 'https://katakatalab.com/font-lab/en/',
    japanese: 'https://katakatalab.com/font-lab/',
    type: 'WebApplication',
    requiredIds: ['preview-title', 'select-font', 'output-css'],
  },
  {
    file: 'aspect-ratio-calc/en/index.html',
    canonical: 'https://katakatalab.com/aspect-ratio-calc/en/',
    japanese: 'https://katakatalab.com/aspect-ratio-calc/',
    type: 'WebApplication',
    requiredIds: ['ratioW', 'ratioH', 'previewBox'],
  },
  {
    file: 'px-rem-converter/en/index.html',
    canonical: 'https://katakatalab.com/px-rem-converter/en/',
    japanese: 'https://katakatalab.com/px-rem-converter/',
    type: 'WebApplication',
    requiredIds: ['rootBase', 'pxInput', 'remInput'],
  },
  {
    file: 'text-diff/en/index.html',
    canonical: 'https://katakatalab.com/text-diff/en/',
    japanese: 'https://katakatalab.com/text-diff/',
    type: 'WebApplication',
    requiredIds: ['textOriginal', 'textNew', 'compareBtn'],
  },
  {
    file: 'qrcode/en/index.html',
    canonical: 'https://katakatalab.com/qrcode/en/',
    japanese: 'https://katakatalab.com/qrcode/',
    type: 'WebApplication',
    requiredIds: ['qrText', 'qrCanvas', 'downloadBtn'],
  },
  {
    file: 'ogp-simulator/en/index.html',
    canonical: 'https://katakatalab.com/ogp-simulator/en/',
    japanese: 'https://katakatalab.com/ogp-simulator/',
    type: 'WebApplication',
    requiredIds: ['ogTitle', 'ogDesc', 'previewCanvas'],
  },
  {
    file: 'guides/en/social-image-sizes.html',
    canonical: 'https://katakatalab.com/guides/en/social-image-sizes.html',
    japanese: 'https://katakatalab.com/guides/sns-image-size-guide.html',
    type: 'Article',
  },
  {
    file: 'guides/en/password-security.html',
    canonical: 'https://katakatalab.com/guides/en/password-security.html',
    japanese: 'https://katakatalab.com/guides/password-guide.html',
    type: 'Article',
  },
]);

const japanesePairs = Object.freeze([
  ['emphasis-lines/index.html', 'https://katakatalab.com/emphasis-lines/en/'],
  ['font-lab/index.html', 'https://katakatalab.com/font-lab/en/'],
  ['aspect-ratio-calc/index.html', 'https://katakatalab.com/aspect-ratio-calc/en/'],
  ['px-rem-converter/index.html', 'https://katakatalab.com/px-rem-converter/en/'],
  ['text-diff/index.html', 'https://katakatalab.com/text-diff/en/'],
  ['qrcode/index.html', 'https://katakatalab.com/qrcode/en/'],
  ['ogp-simulator/index.html', 'https://katakatalab.com/ogp-simulator/en/'],
  ['guides/sns-image-size-guide.html', 'https://katakatalab.com/guides/en/social-image-sizes.html'],
  ['guides/password-guide.html', 'https://katakatalab.com/guides/en/password-security.html'],
]);

test('優先度A・Bの英語ページは独立URLと必要な判断材料を持つ', () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const page of englishPages) {
    const absolutePath = path.join(repositoryRoot, page.file);
    assert.equal(fs.existsSync(absolutePath), true, `${page.file} が必要です`);
    const html = read(page.file);
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();

    assert.match(html, /<html\s+lang="en"/i, `${page.file} は英語文書として宣言してください`);
    assert.ok(title && !titles.has(title), `${page.file} のtitleは固有にしてください`);
    assert.ok(description && !descriptions.has(description), `${page.file} のdescriptionは空欄や重複にしないでください`);
    assert.notEqual(description, title, `${page.file} のdescriptionをtitleの複製にしないでください`);
    assert.doesNotMatch(description, /TODO|TBD|Lorem ipsum/i, `${page.file} のdescriptionに未完成文言を残さないでください`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${page.file} のh1は1個にしてください`);
    assert.match(html, new RegExp(`"@type"\\s*:\\s*"${page.type}"`), `${page.file} に適切な構造化データが必要です`);
    assert.doesNotMatch(html, /adsbygoogle|pagead2\.googlesyndication\.com|data-ad-client=/i, `${page.file} は価値検証中のため広告なしにしてください`);

    if (page.japanese) {
      assert.match(html, new RegExp(`<link rel="alternate" hreflang="ja" href="${page.japanese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
      assert.match(html, new RegExp(`<link rel="alternate" hreflang="en" href="${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
      assert.match(html, new RegExp(`<link rel="alternate" hreflang="x-default" href="${page.japanese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    }

    for (const id of page.requiredIds || []) {
      assert.match(html, new RegExp(`id="${id}"`), `${page.file} に機能要素 #${id} が必要です`);
    }

    if ((page.requiredIds || []).length > 0) {
      assert.match(html, /id="english-guide-title"/i, `${page.file} に使い方の見出しが必要です`);
      assert.match(html, /Practical workflow/i, `${page.file} に実際の操作手順が必要です`);
      assert.match(html, /(?:Known )?Limitations/i, `${page.file} に制約・限界の説明が必要です`);
      assert.match(html, /Privacy and data handling/i, `${page.file} にデータ取扱いの説明が必要です`);
    }
    if (page.type === 'Article') {
      assert.match(html, /Sources and scope/i, `${page.file} に出典と適用範囲の説明が必要です`);
    }

    titles.add(title);
    descriptions.add(description);
  }
});

test('旧英語生成器はレビュー済み公開HTMLを上書きできない', () => {
  assert.throws(
    () => generateEnglishPages(repositoryRoot),
    /レビュー済み英語HTMLが正本/,
  );
});

test('日本語ページから英語版へ相互hreflangがつながっている', () => {
  for (const [file, englishUrl] of japanesePairs) {
    const html = read(file);
    assert.match(html, new RegExp(`<link rel="alternate" hreflang="en" href="${englishUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), `${file} に英語版hreflangが必要です`);
    assert.match(html, /<link rel="alternate" hreflang="ja" href="https:\/\/katakatalab\.com\//, `${file} に日本語版hreflangが必要です`);
    assert.match(html, /<link rel="alternate" hreflang="x-default" href="https:\/\/katakatalab\.com\//, `${file} にx-defaultが必要です`);
  }
});

test('日本語トップと英語ハブは相互hreflangで対応する', () => {
  const japaneseHome = read('index.html');
  const englishHub = read('en/index.html');

  assert.match(japaneseHome, /<link rel="alternate" hreflang="ja" href="https:\/\/katakatalab\.com\/">/);
  assert.match(japaneseHome, /<link rel="alternate" hreflang="en" href="https:\/\/katakatalab\.com\/en\/">/);
  assert.match(japaneseHome, /<link rel="alternate" hreflang="x-default" href="https:\/\/katakatalab\.com\/">/);
  assert.match(englishHub, /<link rel="alternate" hreflang="ja" href="https:\/\/katakatalab\.com\/">/);
  assert.match(englishHub, /<link rel="alternate" hreflang="en" href="https:\/\/katakatalab\.com\/en\/">/);
  assert.match(englishHub, /<link rel="alternate" hreflang="x-default" href="https:\/\/katakatalab\.com\/">/);
});

test('日本語トップから英語ハブへ人間が見つけられる導線がある', () => {
  const japaneseHome = read('index.html');
  assert.match(japaneseHome, /<a[^>]+href="(?:\.\/)?en\/"[^>]*hreflang="en"[^>]*>English tools<\/a>/i);
});

test('英語ハブ・サイトマップ・公開ビルドが英語ページ群を一体で扱う', () => {
  const hub = read('en/index.html');
  const sitemap = read('sitemap.xml');
  const sitemapHtml = read('sitemap.html');
  const buildScript = read('.github/scripts/build-public-root.cjs');

  for (const page of englishPages.slice(1)) {
    assert.match(hub, new RegExp(page.canonical.replace('https://katakatalab.com', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `英語ハブから ${page.canonical} へリンクしてください`);
  }

  // 十分な本文・操作説明・制約・データ取扱いを持つ英語ページは
  // 独立した検索入口としてroot sitemapへ載せる。
  // 強調線メーカー英語版だけは、日本語本体も審査用noindexのため現状維持する。
  const sitemapEnglish = englishPages.filter((page) => page.file !== 'emphasis-lines/en/index.html');
  for (const page of sitemapEnglish) {
    assert.match(sitemap, new RegExp(`<loc>${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`), `${page.canonical} をXMLサイトマップへ追加してください`);
    assert.doesNotMatch(read(page.file), /<meta\s+name=["']robots["'][^>]*noindex/i, `${page.file} を検索公開してください`);
  }

  const deferredEnglish = englishPages.find((page) => page.file === 'emphasis-lines/en/index.html');
  assert.ok(deferredEnglish);
  assert.doesNotMatch(
    sitemap,
    new RegExp(`<loc>${deferredEnglish.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`),
  );
  assert.match(read(deferredEnglish.file), /<meta\s+name=["']robots["'][^>]*noindex/i);
  assert.match(sitemapHtml, /href="en\/"/);
  assert.match(buildScript, /'en'/, '英語ハブを公開成果物へ含めてください');
  assert.doesNotMatch(buildScript, /generateEnglishPages|generate-english-pages/, '公開ビルドでレビュー済み英語HTMLを再生成しないでください');
});

test('英語ページは言語推測リダイレクトを使わず英語UIを初期化する', () => {
  const qrScript = read('qrcode/script.js');
  assert.match(qrScript, /document\.documentElement\.lang/);
  assert.match(qrScript, /pageLang\s*===\s*['"]en['"]/);

  for (const page of englishPages) {
    const html = read(page.file);
    assert.doesNotMatch(html, /navigator\.language[\s\S]{0,200}(?:location|replace|assign)/i, `${page.file} で自動リダイレクトしないでください`);
  }
});

test('英語ツールはレビュー済みHTMLを公開元として主要操作要素を保持する', () => {
  for (const page of englishPages.filter((entry) => entry.requiredIds)) {
    const html = read(page.file);
    assert.match(html, /class="[^"]*english-tool-page/i, `${page.file} に英語ツール用bodyクラスが必要です`);
    for (const id of page.requiredIds) {
      assert.match(html, new RegExp(`id="${id}"`), `${page.file} に機能要素 #${id} が必要です`);
    }
  }
});

test('強調線メーカーの追加案内も英語ページでは英語で表示する', () => {
  const html = read('emphasis-lines/en/index.html');

  assert.match(html, /Choosing a style by use case/);
  assert.match(html, /Before you use it/);
  assert.doesNotMatch(html, /用途別の使い分け|使う前に知っておきたいこと/);
});

test('英語ツールとガイドは390px幅で横スクロールを発生させない設計を持つ', () => {
  const fontCss = read('font-lab/style.css');
  const aspectScript = read('aspect-ratio-calc/script.js');
  const pxCss = read('px-rem-converter/style.css');
  const pxScript = read('px-rem-converter/script.js');
  const socialGuide = read('guides/en/social-image-sizes.html');
  const englishShellCss = read('international/english-shell.css');

  assert.match(fontCss, /\.simulator-layout\s*>\s*\*\s*\{[^}]*min-width:\s*0/s);
  assert.match(aspectScript, /document\.documentElement\.lang/);
  assert.match(aspectScript, /Close to <strong>\$\{foundMatch\.display\}<\/strong>/);
  assert.match(pxCss, /\.table-container\s*\{[^}]*overflow:\s*auto/s);
  assert.match(pxCss, /@media\s*\(max-width:\s*600px\)[\s\S]*\.copy-controls\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(pxScript, /document\.documentElement\.lang/);
  assert.match(pxScript, /Remove the \$\{px\} px row/);
  assert.match(socialGuide, /href="\/international\/english-shell\.css\?v=[0-9A-Za-z._-]+"/);
  assert.match(englishShellCss, /\.english-article-body pre\s*\{[^}]*max-width:\s*100%[^}]*overflow:\s*auto/s);
});

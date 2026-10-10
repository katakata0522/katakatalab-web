const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  collectHtml,
  read,
  repositoryRoot,
} = require('./helpers/repository.cjs');

function relativeLuminance(hexColor) {
  const channels = hexColor.slice(1).match(/.{2}/g).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(firstColor, secondColor) {
  const first = relativeLuminance(firstColor);
  const second = relativeLuminance(secondColor);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

test('オフライン専用画面は検索対象外で広告を読み込まない', () => {
  const html = read('offline.html');

  assert.match(html, /<meta[^>]+name="robots"[^>]+content="noindex, nofollow"/i);
  assert.doesNotMatch(html, /adsbygoogle|pagead2\.googlesyndication\.com/i);
});

test('PikaLabは広告とアクセス解析を読み込まず無広告運用の説明に統一する', () => {
  const pikalabRoot = path.join(repositoryRoot, 'pikalab');
  const htmlFiles = collectHtml(pikalabRoot, new Set(['dist', 'node_modules', '.code-studio', '.kotoba']));

  for (const filePath of htmlFiles) {
    const html = read(filePath);
    const label = path.relative(repositoryRoot, filePath);
    assert.doesNotMatch(
      html,
      /adsbygoogle|googlesyndication|doubleclick\.net|googletagmanager\.com|G-FYFPS7L9X9/i,
      `${label} に広告・解析用ドメインを残さないでください`
    );
  }

  const policyText = [read('pikalab/index.html'), read('pikalab/privacy.html'), read('pikalab/terms.html')].join('\n');
  assert.doesNotMatch(policyText, /広告を表示するページもあります|広告配信のため|Google AdSense/i);
  assert.match(policyText, /広告を表示しません/);
});



test('審査対象外・法務・短い補助ページは広告を読み込まない', () => {
  const adFreePages = [
    'gear.html',
    'note-selection.html',
    'qrcode/privacy.html',
    'qrcode/terms.html',
    'qrcode/pro-plan.html',
    'qrcode/lp-beauty.html',
    'qrcode/lp-events.html',
    'qrcode/lp-restaurant.html',
    'qrcode/guide-line.html',
    'qrcode/guide-mail.html',
    'qrcode/guide-print.html',
    'qrcode/guide-social.html',
    'qrcode/guide-vcard.html',
    'qrcode/guide-wifi.html',
  ];

  for (const relativePath of adFreePages) {
    assert.doesNotMatch(
      read(relativePath),
      /adsbygoogle|pagead2\.googlesyndication\.com/i,
      `${relativePath} から広告コードを削除してください`
    );
  }
});

test('未来計画中心の野望ページは審査中の検索・広告対象から外す', () => {
  const html = read('ambition.html');

  assert.match(html, /<meta[^>]+name="robots"[^>]+content="noindex, nofollow"/i);
  assert.doesNotMatch(html, /adsbygoogle|pagead2\.googlesyndication\.com/i);
  assert.doesNotMatch(read('sitemap.xml'), /<loc>https:\/\/katakatalab\.com\/ambition\.html<\/loc>/);
});



test('部分HTMLのstoryファイルは公開成果物から除外する', () => {
  const { isForbiddenNestedFile } = require('../.github/scripts/build-public-root.cjs');

  assert.equal(isForbiddenNestedFile('story.html'), true);
});

test('サイトマップは非公開の制作ストーリーへ案内しない', () => {
  const html = read('sitemap.html');

  assert.doesNotMatch(html, /(?:aspect-ratio|minitools|password-generator|px-rem|qrcode|playpoint|pikalab)-story\.html/);
});







test('ルートサイトマップは審査中に英語版強調線メーカーを載せない', () => {
  // 薄いENツールをメインsitemapに載せない方針（noindex と整合）
  assert.doesNotMatch(read('sitemap.xml'), /<loc>https:\/\/katakatalab\.com\/emphasis-lines\/en\/<\/loc>/);
});



test('CodeStudioは正規URLとページ内容を示す主見出しを持つ', () => {
  const html = read('pikalab/.code-studio/index.html');

  assert.match(html, /<title>KatakataLab CodeStudio \| ブラウザでコードを書いて実行・プレビュー<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/katakatalab\.com\/pikalab\/code-studio\/">/);
  assert.match(html, /<h1 class="visually-hidden">KatakataLab CodeStudio<\/h1>/);
});

test('主要ボタンの白文字はWCAG AA相当のコントラストを確保する', () => {
  const css = read('style.css');
  const primaryDark = css.match(/--c-primary-dark:\s*(#[0-9A-Fa-f]{6})/);

  assert.ok(primaryDark, '濃いプライマリー色が定義されている必要があります');
  assert.ok(contrastRatio(primaryDark[1], '#FFFFFF') >= 4.5, '白文字とのコントラスト比を4.5以上にしてください');
  assert.match(css, /\.btn-primary\s*{[^}]*background-color:\s*var\(--c-primary-dark\)/s);
});

test('PikaLabの初回入力UIは薄すぎる文字色を使わない', () => {
  const html = read('pikalab/index.html');

  assert.match(html, /<label class="block text-xs font-bold text-slate-600 mb-1 ml-1">おなまえ/);
  assert.match(html, /<label class="block text-xs font-bold text-slate-600 mb-1 ml-1">アバター/);
  assert.match(html, /class="w-full text-slate-600 hover:text-slate-700 font-bold py-3/);
});

test('PikaLabのアイコンフォントは使用分だけ読み込み、読み込み前の名前表示を防ぐ', () => {
  const html = read('pikalab/index.html');

  assert.match(html, /Material\+Symbols\+Rounded:[^"\s]+&icon_names=[^"\s]+&display=block/);
  assert.doesNotMatch(html, /Material\+Symbols\+Rounded:[^"\s]+&display=swap/);
});

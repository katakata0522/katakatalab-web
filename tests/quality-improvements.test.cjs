const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers/repository.cjs');

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

test('主要ページは本文を端末フォントにして表示用フォントだけを読み込む', () => {
  const rootHtml = read('index.html');
  const rootCss = read('style.css');
  const pikaHtml = read('pikalab/index.html');
  const pikaInputCss = read('pikalab/tailwind.input.css');

  assert.match(rootHtml, /family=M\+PLUS\+Rounded\+1c:wght@700&family=Outfit:wght@400;700/);
  assert.doesNotMatch(rootHtml, /M\+PLUS\+Rounded\+1c:wght@400/);
  assert.match(rootCss, /--font-base:\s*-apple-system,/);
  assert.match(rootCss, /--font-display:\s*'M PLUS Rounded 1c'/);
  assert.match(rootCss, /h1, h2, h3\s*\{[^}]*font-family:\s*var\(--font-display\)/s);

  assert.match(pikaHtml, /family=M\+PLUS\+Rounded\+1c:wght@700;900&display=optional/);
  assert.doesNotMatch(pikaHtml, /family=Zen\+Maru\+Gothic/);
  assert.match(pikaInputCss, /body\s*\{[^}]*font-family:\s*-apple-system,/s);
});

test('PikaLabのMaterial Symbolsは使用アイコンだけを読み込む', () => {
  const html = read('pikalab/index.html');
  const symbolHref = html.match(/href="([^"]*Material\+Symbols\+Rounded[^"]*)"/)?.[1] ?? '';

  assert.match(symbolHref, /&icon_names=/);
  assert.match(symbolHref, /&display=block/);
  for (const icon of ['apps', 'palette', 'rocket_launch', 'scuba_diving', 'volume_off', 'volume_up']) {
    assert.match(symbolHref, new RegExp(`(?:icon_names=|,)${icon}(?:,|&)`), `${icon} がサブセットにありません`);
  }
});

test('QR設定ドロワーは閉じている間は操作対象外で入力名も読み上げられる', () => {
  const html = read('qrcode/index.html');
  const script = read('qrcode/script.js');
  const css = read('qrcode/style.css');

  assert.match(html, /<aside id="settingsSidebar"[^>]*aria-hidden="true"[^>]*\binert\b/);
  assert.match(html, /<label[^>]*for="qrSize"[^>]*>/);
  assert.match(html, /<label[^>]*for="qrForeground"[^>]*>/);
  assert.match(html, /<label[^>]*for="qrBackground"[^>]*>/);

  assert.match(script, /els\.settingsSidebar\.inert\s*=\s*false/);
  assert.match(script, /els\.settingsSidebar\.inert\s*=\s*true/);
  assert.match(script, /const getSidebarFocusableElements/);
  assert.match(script, /event\.key === 'Tab'/);

  const placeholderColor = css.match(/\.placeholder-msg\s*\{[^}]*color:\s*(#[0-9a-f]{6})/is)?.[1];
  const canvasBackground = css.match(/\.canvas-wrapper\s*\{[^}]*background:\s*(#[0-9a-f]{6})/is)?.[1];
  assert.ok(placeholderColor && canvasBackground, 'QRプレビューの文字色と背景色を取得できること');
  assert.ok(
    contrastRatio(placeholderColor, canvasBackground) >= 4.5,
    'QRプレビューの案内文字は背景とのコントラストを4.5以上にする',
  );

  const articleLinkColor = css.match(/\.article-content a:not\(\.resource-card\)[^{]*\{[^}]*color:\s*(#[0-9a-f]{6})/is)?.[1];
  const toolWrapper = css.match(/\.tool-wrapper\s*\{([^}]*)\}/is)?.[1] ?? '';
  const wrapperBackgrounds = [...toolWrapper.matchAll(/#[0-9a-f]{6}/gi)].map((match) => match[0]);
  assert.ok(articleLinkColor && wrapperBackgrounds.length > 0, '記事リンク色と背景色を取得できること');
  for (const background of wrapperBackgrounds) {
    assert.ok(
      contrastRatio(articleLinkColor, background) >= 4.5,
      `記事リンクは背景 ${background} とのコントラストを4.5以上にする`,
    );
  }
});

test('主要ガイドと実例ページは相互に行き来できる', () => {
  const selection = read('guides/tool-selection-guide.html');
  const cases = read('guides/case-studies.html');
  const qrGuides = read('qrcode/guides.html');

  assert.match(selection, /href="case-studies\.html"/);
  assert.match(cases, /href="\.\.\/guides\/tool-selection-guide\.html"/);
  assert.match(cases, /href="\.\.\/about-katakatalab\.html#verification-policy"/);
  assert.match(qrGuides, /href="\.\.\/guides\/case-studies\.html"/);
});

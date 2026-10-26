const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers/repository.cjs');
const { renderCard, validateProjects } = require('../scripts/build-project-cards.cjs');

function cardBlock(html, group) {
  const name = group.toUpperCase();
  const start = `<!-- PROJECT_CARDS_${name}_START -->`;
  const end = `<!-- PROJECT_CARDS_${name}_END -->`;
  return html.slice(html.indexOf(start) + start.length, html.indexOf(end))
    .replace(/^\n                    /, '')
    .replace(/\n                    $/, '');
}

test('トップのカードは projects.json の生成結果と一致する', () => {
  const projects = JSON.parse(read('projects.json'));
  validateProjects(projects);
  const html = read('index.html').replace(/\r\n/g, '\n');

  for (const group of ['primary', 'secondary']) {
    const generated = projects
      .filter((project) => project.group === group)
      .map((project) => renderCard(project))
      .join('\n                    ');
    assert.equal(cardBlock(html, group), generated);
  }
});

test('構造化データは同じ主体を二重定義せず、画面のnoteと一致する', () => {
  const html = read('index.html');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/g)];

  assert.equal(blocks.length, 1);
  const graph = JSON.parse(blocks[0][1])['@graph'];
  const ids = graph.map((node) => node['@id']);
  assert.equal(new Set(ids).size, ids.length);

  const organization = graph.find((node) => node['@type'] === 'Organization');
  assert.deepEqual(organization.sameAs, [
    'https://x.com/Katakata_toybox',
    'https://note.com/cozy_snipe6552',
  ]);
  assert.equal(organization.logo.url, 'https://katakatalab.com/icon.svg');
  assert.match(html, /href="https:\/\/note\.com\/cozy_snipe6552"/);
  const tools = graph.find((node) => node['@type'] === 'ItemList').itemListElement;
  assert.equal(tools.length, 10);
  assert.ok(tools.some((item) => item.url === 'https://katakatalab.com/screenshot-crop/'));
});

test('繰り返していたツール枠だけを共有し、個別のパンくずは残す', () => {
  const css = read('tool-chrome.css');
  assert.match(css, /\.breadcrumbs-tool--bar\s*\{/);
  assert.match(css, /\.breadcrumbs-tool--trail\s*\{/);
  assert.match(css, /\.tool-footer\.tool-footer--bar\s*\{/);
  assert.doesNotMatch(css, /#0b132b|#f59e0b|#10b981|Inter|Zen Maru/);

  for (const page of [
    'qrcode/index.html',
    'aspect-ratio-calc/index.html',
    'discount-calc/index.html',
    'text-diff/en/index.html',
  ]) {
    const html = read(page);
    assert.match(html, /href="(?:\.\.\/)+tool-chrome\.css\?v=/);
    assert.doesNotMatch(html, /<style>\.breadcrumbs-tool a:hover/);
  }

  const qr = read('qrcode/index.html');
  assert.match(qr, /JavaScriptを有効にするとQRコードを作成できます/);
  assert.doesNotMatch(qr, /計算のためにJavaScriptを使用します/);

  const pxEnglish = read('px-rem-converter/en/index.html');
  assert.doesNotMatch(pxEnglish, /tool-chrome\.css|breadcrumbs-tool--(?:bar|trail)/);

  const passwordWorker = read('password-generator/sw.js');
  const passwordScript = read('password-generator/script.js');
  assert.doesNotMatch(passwordWorker, /bootstrap/);
  assert.match(passwordScript, /classList\.toggle\('dark-mode'/);
  assert.doesNotMatch(passwordScript, /data-bs-theme|themeToggle\.textContent/);
});



test('CodeStudioヘッダーはKatakataLabブランドを表示し親サイトへの脱出リンクを持つ', () => {
  const html = read('pikalab/.code-studio/index.html');
  assert.match(html, /<title>KatakataLab CodeStudio/);
  assert.match(html, /<a href="\.\.\/\.\.\/index\.html" class="logo"[^>]*>⚙ KatakataLab <span data-i18n="logo_studio">CodeStudio<\/span><\/a>/);
});



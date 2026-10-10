const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  read,
  resolveRepositoryPath,
} = require('./helpers/repository.cjs');
const {
  assertPublishedBeforeModified,
  assertVisibleUpdateMatchesModified,
} = require('./helpers/content-metadata.cjs');

test('強調線メーカーはCSPで許可された自己ホストのアイコンだけを使う', () => {
  const pages = [
    'emphasis-lines/index.html',
    'emphasis-lines/en/index.html',
    'emphasis-lines/guide.html',
  ];

  for (const relativePath of pages) {
    const html = read(relativePath);
    assert.doesNotMatch(html, /unpkg\.com\/@phosphor-icons/i, `${relativePath} に外部アイコン読込があります`);
    for (const weight of ['regular', 'bold', 'fill']) {
      assert.match(
        html,
        new RegExp(`css/phosphor/${weight}/style\\.css(?:\\?v=[^"'\\s]+)?`),
        `${relativePath} に ${weight} アイコンCSSがありません`
      );
    }
  }

  for (const [weight, fontName] of [
    ['regular', 'Phosphor'],
    ['bold', 'Phosphor-Bold'],
    ['fill', 'Phosphor-Fill'],
  ]) {
    for (const fileName of ['style.css', `${fontName}.woff2`]) {
      assert.ok(
        fs.existsSync(resolveRepositoryPath(`emphasis-lines/css/phosphor/${weight}/${fileName}`)),
        `${weight}/${fileName} を自己ホストしてください`
      );
    }
    const iconCss = read(`emphasis-lines/css/phosphor/${weight}/style.css`);
    assert.doesNotMatch(
      iconCss,
      /url\("\.\/[^\"]+\.(?:woff(?!2)|ttf|svg)/,
      `${weight} CSS が配置していない旧形式フォントを参照しています`
    );
  }

  assert.ok(fs.existsSync(resolveRepositoryPath('emphasis-lines/css/phosphor/LICENSE')));
});

test('公開ページは審査や検索エンジンではなく利用者向けの変更内容を説明する', () => {
  const updates = read('updates.html');
  const englishSources = [
    read('en/index.html'),
    read('en/site-information.html'),
  ].join('\n');

  assert.doesNotMatch(
    updates,
    /AdSense審査対応|クローラー評価|noindex\s*解除|AdSenseプレースホルダー|SEO対策/
  );
  assert.match(updates, /利用者|初めて訪れた方|必要な情報/);

  assert.doesNotMatch(
    englishSources,
    /generated keyword variants|search behavior|while (?:their )?usefulness is evaluated|intentionally ad-free/i
  );
  assert.match(englishSources, /A quick note|What the English tools are/);
  assert.match(
    englishSources,
    /(?:Last update|Last reviewed)[\s\S]{0,80}<time datetime="\d{4}-\d{2}-\d{2}">/i,
  );

  const publicCopy = [
    read('index.html'),
    read('who-is-katakata.html'),
    read('px-rem-converter/index.html'),
    read('font-lab/index.html'),
    read('font-lab/en/index.html'),
    read('guides/it-basics/commit.html'),
  ].join('\n');
  assert.doesNotMatch(
    `${updates}\n${publicCopy}`,
    /AdSense審査|審査(?:中|対策|運用)|再申請|合格後|GoogleのSEO指標|SEO導線|Structured Data for SEO \/ AdSense/
  );

  assert.doesNotMatch(read('password-generator/index.html'), /AdSense審査自動テスト要件用ダミーコメント/);
  assert.doesNotMatch(read('seireki/index.html'), /AdSense審査自動テスト要件用ダミーコメント/);
});

test('アスペクト比ページは誤記と根拠の弱い誇張を避けて使用先を基準に説明する', () => {
  const tool = read('aspect-ratio-calc/index.html');
  const guide = read('guides/aspect-ratio-guide.html');
  const combined = `${tool}\n${guide}`;

  assert.doesNotMatch(
    combined,
    /幅 of|爆速|極上|デザイナー必須|人間が最も美しい|完全に解放|3回やり直した私|私（わたくし）|正しい比率の選び方を徹底解説|ほとんどの動画コンテンツ|最適な正方形サイズ|時間の浪費/
  );
  assert.doesNotMatch(guide, /16:9にしておけば困ることはほとんどない/);
  assert.match(tool, /1600px幅の4:3資料を作る/);
  assert.match(tool, /黄金比はデザインで参照される比率のひとつ/);
  assert.match(guide, /公開先や会場の推奨仕様/);
  assert.match(guide, /support\.google\.com\/youtube\/answer\/72431/);
  assert.match(guide, /縦長動画では一部画面で4:5/);
  assertPublishedBeforeModified(guide, 'guides/aspect-ratio-guide.html');
  assertVisibleUpdateMatchesModified(guide, 'guides/aspect-ratio-guide.html');
});

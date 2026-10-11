const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { collectHtml, read, repositoryRoot } = require('./helpers/repository.cjs');
const {
  assertPublishedBeforeModified,
  assertVisibleUpdateMatchesModified,
} = require('./helpers/content-metadata.cjs');
const { AD_ENABLED_PATHS } = require('../scripts/audit-publisher-quality.cjs');

test('トップは初期HTMLだけでも主題と主要ツールを説明できる', () => {
  const html = read('index.html');

  assert.match(html, /登録不要/);
  assert.match(html, /ブラウザ(?:内で|で)?完結/);
  assert.match(html, /個人開発/);
  assert.match(html, /data-project-card="static"/);
  assert.match(html, /QRコード/);
  assert.match(html, /パスワード/);
  assert.match(html, /href="guides\/it-basics\/"/);
  assert.match(html, /IT入門/);
  assert.match(html, /実用ツールとは目的が違うものです/);
});

test('主要6ページは用途・仕組み・注意点を本文で説明できる', () => {
  const expectations = [
    ['emphasis-lines/index.html', /用途別の使い分け/, /作成者[:：]\s*かたかた/],
    ['discount-calc/index.html', /計算結果を使うときの注意点/, /店舗ごとの端数処理/],
    ['seireki/index.html', /この早見表の見方と注意点/, /厄年は地域や神社/],
    ['text-diff/index.html', /差分結果の読み方と使いどころ/, /行単位の比較/],
    ['qrcode/guides.html', /QRコードを配布する前の確認/, /作成者[:：]\s*かたかた/],
    ['guides/css-size-scale-guide.html', /実装前の確認チェック/, /アクセシビリティ/],
  ];

  for (const [relativePath, ...patterns] of expectations) {
    const html = read(relativePath);
    for (const pattern of patterns) assert.match(html, pattern, `${relativePath} に補足情報がありません`);
  }
});

test('中心ガイドは用途別の選択材料と実例をまとめている', () => {
  const html = read('guides/tool-selection-guide.html');

  assert.match(html, /用途から選ぶ/);
  assert.match(html, /制作・デザイン/);
  assert.match(html, /開発・文章/);
  assert.match(html, /日常・情報共有/);
  assert.match(html, /PikaLab/);
  assert.match(html, /実例|検証/);
  assert.match(html, /作成者[:：]\s*かたかた/);
});

test('運営者情報は制作・検証の範囲を具体的に示す', () => {
  const html = read('who-is-katakata.html');

  assert.match(html, /制作・検証メモ/);
  assert.match(html, /スマートフォン|デスクトップ/);
  assert.match(html, /入力例|リンク|表示/);
  assert.match(html, /訂正|問い合わせ/);
});

test('インタラクティブなツール画面には広告スクリプトを読み込まない', () => {
  const toolPages = [
    'aspect-ratio-calc/index.html',
    'discount-calc/index.html',
    'emphasis-lines/index.html',
    'font-lab/index.html',
    'ogp-simulator/index.html',
    'password-generator/index.html',
    'px-rem-converter/index.html',
    'qrcode/index.html',
    'seireki/index.html',
    'text-diff/index.html',
  ];

  for (const relativePath of toolPages) {
    assert.doesNotMatch(read(relativePath), /pagead2\.googlesyndication\.com|adsbygoogle/, `${relativePath} に広告スクリプトがあります`);
  }
});

test('ケーススタディは実際のツール入力と出力をたどれる', () => {
  const html = read('guides/case-studies.html');

  assert.match(html, /ケーススタディ|実例/);
  assert.match(html, /aspect-ratio-calc/);
  assert.match(html, /1920\s*[×x]\s*1080/);
  assert.match(html, /1200\s*[×x]\s*675/);
  assert.match(html, /discount-calc/);
  assert.match(html, /px-rem-converter/);
  assert.match(html, /1\.5rem/);
  assert.match(html, /qrcode/);
  assert.match(html, /password-generator/);
  assert.match(html, /text-diff/);
  assert.match(html, /入力|出力|確認/);
  assert.match(html, /作成者[:：]\s*かたかた/);
});

test('トップページは審査中の広告掲載対象から外す', () => {
  assert.doesNotMatch(read('index.html'), /pagead2\.googlesyndication\.com|adsbygoogle/);
});

test('更新履歴は広告なしの運用記録として公開する', () => {
  const html = read('updates.html');
  const audit = read('scripts/audit-publisher-quality.cjs');

  assert.doesNotMatch(html, /pagead2\.googlesyndication\.com|adsbygoogle/);
  assert.match(audit, /updates\\\.html/);
});

test('プライバシーポリシーはGoogleのデータ利用・例外通信・地域別同意を説明する', () => {
  const html = read('privacy.html');

  assert.match(html, /policies\.google\.com\/technologies\/partner-sites/);
  assert.match(html, /同意|プライバシーメッセージ/);
  assert.match(html, /QR Maker Lab Pro/);
  assert.match(html, /ライセンスキー/);
  assert.match(html, /qrcode\/privacy\.html/);
  assert.doesNotMatch(html, /Webツールは、入力されたデータをサーバーに送信せず、ブラウザ内のみで処理します/);
  assert.match(html, /最終更新：\d{4}年\d{1,2}月\d{1,2}日/);
});

test('ナビゲーション専用サイトマップは検索対象から外しXMLサイトマップに載せない', () => {
  const sitemapHtml = read('sitemap.html');
  const sitemapXml = read('sitemap.xml');

  assert.match(sitemapHtml, /<meta name="robots" content="noindex, follow">/i);
  assert.doesNotMatch(sitemapXml, /<loc>https:\/\/katakatalab\.com\/sitemap\.html<\/loc>/);
  assert.match(sitemapHtml, /guides\/case-studies\.html/);
});

test('広告を外したQRツールの説明が実装と矛盾しない', () => {
  const html = read('qrcode/index.html');

  assert.doesNotMatch(html, /Ads may be loaded on this page|このページでは広告が読み込まれます/);
  assert.match(html, /広告.*表示していません|does not load display advertising/i);
});

test('実例集から主要ツールへ往復できる', () => {
  const toolPages = [
    'aspect-ratio-calc/index.html',
    'discount-calc/index.html',
    'password-generator/index.html',
    'px-rem-converter/index.html',
    'qrcode/index.html',
    'text-diff/index.html',
  ];

  for (const relativePath of toolPages) {
    assert.match(read(relativePath), /guides\/case-studies\.html/);
  }
});



test('公開トップの正本に仮置き表現や審査専用の二面運用を残さない', () => {
  const publicFace = `${read('index.html')}\n${read('projects.json')}`;

  assert.doesNotMatch(publicFace, /履歴書用の学歴年度は仮置きです/);
  assert.doesNotMatch(publicFace, /標準年限の仮置きです/);
  assert.doesNotMatch(publicFace, /SITE_FACE:\s*adsense-guide-first/);
  assert.doesNotMatch(publicFace, /承認後のポートフォリオ戻し/);
});

test('パスワードガイドは現行NIST指針を文字種必須と誤解させない', () => {
  const html = read('guides/password-guide.html');

  assert.match(html, /SP 800-63B-4/);
  assert.match(html, /最低15文字/);
  assert.match(html, /文字種の組み合わせルールを強制しない/);
  assert.match(html, /ブロックリスト/);
  assert.doesNotMatch(html, /passwordpasswordpassword[^<]*実は後者/);
  assert.doesNotMatch(html, /マスターパスワード1個覚えれば全部解決/);
});

test('px/remガイドは16pxを固定値として扱わずroot基準を説明する', () => {
  const html = read('guides/px-rem-guide.html');

  assert.match(html, /ルート要素|root/);
  assert.match(html, /ユーザー設定/);
  assert.match(html, /MDN/);
  assert.doesNotMatch(html, /ブラウザのデフォルトでは、<code>1rem = 16px<\/code>です/);
});



test('作品データの内部URLはcanonicalと同じディレクトリURLを使う', () => {
  const projects = JSON.parse(read('projects.json'));
  const internalUrls = projects
    .map((project) => project.url)
    .filter((url) => !/^https?:\/\//.test(url));

  for (const url of internalUrls) {
    assert.doesNotMatch(url, /index\.html(?:$|[?#])/);
  }
});

test('子ども向けPikaLabと法務ページは広告スクリプトを読み込まない', () => {
  const pikalabFiles = collectHtml('pikalab');
  assert.ok(pikalabFiles.length > 0, 'PikaLab配下のHTMLを列挙できていません');
  assert.ok(
    pikalabFiles.some((filePath) => path.relative(repositoryRoot, filePath).replaceAll('\\', '/') === 'pikalab/index.html'),
    'PikaLabトップが広告監査対象に含まれていません',
  );

  for (const filePath of pikalabFiles) {
    const html = read(filePath);
    assert.doesNotMatch(html, /pagead2\.googlesyndication\.com|adsbygoogle/);
  }

  for (const relativePath of ['privacy.html', 'terms.html', 'contact.html', 'sitemap.html', '404.html']) {
    assert.doesNotMatch(read(relativePath), /pagead2\.googlesyndication\.com|adsbygoogle/);
  }
});

test('パスワード機能は安全側の初期値と誇張しない説明を使う', () => {
  const html = read('password-generator/index.html');
  const script = read('password-generator/script.js');

  assert.match(html, /id="length"[^>]*max="64"[^>]*value="16"/);
  assert.match(html, /id="len-input"[^>]*max="64"[^>]*value="16"/);
  assert.match(script, /const MAX_LENGTH = 64;/);
  // New vault setup is removed; existing data remains read-only recoverable.
  assert.doesNotMatch(script, /vault\.setup\(/);
  assert.match(script, /vault\.unlock\(/);
  assert.doesNotMatch(`${html}\n${script}`, /絶対防衛|最強設定|解読予想時間/);
  assert.match(html, /参考/);
});





test('広告対象は厚いガイド8ページに絞る（IT用語連載は広告なし）', () => {
  const adFreePages = [
    'who-is-katakata.html',
    'about-katakatalab.html',
    'guides/sns-image-size-guide.html',
    'guides/password-storage-guide.html',
    'guides/css-size-scale-guide.html',
    'emphasis-lines/guide.html',
    'qrcode/guides.html',
    'guides/it-basics/index.html',
    'guides/it-basics/server.html',
    'guides/it-basics/api.html',
  ];

  for (const relativePath of adFreePages) {
    assert.doesNotMatch(read(relativePath), /pagead2\.googlesyndication\.com|adsbygoogle/, `${relativePath} は広告なしで公開します`);
  }

  for (const filePath of collectHtml('lab-tools', new Set())) {
    const relativePath = path.relative(repositoryRoot, filePath).replaceAll('\\', '/');
    assert.doesNotMatch(
      fs.readFileSync(filePath, 'utf8'),
      /pagead2\.googlesyndication\.com|adsbygoogle/,
      `${relativePath} は移設直後の検証ツールなので広告なしで公開します`
    );
  }

  const sitemapDocuments = `${read('sitemap.xml')}\n${read('pikalab/sitemap.xml')}`;
  const sitemapPaths = [...sitemapDocuments.matchAll(/<loc>https:\/\/katakatalab\.com([^<]*)<\/loc>/g)]
    .map((match) => new URL(`https://katakatalab.com${match[1]}`).pathname);
  const pageHtml = sitemapPaths.map((urlPath) => {
    const withoutLeadingSlash = decodeURIComponent(urlPath).replace(/^\/+/, '');
    const relativeFile = urlPath.endsWith('/')
      ? path.join(withoutLeadingSlash, 'index.html')
      : withoutLeadingSlash;
    const candidates = [path.join(repositoryRoot, relativeFile || 'index.html')];
    if (urlPath === '/pikalab/code-studio/') candidates.push(path.join(repositoryRoot, 'pikalab', '.code-studio', 'index.html'));
    if (urlPath === '/pikalab/kotoba/') candidates.push(path.join(repositoryRoot, 'pikalab', '.kotoba', 'index.html'));
    const sourceFile = candidates.find((candidate) => fs.existsSync(candidate));
    assert.ok(sourceFile, `${urlPath} の公開元HTMLがありません`);
    return fs.readFileSync(sourceFile, 'utf8');
  });

  assert.equal(new Set(sitemapPaths).size, sitemapPaths.length, 'サイトマップURLは重複させません');
  const actualAdPaths = sitemapPaths.filter((urlPath, index) => (
    /pagead2\.googlesyndication\.com|adsbygoogle/.test(pageHtml[index])
  ));
  assert.deepEqual(actualAdPaths.toSorted(), [...AD_ENABLED_PATHS].toSorted());
});

test('主要5ツールは入力・結果・確認範囲をページ内に記録する', () => {
  const toolPages = [
    'qrcode/index.html',
    'discount-calc/index.html',
    'aspect-ratio-calc/index.html',
    'text-diff/index.html',
    'password-generator/index.html',
  ];

  for (const relativePath of toolPages) {
    const html = read(relativePath);
    assert.match(html, /data-verification-note/);
    assert.match(html, /確認日[:：]\s*\d{4}年\d{1,2}月\d{1,2}日/);
    assert.match(html, /入力/);
    assert.match(html, /結果/);
    assert.match(html, /確認範囲|限界/);
    assert.match(html, /about-katakatalab\.html#verification-policy/);
  }
});

test('トップはツール優先の導線を持ちPikaLabを別枠に分ける', () => {
  const homepage = read('index.html');
  const guide = read('guides/tool-selection-guide.html');

  assert.match(homepage, /<section id="projects"[^>]*>/);
  assert.match(homepage, /<nav id="recommended-guides" class="guide-quick"/);
  assert.match(homepage, /guides\/case-studies\.html/);
  assert.match(homepage, /guides\/tool-selection-guide\.html/);
  assert.match(homepage, /href="guides\/it-basics\/"/);
  assert.match(homepage, /id="secondary-projects-grid"/);
  assert.match(homepage, /data-id="pikalab"/);
  assert.match(homepage, /data-shelf="learning"/);
  assert.match(homepage, /aria-label="ツールの種類で絞り込む"/);
  assert.match(homepage, />🌐 すべて</);
  assert.match(homepage, /実用ツールとは目的が違うものです/);

  const projects = JSON.parse(read('projects.json'));
  assert.ok(projects.filter((project) => project.group === 'primary').every((project) => project.shelf === 'tool'));
  assert.doesNotMatch(
    JSON.stringify(projects),
    /正しい縦横比|1秒で実行|1秒で動く|初めてでも迷いません|一瞬で計算/
  );
});

test('KatakataLabについては検証方法と訂正経路を公開する', () => {
  const html = read('about-katakatalab.html');

  assert.match(html, /id="verification-policy"/);
  assert.match(html, /計算結果/);
  assert.match(html, /ブラウザ操作/);
  assert.match(html, /更新日/);
  assert.match(html, /参考資料|出典/);
  assert.match(html, /自動テスト/);
  assert.match(html, /お問い合わせ/);
});

test('広告を外したQRガイドは新しいオフラインキャッシュへ切り替える', () => {
  const serviceWorker = read('qrcode/sw.js');
  assert.match(serviceWorker, /qrcode-static-v\d+/);
  assert.match(serviceWorker, /'\.\/guides\.html'/);
});



test('無料表記と主要説明は現行の提供内容に一致する', () => {
  const homepage = read('index.html');
  const contact = read('contact.html');
  const about = read('about-katakatalab.html');

  assert.doesNotMatch(homepage, /完全無料/);
  assert.doesNotMatch(homepage, /<title>[^<]*無料[^<]*<\/title>/);
  assert.doesNotMatch(homepage, /全部ブラウザで、無料で、今すぐ使えます/);
  assert.doesNotMatch(contact, /Webツールはすべて無料/);
  assert.match(contact, /基本機能は無料/);
  assert.match(contact, /有料機能/);
  assert.match(about, /実用ツールの3本柱には含めず/);
  assert.match(about, /KatakataLabの制作方針/);
  assert.match(about, /ツールを多数公開しています/);
  assert.match(read('pikalab/index.html'), /プログラミングや音楽、漢字、瞬読/);
});

test('運営者ページは個人運営と問い合わせ経路を明確にする', () => {
  const html = read('who-is-katakata.html');

  assert.match(html, /かたかた/);
  assert.match(html, /個人クリエイター|個人で/);
  assert.match(html, /お問い合わせフォーム/);
  assert.doesNotMatch(html, /開発者一同|編集部/);
});
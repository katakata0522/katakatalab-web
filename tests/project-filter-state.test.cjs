const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { repositoryRoot } = require('./helpers/repository.cjs');

const helperPath = path.join(repositoryRoot, 'project-filter-state.js');
assert.equal(fs.existsSync(helperPath), true, 'project-filter-state.js が必要です');
const {
  DEFAULT_FILTER,
  MAX_QUERY_LENGTH,
  SHARE_QUERY_PARAM,
  createProjectSearchCorpus,
  getProjectSearchSuggestions,
  normalizeProjectSearchText,
  readProjectFilterState,
  buildProjectFilterUrl,
} = require(helperPath);

test('絞り込みURLは専用検索キーを使い、旧qリンクも後方互換で復元する', () => {
  assert.equal(SHARE_QUERY_PARAM, 'tool_q');
  assert.deepEqual(
    readProjectFilterState('?shelf=tool&tool_q=%E8%A8%88%E7%AE%97'),
    { filter: 'tool', query: '計算' },
  );
  assert.deepEqual(
    readProjectFilterState('?shelf=tool&q=%E8%A8%88%E7%AE%97'),
    { filter: 'tool', query: '計算' },
  );
  assert.deepEqual(
    readProjectFilterState('?shelf=unknown&tool_q=%20%20'),
    { filter: DEFAULT_FILTER, query: '' },
  );
});

test('共有URLは既存のパスとハッシュを保ち、初期状態は短く表現する', () => {
  const source = 'https://katakatalab.com/?old=value#projects';
  const url = buildProjectFilterUrl(source, { filter: 'story', query: '  note  ' });
  assert.equal(url, 'https://katakatalab.com/?shelf=story&tool_q=note#projects');

  const reset = buildProjectFilterUrl(url, { filter: 'all', query: '' });
  assert.equal(reset, 'https://katakatalab.com/#projects');
});

test('共有URLへ入れる検索語は長さを制限し、制御文字を除く', () => {
  const longQuery = `${'a'.repeat(MAX_QUERY_LENGTH + 20)}\n\t`;
  const url = buildProjectFilterUrl('https://katakatalab.com/', { filter: 'all', query: longQuery });
  const parsed = new URL(url);

  assert.equal(parsed.searchParams.get(SHARE_QUERY_PARAM).length, MAX_QUERY_LENGTH);
  assert.equal(/[\u0000-\u001f\u007f]/.test(parsed.searchParams.get(SHARE_QUERY_PARAM)), false);
  assert.equal(parsed.searchParams.has('q'), false);
});

test('検索語は全半角、大文字小文字、ひらがな・カタカナ、空白や記号の違いを吸収する', () => {
  assert.equal(
    normalizeProjectSearchText('かたかたラボ / QR Code'),
    normalizeProjectSearchText('かたかたらぼ qr-code'),
  );
  assert.equal(
    normalizeProjectSearchText('Ｐａｓｓｗｏｒｄ'),
    normalizeProjectSearchText('password'),
  );
});

test('明示した別名も検索コーパスに含める', () => {
  const corpus = createProjectSearchCorpus({
    title: 'QRコード生成',
    text: '画像を作成します',
    aliases: ['QR Maker Lab', '二次元コード'],
  });

  assert.equal(corpus.includes(normalizeProjectSearchText('QR Maker Lab')), true);
  assert.equal(corpus.includes(normalizeProjectSearchText('二次元コード')), true);
});

test('検索結果がないときは短い入力を除き近い別名を候補にできる', () => {
  const projects = [
    { id: 'password-generator', title: 'パスワード生成', aliases: ['password', 'パスワード'] },
    { id: 'qrcode', title: 'QRコード生成', aliases: ['QR', 'QRコード'] },
  ];

  assert.deepEqual(
    getProjectSearchSuggestions(projects, 'pasword').map((project) => project.id),
    ['password-generator'],
  );
  assert.deepEqual(getProjectSearchSuggestions(projects, 'a'), []);
});

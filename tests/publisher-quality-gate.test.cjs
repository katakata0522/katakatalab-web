'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  auditPublisherQuality,
  getSitemapUrls,
} = require('../scripts/audit-publisher-quality.cjs');

const repositoryRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

test('サイトマップ掲載ページは審査向けの公開品質基準を満たす', () => {
  const report = auditPublisherQuality();
  assert.equal(
    report.errors.length,
    0,
    report.errors.map((finding) => `${finding.path}: ${finding.message}`).join('\n'),
  );
  assert.equal(
    report.warnings.length,
    0,
    report.warnings.map((finding) => `${finding.path}: ${finding.message}`).join('\n'),
  );
});

test('公開品質監査は本文文字数をAdSense合否の条件にしない', () => {
  const source = read('scripts/audit-publisher-quality.cjs');
  assert.doesNotMatch(source, /minimumVisibleCharacters|countVisibleCharacters/);
  assert.doesNotMatch(source, /(?:500|800)文字/);
});

test('サイトマップURLは重複せずHTTPSの正規ホストだけを使う', () => {
  const urls = getSitemapUrls();
  const hrefs = urls.map((url) => url.href);

  assert.equal(new Set(hrefs).size, hrefs.length, 'サイトマップに重複URLがあります');
  for (const url of urls) {
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'katakatalab.com');
  }
});

test('高信頼性が必要な技術解説は公式資料と矛盾する断定をしない', () => {
  const passwordGuide = read('guides/password-guide.html');
  const qrPage = read('qrcode/index.html');
  const fontLab = read('font-lab/index.html');

  assert.match(passwordGuide, /pages\.nist\.gov\/800-63-4\/sp800-63b\/authenticators\//);
  assert.doesNotMatch(passwordGuide, /好きな曲の歌詞の頭文字\+数字/);

  assert.match(qrPage, /コード語の約30%/);
  assert.match(qrPage, /qrcode\.com\/en\/about\/error_correction\.html/);
  assert.doesNotMatch(qrPage, /3割のエリアがロゴで隠されても/);
  assert.doesNotMatch(qrPage, /100%読み取りエラー/);
  assert.doesNotMatch(qrPage, /We also do not run ads/);

  assert.match(fontLab, /web\.dev\/learn\/performance\/optimize-web-fonts/);
  assert.doesNotMatch(fontLab, /FOUT）を完全消去/);
  assert.doesNotMatch(fontLab, /元のフォントの美しさは100%保ったまま/);
});

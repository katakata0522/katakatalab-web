'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  PUBLIC_DIRECTORIES, shouldCopyPublicEntry, ensureAnalyticsCoverage, buildPublicRoot,
} = require('../.github/scripts/build-public-root.cjs');
const {
  PRIVACY_PATH, PRIVACY_URL, verifyReleaseReadyPrivacy,
} = require('../scripts/verify-releaseready-privacy.cjs');
const { createDefaultChecks, verifyPublicSite } = require('../scripts/verify-public-site.cjs');

const sourceRoot = path.resolve(__dirname, '..');

function builtPrivacyFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'releaseready-privacy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  // 実際の公開対象・コピーフィルター・HTML後処理を使う依存なしの回帰テスト。
  assert.ok(PUBLIC_DIRECTORIES.includes('privacy'));
  fs.cpSync(path.join(sourceRoot, 'privacy'), path.join(root, 'privacy'), {
    recursive: true, filter: shouldCopyPublicEntry,
  });
  fs.copyFileSync(path.join(sourceRoot, 'sitemap.xml'), path.join(root, 'sitemap.xml'));
  ensureAnalyticsCoverage(root);
  return root;
}

test('ReleaseReadyポリシーは公開後処理済みルートに残る', t => {
  const root = builtPrivacyFixture(t);
  assert.deepEqual(verifyReleaseReadyPrivacy(root), { path: PRIVACY_PATH, canonical: PRIVACY_URL });
  const source = fs.readFileSync(path.join(sourceRoot, PRIVACY_PATH), 'utf8');
  const built = fs.readFileSync(path.join(root, PRIVACY_PATH), 'utf8');
  assert.equal(built.replace(/    <script defer src="\/analytics\.js"><\/script>\n/, ''), source);
  assert.match(String(buildPublicRoot), /verifyReleaseReadyPrivacy\(outputRoot\)/);
});

test('ReleaseReadyの欠落をソースに残っていても最終ルートで拒否する', t => {
  const root = builtPrivacyFixture(t);
  fs.rmSync(path.join(root, PRIVACY_PATH));
  assert.throws(() => verifyReleaseReadyPrivacy(root), /公開必須ページがありません/);
});

test('ReleaseReadyのURLに別ページや404本文を置いても拒否する', t => {
  const root = builtPrivacyFixture(t);
  const page = path.join(root, PRIVACY_PATH);
  fs.writeFileSync(page, `<link rel="canonical" href="${PRIVACY_URL}"><h1>404 Not Found</h1>`);
  assert.throws(() => verifyReleaseReadyPrivacy(root), /本文を確認できません/);
});

test('ReleaseReadyのcanonical誤りを拒否する', t => {
  const root = builtPrivacyFixture(t);
  const page = path.join(root, PRIVACY_PATH);
  fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace(PRIVACY_URL, 'https://katakatalab.com/privacy/'));
  assert.throws(() => verifyReleaseReadyPrivacy(root), /canonicalが不正/);
});

test('ReleaseReadyの問い合わせ導線の欠落を拒否する', t => {
  const root = builtPrivacyFixture(t);
  const page = path.join(root, PRIVACY_PATH);
  fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replaceAll('href="/contact.html"', 'href="/"'));
  assert.throws(() => verifyReleaseReadyPrivacy(root), /案内リンクがありません/);
});

test('ReleaseReadyのsitemap登録欠落と重複を拒否する', t => {
  const root = builtPrivacyFixture(t);
  const sitemap = path.join(root, 'sitemap.xml');
  const original = fs.readFileSync(sitemap, 'utf8');
  fs.writeFileSync(sitemap, original.replace(`<loc>${PRIVACY_URL}</loc>`, ''));
  assert.throws(() => verifyReleaseReadyPrivacy(root), /sitemap.xmlへ1件/);
  fs.writeFileSync(sitemap, original.replace('</urlset>', `<url><loc>${PRIVACY_URL}</loc></url></urlset>`));
  assert.throws(() => verifyReleaseReadyPrivacy(root), /sitemap.xmlへ1件/);
});

test('ReleaseReadyポリシーはローカル処理と意図しない機密情報混入を説明する', () => {
  const html = fs.readFileSync(path.join(sourceRoot, PRIVACY_PATH), 'utf8');
  assert.match(html, /Chrome拡張機能 ReleaseReady v1\.3\.0/);
  assert.match(html, /chrome\.storage\.local/);
  assert.match(html, /外部AIへ送信しません/);
  for (const permission of ['activeTab', 'scripting', 'storage', 'sidePanel']) {
    assert.ok(html.includes(`<code>${permission}</code>`));
  }
  assert.match(html, /非表示になっている部分を含む場合/);
  assert.match(html, /URL（クエリやフラグメントを含む）/);
  assert.match(html, /検査結果やレポートに残る可能性/);
  assert.doesNotMatch(html, /tag-none">取得しない</);
});

test('公開URL検証はReleaseReadyのHTTP成功と本文およびsitemapを要求する', async () => {
  const baseUrl = 'https://preview.example';
  const canonicalBaseUrl = 'https://katakatalab.com';
  const checks = createDefaultChecks(baseUrl, canonicalBaseUrl);
  const privacy = checks.find(check => check.path === '/privacy/releaseready/');
  assert.ok(privacy);
  assert.ok(checks.find(check => check.path === '/sitemap.xml').markers.includes(`<loc>${PRIVACY_URL}</loc>`));
  const body = fs.readFileSync(path.join(sourceRoot, PRIVACY_PATH), 'utf8');
  const run = (status, text) => verifyPublicSite({
    baseUrl, canonicalBaseUrl, checks: [privacy],
    fetchImpl: async () => ({ status, text: async () => text }),
  });
  assert.equal((await run(200, body)).ok, true);
  assert.equal((await run(404, body)).ok, false);
  assert.equal((await run(200, '<h1>Not found</h1>')).ok, false);
});

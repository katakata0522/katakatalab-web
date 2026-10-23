'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PRIVACY_PATH = 'privacy/releaseready/index.html';
const PRIVACY_URL = 'https://katakatalab.com/privacy/releaseready/';

// ソースの存在だけでなく、配信する最終ルートを検証する。
function verifyReleaseReadyPrivacy(publicRoot) {
  const page = path.join(publicRoot, PRIVACY_PATH);
  if (!fs.existsSync(page) || !fs.statSync(page).isFile()) {
    throw new Error(`ReleaseReady公開必須ページがありません: ${PRIVACY_PATH}`);
  }
  const html = fs.readFileSync(page, 'utf8');
  const links = html.match(/<link\b[^>]*>/gi) || [];
  const canonical = links.filter(tag => /\brel=["']canonical["']/i.test(tag));
  if (canonical.length !== 1 || !canonical[0].includes(`href="${PRIVACY_URL}"`)) {
    throw new Error(`ReleaseReady公開必須ページのcanonicalが不正です: ${PRIVACY_PATH}`);
  }
  if (!/<h1\b[^>]*>\s*ReleaseReady プライバシーポリシー\s*<\/h1>/i.test(html)) {
    throw new Error(`ReleaseReady公開必須ページの本文を確認できません: ${PRIVACY_PATH}`);
  }
  const anchors = html.match(/<a\b[^>]*>/gi) || [];
  for (const href of ['/contact.html', '/privacy.html', '/terms.html']) {
    if (!anchors.some(tag => tag.includes(`href="${href}"`))) {
      throw new Error(`ReleaseReady公開必須ページの案内リンクがありません: ${href}`);
    }
  }
  const sitemap = path.join(publicRoot, 'sitemap.xml');
  const locations = fs.existsSync(sitemap)
    ? [...fs.readFileSync(sitemap, 'utf8').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match => match[1])
    : [];
  if (locations.filter(location => location === PRIVACY_URL).length !== 1) {
    throw new Error('ReleaseReady公開必須ページをsitemap.xmlへ1件登録してください');
  }
  return { path: PRIVACY_PATH, canonical: PRIVACY_URL };
}

if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '..', 'public-build'));
  try {
    verifyReleaseReadyPrivacy(root);
    console.log('ReleaseReady公開必須ページとsitemap.xmlを確認しました。');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { PRIVACY_PATH, PRIVACY_URL, verifyReleaseReadyPrivacy };

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  isEducationPage,
  findTrackingSignals,
  auditDormantAffiliateCard,
  auditEducationFiles,
} = require('../scripts/education-no-tracking.cjs');

function writeFixture(root, relativePath, content) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}



test('広告、GA4、共通解析ローダー、イベント送信を検知する', () => {
  const violations = [
    '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>',
    '<script src="https://www.googletagmanager.com/gtag/js?id=G-TESTTEST"></script>',
    '<script defer src="/analytics.js"></script>',
    '<script defer src="../../analytics.js"></script>',
    '<script defer src="https://katakatalab.com/analytics.js"></script>',
    "window.gtag('config', 'G-TESTTEST');",
    "window.dataLayer = window.dataLayer || [];",
    "navigator.sendBeacon('/collect', '{}');",
    "window.KatakataAnalytics.track('visit');",
  ];
  for (const example of violations) {
    assert.ok(findTrackingSignals(example).length, example);
  }
  assert.deepEqual(findTrackingSignals('<script src="/pikalab/script.js"></script>'), []);
  assert.deepEqual(findTrackingSignals('このページでは広告・アクセス解析タグを読み込みません。'), []);
});



test('保護者向けAmazonリンクが残っていても教育エリアでは必ず非表示にする', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'educational-affiliate-'));
  try {
    writeFixture(root, 'pikalab/js/app-data.json', JSON.stringify({
      apps: [{ isAmazonCard: true, amazonLinks: [{ url: 'https://amazon.co.jp/?tag=example' }] }],
    }));
    writeFixture(root, 'pikalab/js/constants.js', 'export const SHOW_AMAZON_ASSOCIATE_CARD = false;');
    writeFixture(root, 'pikalab/js/apps.js', 'if (app.isAmazonCard) return SHOW_AMAZON_ASSOCIATE_CARD;');
    assert.deepEqual(auditDormantAffiliateCard(root), []);

    writeFixture(root, 'pikalab/js/constants.js', 'export const SHOW_AMAZON_ASSOCIATE_CARD = true;');
    assert.match(auditDormantAffiliateCard(root).join('\n'), /常に非表示/);

    writeFixture(root, 'pikalab/js/constants.js', 'export const SHOW_AMAZON_ASSOCIATE_CARD = false;');
    writeFixture(root, 'pikalab/js/apps.js', 'return true;');
    assert.match(auditDormantAffiliateCard(root).join('\n'), /表示前に除外/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});









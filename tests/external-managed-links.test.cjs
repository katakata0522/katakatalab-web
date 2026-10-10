'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EXTERNAL_MANAGED_PATH_PREFIXES,
  auditInternalLinks,
  isExternallyManagedPath,
} = require('../scripts/audit-publisher-quality.cjs');

test('外部管理のAsobi Pocketは同一オリジンでもrepo内HTMLを要求しない', () => {
  assert.ok(EXTERNAL_MANAGED_PATH_PREFIXES.includes('/asobi-pocket/'));
  assert.equal(isExternallyManagedPath('/asobi-pocket/'), true);
  assert.equal(isExternallyManagedPath('/asobi-pocket/seo/ito-odai.html'), true);

  const findings = auditInternalLinks(
    '<a href="asobi-pocket/">あそびポケット</a>',
    new URL('https://katakatalab.com/')
  );
  assert.deepEqual(findings, []);
});

test('通常の欠損内部リンクは引き続き検出する', () => {
  const findings = auditInternalLinks(
    '<a href="missing-publisher-audit-page/">missing</a>',
    new URL('https://katakatalab.com/')
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /内部リンク先のHTMLがありません/);
});

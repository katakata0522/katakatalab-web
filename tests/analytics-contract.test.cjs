'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(root, 'docs', 'analytics-event-contract.json'), 'utf8'),
);
const analytics = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8');

test('GA4イベント契約は命名上限とPII禁止を守る', () => {
  const forbidden = new Set(contract.privacy.forbidden_parameters);

  for (const [eventName, definition] of Object.entries(contract.events)) {
    assert.ok(eventName.length <= 40, `${eventName} は40文字以内にしてください`);
    assert.match(eventName, /^[a-z][a-z0-9_]*$/, `${eventName} はsnake_caseにしてください`);

    for (const parameter of definition.params) {
      assert.ok(parameter.length <= 40, `${parameter} は40文字以内にしてください`);
      assert.match(parameter, /^[a-z][a-z0-9_]*$/, `${parameter} はsnake_caseにしてください`);
      assert.equal(forbidden.has(parameter), false, `${parameter} は送信禁止です`);
    }
  }
});

test('GA4カスタム定義は低基数または数値だけに限定する', () => {
  const dimensions = contract.custom_definitions_recommended.filter((item) => item.type === 'dimension');
  const metrics = contract.custom_definitions_recommended.filter((item) => item.type === 'metric');

  assert.ok(dimensions.length <= 10, 'カスタムディメンションを増やしすぎないでください');
  assert.ok(metrics.length <= 10, 'カスタム指標を増やしすぎないでください');

  for (const item of dimensions) {
    assert.equal(item.cardinality, 'low', `${item.parameter} は低基数に限定してください`);
  }

  for (const item of metrics) {
    assert.ok(['numeric', 'fixed'].includes(item.cardinality), `${item.parameter} は数値系に限定してください`);
  }
});

test('GA4タグは広告向けシグナルを無効化し、旧anonymize_ip設定を持たない', () => {
  assert.match(analytics, /allow_google_signals:\s*false/);
  assert.match(analytics, /allow_ad_personalization_signals:\s*false/);
  assert.doesNotMatch(analytics, /anonymize_ip/);
  assert.match(analytics, /page_referrer:\s*sanitizePageReferrer\(document\.referrer\)/);
  assert.match(analytics, /if \(url\.origin === window\.location\.origin\)/);
});

test('自由入力本文をGA4イベントへ渡す実装を持たない', () => {
  assert.doesNotMatch(analytics, /search_term\s*:/);
  assert.doesNotMatch(analytics, /input_value\s*:/);
  assert.doesNotMatch(analytics, /query_text\s*:/);
  assert.doesNotMatch(analytics, /tool_q/);
});

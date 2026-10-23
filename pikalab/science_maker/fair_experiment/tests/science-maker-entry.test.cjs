'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Science Makerの診断ステップを保ち、実験探偵への案内が一つだけある', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  assert.equal((html.match(/id="fair-experiment-entry"/g) || []).length, 1);
  assert.match(html, /href="\.\/fair_experiment\/"/);
  for (const id of ['step-quiz', 'step-results', 'step-plan']) assert.match(html, new RegExp('id="' + id + '"'));
});

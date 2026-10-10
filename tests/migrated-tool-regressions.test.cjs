'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');





test('Kids Smile Landは同一オリジンのGETだけをキャッシュし保存値を正規化する', () => {
  const serviceWorker = read('pwa-runtime.js');
  const app = read('lab-tools', 'kids-smile-land', 'app.js');

  assert.match(serviceWorker, /request\.method !== 'GET'/);
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.match(app, /readStoredOption/);
  assert.match(app, /navigator\.userActivation\s*&&\s*!navigator\.userActivation\.hasBeenActive/);
  assert.match(app, /readStoredNumber/);
  assert.match(app, /readStoredText/);
  assert.match(app, /\['easy', 'normal', 'hard'\]/);
  assert.match(app, /\[0, 5, 15, 30, 45\]/);
});





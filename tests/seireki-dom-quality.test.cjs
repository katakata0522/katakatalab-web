const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers/repository.cjs');

test('西暦の履歴書コピーはonclick文字列連結を使わない', () => {
  const script = read('seireki/script.js');
  assert.doesNotMatch(script, /onclick="copySingleResume/);
  assert.match(script, /addEventListener\('click'/);
  assert.match(script, /SeirekiLogic が読み込まれていません|!Logic/);
});

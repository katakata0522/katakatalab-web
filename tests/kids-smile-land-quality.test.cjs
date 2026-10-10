const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers/repository.cjs');

test('キッズスマイルは年齢と鳴き声の約束を実装に合わせる', () => {
  const app = read('lab-tools/kids-smile-land/app.js');
  const html = read('lab-tools/kids-smile-land/index.html');

  assert.match(app, /readStoredOption\('smile_level', \['easy', 'normal', 'hard'\], 'easy'\)/);
  assert.match(html, /おもちゃの音/);
  assert.doesNotMatch(html, /あんしん・あんぜんローカルちいく/);
  assert.doesNotMatch(app, /すべての知育学習をやりとげ/);
  assert.match(app, /あそんだ きろく/);
  assert.match(html, /id="btn-peel-sticker"/);
  assert.match(app, /count_corrects|kazueCorrect|plays\.count/);
  assert.match(html, /PikaLab|ちいくひろば/);
  assert.match(html, /クラウドの声/);
  assert.doesNotMatch(app, /fa-solid fa-circle-check/);
  assert.match(app, /switchTab\('home',\s*\{\s*silent:\s*true\s*\}\)/);
});

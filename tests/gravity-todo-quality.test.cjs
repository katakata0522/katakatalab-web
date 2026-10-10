const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers/repository.cjs');

test('Gravity TODOはスワイプ爆破を持たずピン留めも操作できる', () => {
  const interaction = read('lab-tools/gravity-todo/src/InteractionManager.js');
  const physics = read('lab-tools/gravity-todo/src/PhysicsEngine.js');
  const html = read('lab-tools/gravity-todo/index.html');

  assert.doesNotMatch(interaction, /スワイプで爆破/);
  assert.doesNotMatch(interaction, /distance >= 60 && elapsed <= 700/);
  assert.match(interaction, /body\.label === 'task'/);
  assert.doesNotMatch(interaction, /!body\.isStatic && body\.label === 'task'/);
  assert.match(physics, /完了を取り消しました|タスクを完了しました/);
  assert.match(html, /input-meta/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1\.0/);
  assert.match(html, /演出付きの実験/);
  assert.match(html, /id="sfx-mute-btn"/);
});

test('Gravity TODOは閉じる直前に保存し失敗を画面へ出す', () => {
  const physics = read('lab-tools/gravity-todo/src/PhysicsEngine.js');
  const storage = read('lab-tools/gravity-todo/src/StorageManager.js');
  const html = read('lab-tools/gravity-todo/index.html');

  assert.match(physics, /visibilitychange|pagehide/);
  assert.match(storage, /ok:\s*false|saveError|保存できませんでした/);
  assert.match(html, /id="save-status"/);
  assert.match(physics, /isDemo:\s*true|demoOnly|persist:\s*false[\s\S]*firstVisit/);
  assert.match(physics, /shouldPersistTaskState/);
});

test('Gravity TODOはMatter.jsを自己ホストする', () => {
  const html = read('lab-tools/gravity-todo/index.html');
  const sw = read('lab-tools/gravity-todo/sw.js');
  assert.match(html, /src="vendor\/matter\.min\.js"/);
  assert.doesNotMatch(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/matter-js/);
  assert.match(sw, /vendor\/matter\.min\.js/);
});

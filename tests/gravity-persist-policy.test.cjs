const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldPersistTaskState } = require('../lab-tools/gravity-todo/src/persistPolicy.js');

test('初回デモだけのときは保存しない', () => {
  assert.equal(shouldPersistTaskState({ persistableCount: 0, userMutated: false }), false);
});

test('ユーザーが本物のタスクを足したあとは保存する', () => {
  assert.equal(shouldPersistTaskState({ persistableCount: 2, userMutated: true }), true);
});

test('ユーザーが全部消したあとは空でも保存する', () => {
  assert.equal(shouldPersistTaskState({ persistableCount: 0, userMutated: true }), true);
});

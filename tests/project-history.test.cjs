const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { repositoryRoot } = require('./helpers/repository.cjs');

const helperPath = path.join(repositoryRoot, 'project-history.js');

test('最近使ったツールの履歴ヘルパーが用意されている', () => {
  assert.equal(fs.existsSync(helperPath), true, 'project-history.js が必要です');
});

test('最近使ったツールは新しい順、重複なし、最大3件で保存する', () => {
  const {
    MAX_RECENT_PROJECTS,
    readRecentProjectIds,
    recordRecentProject,
  } = require(helperPath);
  const storage = new MapStorage();

  recordRecentProject(storage, 'qrcode');
  recordRecentProject(storage, 'password-generator');
  recordRecentProject(storage, 'qrcode');
  recordRecentProject(storage, 'text-diff');
  recordRecentProject(storage, 'aspect-ratio');

  assert.equal(MAX_RECENT_PROJECTS, 3);
  assert.deepEqual(readRecentProjectIds(storage), ['aspect-ratio', 'text-diff', 'qrcode']);
});

test('不正なJSONや保存エラーが画面の操作を壊さない', () => {
  const { readRecentProjectIds, recordRecentProject } = require(helperPath);
  const brokenStorage = new MapStorage();
  brokenStorage.setItem('katakatalab.recent-projects.v1', '{broken');
  assert.deepEqual(readRecentProjectIds(brokenStorage), []);

  const throwingStorage = {
    getItem() { throw new Error('storage unavailable'); },
    setItem() { throw new Error('storage unavailable'); },
  };
  assert.deepEqual(readRecentProjectIds(throwingStorage), []);
  assert.deepEqual(recordRecentProject(throwingStorage, 'qrcode'), []);
});

class MapStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

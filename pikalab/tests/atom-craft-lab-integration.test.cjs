'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('カタログ・トップ入口・サイトマップに新教材が存在する', () => {
  const app = JSON.parse(read('js/app-data.json')).apps.find(item => item.id === 'atom-craft-lab');
  assert.ok(app);
  assert.equal(app.url, 'atom_craft_lab/');
  assert.ok(app.categories.includes('rikei') && app.categories.includes('middle'));
  assert.equal(app.indexable, true);
  assert.match(read('index.html'), /href="atom_craft_lab\//);
  for (const file of ['sitemap.xml', 'public/sitemap.xml']) {
    assert.match(read(file), /https:\/\/katakatalab\.com\/pikalab\/atom_craft_lab\//);
  }
});

test('専用CSSとローカルJSを使い、広告・外部解析を含まない', () => {
  const html = read('atom_craft_lab/index.html');
  assert.match(html, /href="\.\/tailwind\.generated\.css"/);
  assert.match(html, /src="\.\/js\/app\.js"/);
  assert.match(html, /href="https:\/\/katakatalab\.com\/pikalab\/atom_craft_lab\//);
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com|adsbygoogle|googletagmanager|google-analytics/);
  assert.match(read('atom_craft_lab/tailwind.config.cjs'), /darkMode:\s*'class'/);
  assert.match(read('package.json'), /build-atom-craft-css\.cjs/);
});

test('8種類の物質と8ステージの操作が残る', () => {
  const data = read('atom_craft_lab/js/data.js');
  assert.match(data, /MOLECULE_RECIPES/);
  assert.match(data, /BALANCE_STAGES/);
  assert.match(read('atom_craft_lab/index.html'), /data-action="synthesize-molecule"/);
});

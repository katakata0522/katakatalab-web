const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'tailwind.input.css'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/style.css'), 'utf8');
test('保存キーは保存データ読み込みより前に初期化される', () => {
  assert.ok(app.indexOf('const STORAGE_KEY =') < app.indexOf('solved: readSolved()'));
});
test('選択時にラジオを再生成せず、フォーカスを守る', () => {
  const section = app.slice(app.indexOf('function handleSelect('), app.indexOf('function handleHint('));
  assert.doesNotMatch(section, /\brender\(\)/);
  assert.match(section, /progress.selected = event.target.value/);
});
test('図版の広い余白とSVG A/Bラベル配置を確保する', () => {
  assert.match(app, /viewBox="0 0 640 320"/);
  assert.match(css, /Experiment Detective v3: collision-safe layout refinement/);
  assert.match(source, /Experiment Detective v3: collision-safe layout refinement/);
});

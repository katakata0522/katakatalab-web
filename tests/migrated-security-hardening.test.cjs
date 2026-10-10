const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');



test('KidsのSVG出力はXMLエスケープと名前長制限を持つ', () => {
  const html = read('lab-tools', 'kids-smile-land', 'index.html');
  const app = read('lab-tools', 'kids-smile-land', 'app.js');
  assert.match(html, /id="parent-kids-name"[^>]*maxlength="30"/);
  assert.match(app, /function escapeXml/);
  assert.match(app, /escapeXml\(smileKidsName\)/);
});



test('Gravity TODOは復元時にもタスク上限を適用する', () => {
  const physics = read('lab-tools', 'gravity-todo', 'src', 'PhysicsEngine.js');
  assert.match(physics, /MAX_RESTORED_TASKS/);
  assert.match(physics, /slice\(0,\s*MAX_RESTORED_TASKS\)/);
});





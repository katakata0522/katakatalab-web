const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('指定されたCode Studio操作は44pxの実タップ領域を持つ', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /\.resizer\s*\{[^}]*width:\s*44px[^}]*\}/s);
  assert.match(html, /\.snap-btn\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px[^}]*\}/s);
  assert.doesNotMatch(html, /\.snap-btn\s*\{[^}]*margin-inline:\s*-16px/s);
  assert.match(html, /\[data-sim="pc"\]\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px[^}]*\}/s);
});

test('Code Studio本体の設定保存アクセスは例外安全な関数を通る', () => {
  const source = fs.readFileSync(path.join(root, 'assets', 'code-studio.js'), 'utf8');
  assert.match(source, /safeStorageGet/);
  assert.match(source, /safeStorageSet/);
  assert.doesNotMatch(source, /if \(!hasData && localStorage\.getItem\(storageKey\)\)/);
  assert.doesNotMatch(source, /const savedFontSize = localStorage\.getItem\('pikalab_editor_fontsize'\)/);
});

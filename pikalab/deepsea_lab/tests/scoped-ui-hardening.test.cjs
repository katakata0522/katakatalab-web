const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('初期表示に空src画像を置かない', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<img\b[^>]*\bsrc\s*=\s*["']\s*["']/i);
});

test('横探索領域をscroll-container内に閉じ込める', () => {
  const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
  assert.match(css, /#scroll-container\s*\{[^}]*max-width:\s*100%[^}]*overscroll-behavior:\s*contain/s);
});

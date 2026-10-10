const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('初期表示と画像タイムアウト処理に空srcを残さない', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'canvas-renderer.js'), 'utf8');
  assert.doesNotMatch(html, /<img\b[^>]*\bsrc\s*=\s*["']\s*["']/i);
  assert.doesNotMatch(renderer, /img\.src\s*=\s*["']\s*["']/);
  assert.match(renderer, /img\.removeAttribute\(['"]src['"]\)/);
});

test('横長の宇宙マップを専用viewport内に閉じ込める', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(html, /id="space-map-viewport"[\s\S]*id="space-canvas"[\s\S]*id="a11y-container"/);
  assert.match(css, /#space-map-viewport\s*\{[^}]*overflow:\s*hidden/s);
});

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


test('図鑑は探索を円形サムネイル、詳細を全体表示に分け、確認済み写真だけ出典を表示できる', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const album = fs.readFileSync(path.join(root, 'js', 'components', 'AlbumManager.ts'), 'utf8');
  const data = fs.readFileSync(path.join(root, 'js', 'data.ts'), 'utf8');

  assert.match(album, /rounded-full overflow-hidden/);
  assert.match(album, /object-cover/);
  assert.match(html, /id="modal-creature-img"[^>]*object-contain/);
  assert.match(html, /id="sea-photo-credit"/);
  assert.match(data, /imageCredit\?: string/);
  assert.match(data, /imageSourceUrl\?: string/);
  assert.match(html, /id="sea-photo-source"[^>]*rel="noopener noreferrer"/);
});

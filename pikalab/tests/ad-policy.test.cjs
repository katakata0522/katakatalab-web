'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pikalabRoot = path.resolve(__dirname, '..');
const skippedDirectories = new Set(['node_modules', 'dist', 'visual-guard-artifacts', '.code-studio', '.kotoba']);

function collectHtml(directory, results = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectHtml(absolutePath, results);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) results.push(absolutePath);
  }
  return results;
}

test('PikaLabの全HTMLは広告スクリプトを読み込まない', () => {
  const htmlFiles = collectHtml(pikalabRoot);
  assert.ok(htmlFiles.length > 0, 'PikaLab配下のHTMLを列挙できていません');
  assert.ok(
    htmlFiles.some((filePath) => path.relative(pikalabRoot, filePath).replaceAll('\\', '/') === 'index.html'),
    'PikaLabトップが広告監査対象に含まれていません'
  );

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(
      html,
      /pagead2\.googlesyndication\.com|adsbygoogle/,
      `${path.relative(pikalabRoot, filePath)} に広告スクリプトがあります`
    );
  }
});

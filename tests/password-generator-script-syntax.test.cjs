const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT_PATH = path.join(__dirname, '..', 'password-generator', 'script.js');

test('パスワード生成ページのメインモジュールはES Moduleとして構文エラーなく解析できる', () => {
  const source = fs.readFileSync(SCRIPT_PATH, 'utf8');
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: source,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `password-generator/script.js にJavaScript構文エラーがあります\n${String(result.stderr || '')}`,
  );
});

test('コピー処理は失敗を外側で捕捉してページ全体へ例外を漏らさない', () => {
  const source = fs.readFileSync(SCRIPT_PATH, 'utf8');
  const start = source.indexOf('async function copyTextWithPrivacy');
  const end = source.indexOf('\n    function fallbackCopyText', start);

  assert.ok(start >= 0 && end > start, 'copyTextWithPrivacyの定義が見つかりません');
  const functionSource = source.slice(start, end);

  assert.match(functionSource, /\{\s*try\s*\{/s);
  assert.match(functionSource, /catch\s*\([^)]*\)\s*\{/);
  assert.match(functionSource, /showToast\(['"]コピーに失敗しました['"],\s*['"]error['"]\)/);
});

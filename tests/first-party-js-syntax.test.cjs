const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const EXCLUDED_DIRS = new Set([
  '.git', '.github', '.vscode',
  'node_modules', 'dist', 'build', 'coverage',
  'docs', 'tests', 'reports', 'books', 'scratch',
  'vendor', 'vendors', 'third_party', 'third-party',
]);
const EXCLUDED_FILE_PATTERNS = [
  /\.min\.js$/i,
  /[/\\]vendor[/\\]/i,
  /[/\\]vendors[/\\]/i,
];

function collectJavaScriptFiles(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      collectJavaScriptFiles(path.join(dir, entry.name), output);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(REPO_ROOT, fullPath);
    if (EXCLUDED_FILE_PATTERNS.some(pattern => pattern.test(relative))) continue;
    output.push(fullPath);
  }
  return output;
}

function runSyntaxCheck(source, args) {
  return spawnSync(process.execPath, args, {
    input: source,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

function checkSyntax(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');

  const scriptResult = runSyntaxCheck(source, ['--check']);
  if (scriptResult.status === 0) {
    return { ok: true, stderr: '' };
  }

  const moduleResult = runSyntaxCheck(source, ['--check', '--input-type=module']);
  if (moduleResult.status === 0) {
    return { ok: true, stderr: '' };
  }

  const scriptError = String(scriptResult.stderr || '').trim();
  const moduleError = String(moduleResult.stderr || '').trim();
  return {
    ok: false,
    stderr: `classic script parse failed:\n${scriptError}\n\nES module parse failed:\n${moduleError}`,
  };
}

test('first-party JavaScriptは本番投入前に構文エラーがないことを一括確認する', () => {
  const files = collectJavaScriptFiles(REPO_ROOT).sort();

  // 件数ではなく、ルート・ツール・PikaLabの代表ファイルを実際に列挙できることを確認する。
  const relativeFiles = new Set(
    files.map((filePath) => path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/')),
  );
  for (const expected of ['script.js', 'password-generator/script.js', 'pikalab/color_lab/script.js']) {
    assert.ok(relativeFiles.has(expected), `構文監査対象に ${expected} が含まれていません`);
  }

  const failures = [];
  for (const filePath of files) {
    const result = checkSyntax(filePath);
    if (result.ok) continue;
    failures.push({
      file: path.relative(REPO_ROOT, filePath),
      error: result.stderr,
    });
  }

  assert.equal(
    failures.length,
    0,
    failures.map(({ file, error }) => `\n--- ${file} ---\n${error}`).join('\n'),
  );
});

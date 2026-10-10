'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PUBLIC_DIRECTORIES } = require('../.github/scripts/build-public-root.cjs');

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'production',
  'coverage',
  'test-results',
]);

function discoverTestsInDirectory(repositoryRoot, directory) {
  const base = path.join(repositoryRoot, directory);
  if (!fs.existsSync(base)) return [];

  const tests = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (!/\.test\.(?:js|cjs|mjs)$/i.test(entry.name)) continue;
      tests.push(path.relative(repositoryRoot, absolutePath).replaceAll('\\', '/'));
    }
  };
  visit(base);
  return tests;
}

function discoverPublicNodeTests(repositoryRoot = path.resolve(__dirname, '..')) {
  return PUBLIC_DIRECTORIES
    .flatMap((directory) => discoverTestsInDirectory(repositoryRoot, directory))
    .sort();
}

function run() {
  const repositoryRoot = path.resolve(__dirname, '..');
  const tests = discoverPublicNodeTests(repositoryRoot);
  if (tests.length === 0) {
    console.error('公開サブプロジェクトのNodeテストが見つかりませんでした。');
    process.exitCode = 1;
    return;
  }

  const result = spawnSync(process.execPath, ['--test', ...tests], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error('公開サブプロジェクトテストの起動に失敗しました。', result.error);
    process.exitCode = 1;
    return;
  }
  process.exitCode = result.status ?? 1;
}

module.exports = { discoverPublicNodeTests };

if (require.main === module) run();

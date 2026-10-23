// このラボ専用CSSをビルドして本番CSP下のCDNブロックを回避する。
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const executable = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
if (!fs.existsSync(executable)) {
  console.error('Tailwind CSS CLIがありません。PikaLabルートで npm ci を実行してください。');
  process.exitCode = 1;
} else {
  const result = spawnSync(executable, [
    '-c', 'atom_craft_lab/tailwind.config.cjs',
    '-i', 'atom_craft_lab/tailwind.input.css',
    '-o', 'atom_craft_lab/tailwind.generated.css',
    '--minify'
  ], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) {
    console.error('Atom Craft CSSの生成に失敗しました:', result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}

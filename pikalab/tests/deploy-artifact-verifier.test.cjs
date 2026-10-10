'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const verifier = fs.readFileSync(
  path.join(repoRoot, '.github', 'scripts', 'verify_color_lab_deploy.py'),
  'utf8'
);

test('Color Labの本番hash照合はsourceではなく配信済みdistを正本にする', () => {
  assert.match(verifier, /default="pikalab\/dist"/);
  assert.match(verifier, /resolve_artifact_root/);
  assert.match(verifier, /artifact_root \/ relative_path/);
  assert.match(verifier, /\/pikalab\/\{relative_path\}/);
  assert.doesNotMatch(verifier, /repo_root \/ relative_path/);
});

test('Viteでhash化されたstylesheetと実際のscript参照をbuild HTMLから動的に照合する', () => {
  assert.match(verifier, /collect_color_lab_targets/);
  assert.match(verifier, /SCRIPT_SRC_RE/);
  assert.match(verifier, /LINK_TAG_RE/);
  assert.match(verifier, /"stylesheet" not in rel/);
  assert.match(verifier, /resolve_local_reference/);
  assert.doesNotMatch(verifier, /"color_lab\/style\.css"/);
});

test('参照資産が配信成果物外へ抜ける場合や欠損する場合は拒否する', () => {
  assert.match(verifier, /target\.relative_to\(artifact_root\.resolve\(\)\)/);
  assert.match(verifier, /配信成果物外への参照を拒否します/);
  assert.match(verifier, /配信成果物の参照先がありません/);
});

test('配信成果物をリポジトリ外へ差し替える指定は拒否する', () => {
  assert.match(verifier, /artifact_root\.relative_to\(repo_root\)/);
  assert.match(verifier, /配信成果物はリポジトリ内を指定してください/);
});

test('キャッシュ回避済み本番照合は短い有界retryにする', () => {
  assert.match(verifier, /default=3, help="本番取得の一時失敗に対する検証回数"/);
  assert.match(verifier, /default=3, help="検証リトライ間隔（秒）"/);
  assert.doesNotMatch(verifier, /default=18/);
});

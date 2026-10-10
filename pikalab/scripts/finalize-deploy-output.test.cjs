'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  REQUIRED_DEPLOY_ENTRYPOINTS,
  finalizeDeployOutput,
} = require('./finalize-deploy-output.cjs');

function makeFixture() {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-finalize-'));
  const build = path.join(project, 'dist');
  fs.mkdirSync(path.join(build, 'color_lab'), { recursive: true });
  fs.mkdirSync(path.join(build, 'code-studio'), { recursive: true });
  fs.writeFileSync(path.join(build, 'index.html'), '<!doctype html><title>PikaLab</title>');
  fs.writeFileSync(path.join(build, 'color_lab', 'index.html'), '<!doctype html><title>Color Lab</title>');
  fs.writeFileSync(path.join(build, 'code-studio', 'index.html'), '<!doctype html><title>Code Studio</title>');
  fs.writeFileSync(path.join(project, '.htaccess'), 'Options -Indexes\n');
  fs.mkdirSync(path.join(project, '.kotoba', 'assets'), { recursive: true });
  fs.writeFileSync(path.join(project, '.kotoba', 'index.html'), '<!doctype html><title>Kotoba</title>');
  fs.writeFileSync(path.join(project, '.kotoba', 'assets', 'app.js'), 'console.log("kotoba")');
  return { project, build };
}

test('distへ.htaccessとKotobaをまとめて配信可能な成果物にする', () => {
  const { project, build } = makeFixture();
  try {
    finalizeDeployOutput(project, build);
    assert.equal(fs.readFileSync(path.join(build, '.htaccess'), 'utf8'), 'Options -Indexes\n');
    assert.match(fs.readFileSync(path.join(build, 'kotoba', 'index.html'), 'utf8'), /Kotoba/);
    assert.equal(fs.readFileSync(path.join(build, 'kotoba', 'assets', 'app.js'), 'utf8'), 'console.log("kotoba")');
    for (const relativePath of REQUIRED_DEPLOY_ENTRYPOINTS) {
      assert.equal(fs.existsSync(path.join(build, relativePath)), true, relativePath);
    }
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('Color LabやCode Studioなど必須入口が欠けた成果物はデプロイ可能としない', () => {
  const { project, build } = makeFixture();
  try {
    fs.rmSync(path.join(build, 'color_lab', 'index.html'));
    assert.throws(() => finalizeDeployOutput(project, build), /必須入口.*color_lab\/index\.html/);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('dist以外やプロジェクト外を配信先にできない', () => {
  const { project, build } = makeFixture();
  try {
    assert.throws(() => finalizeDeployOutput(project, path.join(project, 'public')), /安全でないPikaLab配信先/);
    assert.throws(() => finalizeDeployOutput(project, path.join(project, '..', 'dist')), /安全でないPikaLab配信先/);
    assert.doesNotThrow(() => finalizeDeployOutput(project, build));
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

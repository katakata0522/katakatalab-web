'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_DEPLOY_ENTRYPOINTS = Object.freeze([
  'index.html',
  'color_lab/index.html',
  'code-studio/index.html',
  'kotoba/index.html',
]);

function isPathInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertSafeDirectoryTree(root) {
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) {
        throw new Error(`配信専用資産にシンボリックリンクは使用できません: ${target}`);
      }
      if (stat.isDirectory()) stack.push(target);
    }
  }
}

function assertRequiredDeployEntrypoints(build) {
  const missing = REQUIRED_DEPLOY_ENTRYPOINTS.filter((relativePath) => (
    !fs.existsSync(path.join(build, relativePath)) || !fs.statSync(path.join(build, relativePath)).isFile()
  ));
  if (missing.length) {
    throw new Error(`PikaLab配信成果物の必須入口がありません: ${missing.join(', ')}`);
  }
}

function finalizeDeployOutput(projectRoot, buildRoot) {
  const project = path.resolve(projectRoot);
  const build = path.resolve(buildRoot);
  if (!isPathInside(project, build) || path.basename(build) !== 'dist') {
    throw new Error(`安全でないPikaLab配信先です: ${build}`);
  }
  if (!fs.existsSync(build) || !fs.statSync(build).isDirectory()) {
    throw new Error(`PikaLab build出力がありません: ${build}`);
  }

  const htaccessSource = path.join(project, '.htaccess');
  const kotobaSource = path.join(project, '.kotoba');
  if (!fs.existsSync(htaccessSource) || !fs.statSync(htaccessSource).isFile()) {
    throw new Error('PikaLab .htaccess が見つかりません');
  }
  if (!fs.existsSync(kotobaSource) || !fs.statSync(kotobaSource).isDirectory()) {
    throw new Error('PikaLab Kotoba公開元が見つかりません');
  }
  assertSafeDirectoryTree(kotobaSource);

  fs.copyFileSync(htaccessSource, path.join(build, '.htaccess'));

  const kotobaDestination = path.join(build, 'kotoba');
  fs.rmSync(kotobaDestination, { recursive: true, force: true });
  fs.cpSync(kotobaSource, kotobaDestination, { recursive: true, dereference: false });

  assertRequiredDeployEntrypoints(build);

  return {
    htaccess: path.join(build, '.htaccess'),
    kotoba: kotobaDestination,
  };
}

if (require.main === module) {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const buildRoot = path.resolve(projectRoot, process.argv[2] || 'dist');
    finalizeDeployOutput(projectRoot, buildRoot);
    console.log(`PikaLab配信成果物を完成しました: ${REQUIRED_DEPLOY_ENTRYPOINTS.join(', ')} + .htaccess`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  REQUIRED_DEPLOY_ENTRYPOINTS,
  assertRequiredDeployEntrypoints,
  finalizeDeployOutput,
  isPathInside,
};

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..', '..');

function resolveRepositoryPath(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new TypeError('リポジトリ内パスは空でない文字列で指定してください');
  }

  const resolvedPath = path.resolve(repositoryRoot, filePath);
  const relativePath = path.relative(repositoryRoot, resolvedPath);
  // テストヘルパー経由の意図しないリポジトリ外読み込みを防ぐ
  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new Error(`リポジトリ外のパスは参照できません: ${filePath}`);
  }

  return resolvedPath;
}

function read(filePath) {
  return fs.readFileSync(resolveRepositoryPath(filePath), 'utf8');
}

function collectHtml(directory, excludedNames = new Set()) {
  if (!(excludedNames instanceof Set)) {
    throw new TypeError('除外名はSetで指定してください');
  }

  const startDirectory = resolveRepositoryPath(directory);
  const visit = (currentDirectory) => fs.readdirSync(currentDirectory, { withFileTypes: true }).flatMap((entry) => {
    if (excludedNames.has(entry.name)) return [];
    const entryPath = path.join(currentDirectory, entry.name);
    if (entry.isDirectory()) return visit(entryPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
  });

  return visit(startDirectory);
}

module.exports = {
  collectHtml,
  read,
  repositoryRoot,
  resolveRepositoryPath,
};

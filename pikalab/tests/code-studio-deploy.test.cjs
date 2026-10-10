const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
    collectReachableCodeStudio,
    copyReachableCodeStudio
} = require('../../.github/scripts/copy-code-studio-reachable.cjs');

test('Code Studio公開用コピーは参照されない旧バンドルを除外する', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'code-studio-copy-'));
    const source = path.join(tempRoot, 'source');
    const destination = path.join(tempRoot, 'dist', 'code-studio');
    fs.mkdirSync(path.join(source, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(source, 'index.html'), '<script src="./assets/current.js"></script>');
    fs.writeFileSync(path.join(source, 'assets', 'current.js'), 'new URL("./worker.js", import.meta.url)');
    fs.writeFileSync(path.join(source, 'assets', 'worker.js'), 'self.onmessage = () => {};');
    fs.writeFileSync(path.join(source, 'assets', 'old.js'), 'console.log("old");');

    const result = copyReachableCodeStudio(source, destination);

    assert.equal(result.copiedFiles, 3);
    assert.equal(fs.existsSync(path.join(destination, 'index.html')), true);
    assert.equal(fs.existsSync(path.join(destination, 'assets', 'current.js')), true);
    assert.equal(fs.existsSync(path.join(destination, 'assets', 'worker.js')), true);
    assert.equal(fs.existsSync(path.join(destination, 'assets', 'old.js')), false);
});

test('Code Studioの生成資産は現行index.htmlから到達できるものだけを置く', () => {
    const source = path.resolve(__dirname, '..', '.code-studio');
    const assetRoot = path.join(source, 'assets');
    const { sourceFiles, reachableFiles } = collectReachableCodeStudio(source);
    const reachable = new Set(reachableFiles);
    const unreachableAssets = sourceFiles
        .filter((file) => file.startsWith(`${assetRoot}${path.sep}`) && !reachable.has(file))
        .map((file) => path.relative(assetRoot, file).replaceAll('\\', '/'))
        .sort();

    assert.deepEqual(unreachableAssets, [], `未参照のCode Studio資産: ${unreachableAssets.join(', ')}`);
});

test('通常ビルドがCode Studioをdistへ含め、デプロイ時の後挿入に依存しない', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));

    assert.match(packageJson.scripts.build, /sync-seo-metadata\.cjs/);
    assert.match(packageJson.scripts.build, /copy-code-studio-reachable\.cjs/);
});

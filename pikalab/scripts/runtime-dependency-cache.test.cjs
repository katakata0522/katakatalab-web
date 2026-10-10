'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { collectTransitiveScriptReferences, verifyBuildOutput } = require('./verify-build-output.cjs');
const { copyMissingRuntimeAssets } = require('./copy-build-runtime-assets.cjs');
const { collectReachableCodeStudio } = require('../../.github/scripts/copy-code-studio-reachable.cjs');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-dependency-cache-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}

function write(root, name, content = '') {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
}

function pages(root) {
    write(root, 'index.html', '<link rel="manifest" href="manifest.webmanifest">');
    write(root, 'manifest.webmanifest', '{}');
    write(root, 'a/index.html', '<script src="../common/start.js"></script>');
    write(root, 'b/index.html', '<script src="../common/start.js?v=2"></script>');
}

test('同じJSは一度だけ解析し、相対依存は各HTMLの位置で解決する', (t) => {
    const root = fixture(t);
    pages(root);
    const shared = write(root, 'common/start.js', 'loadScript("./nested.js");');
    write(root, 'a/nested.js', 'loadScript("./leaf-a.js");');
    write(root, 'b/nested.js', 'loadScript("./leaf-b.js");');
    write(root, 'a/leaf-a.js');
    const leafB = write(root, 'b/leaf-b.js');
    const originalRead = fs.readFileSync;
    let sharedReads = 0;
    t.mock.method(fs, 'readFileSync', (...args) => {
        if (args[0] === shared) sharedReads += 1;
        return originalRead(...args);
    });
    assert.equal(verifyBuildOutput(root).htmlFiles, 3);
    assert.equal(sharedReads, 1);
    fs.unlinkSync(leafB);
    assert.throws(() => verifyBuildOutput(root), /b\/index.html.*leaf-b\.js/);
    fs.writeFileSync(shared, 'loadScript("./changed.js");');
    assert.throws(() => verifyBuildOutput(root), /changed\.js/);
});

test('循環・重複のある依存も発見順と参照文字列を維持して終了する', (t) => {
    const root = fixture(t);
    write(root, 'a.js', 'loadScript("./b.js"); loadScript("./c.js");');
    write(root, 'b.js', 'loadScript("./a.js"); loadScript("./c.js");');
    write(root, 'c.js', 'loadScript("./b.js");');
    assert.deepEqual(collectTransitiveScriptReferences(root, path.join(root, 'index.html'), ['./a.js', './a.js']),
        ['./b.js', './c.js', './a.js']);
});

test('共有解析を使うコピー処理も各HTMLの依存とService Workerを揃える', (t) => {
    const root = fixture(t);
    const source = path.join(root, 'source');
    const build = path.join(root, 'dist');
    pages(source);
    pages(build);
    write(source, 'common/start.js', 'loadScript("./nested.js"); navigator.serviceWorker.register("./sw.js");');
    write(source, 'a/nested.js', 'loadScript("./leaf-a.js");');
    write(source, 'b/nested.js', 'loadScript("./leaf-b.js");');
    write(source, 'a/leaf-a.js');
    write(source, 'b/leaf-b.js');
    write(source, 'a/sw.js', '// a worker');
    write(source, 'b/sw.js', '// b worker');
    assert.deepEqual(copyMissingRuntimeAssets(source, build), [
        'a/leaf-a.js', 'a/nested.js', 'a/sw.js', 'b/leaf-b.js', 'b/nested.js', 'b/sw.js', 'common/start.js',
    ]);
    assert.doesNotThrow(() => verifyBuildOutput(build));
    assert.deepEqual(copyMissingRuntimeAssets(source, build), []);
    fs.unlinkSync(path.join(build, 'b/leaf-b.js'));
    assert.deepEqual(copyMissingRuntimeAssets(source, build), ['b/leaf-b.js']);
});

test('外部URLとルート外参照を共有解析経由でも読み込まない', (t) => {
    const root = fixture(t);
    const originalRead = fs.readFileSync;
    const reads = [];
    t.mock.method(fs, 'readFileSync', (...args) => {
        reads.push(args[0]);
        return originalRead(...args);
    });
    assert.deepEqual(collectTransitiveScriptReferences(root, path.join(root, 'index.html'),
        ['https://example.com/a.js', '../outside.js', './missing.js']), []);
    assert.deepEqual(reads, []);
});

test('Code Studioは循環と同名資産を持っても到達順・到達対象を維持する', (t) => {
    const root = fixture(t);
    write(root, 'index.html', '<script src="a.js"></script><script src="a.js"></script><link href="b.css">');
    write(root, 'a.js', '"b.css"; "same.js"; "a.js";');
    write(root, 'b.css', '/* same.js */');
    write(root, 'first/same.js', '"a.js"');
    write(root, 'second/same.js', '"a.js"');
    write(root, 'unused.js');
    const result = collectReachableCodeStudio(root);
    assert.deepEqual(result.reachableFiles.map(file => path.relative(root, file).replaceAll('\\', '/')),
        ['index.html', 'a.js', 'b.css', 'first/same.js', 'second/same.js']);
});

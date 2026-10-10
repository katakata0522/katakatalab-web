const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { copyMissingRuntimeAssets } = require('../scripts/copy-build-runtime-assets.cjs');

test('Viteが処理しない従来scriptを同じ相対位置へコピーする', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-runtime-assets-'));
    const sourceRoot = path.join(fixture, 'source');
    const buildRoot = path.join(fixture, 'dist');
    fs.mkdirSync(path.join(sourceRoot, 'lab'), { recursive: true });
    fs.mkdirSync(path.join(buildRoot, 'lab'), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'lab', 'app.js'), 'window.appLoaded = true;');
    fs.writeFileSync(path.join(sourceRoot, 'shared.js'), 'window.sharedLoaded = true;');
    fs.writeFileSync(
        path.join(buildRoot, 'lab', 'index.html'),
        '<script src="app.js"></script><script src="../shared.js?v=1"></script>'
    );

    const copied = copyMissingRuntimeAssets(sourceRoot, buildRoot);

    assert.deepEqual(copied.sort(), ['lab/app.js', 'shared.js']);
    assert.equal(fs.readFileSync(path.join(buildRoot, 'lab', 'app.js'), 'utf8'), 'window.appLoaded = true;');
    assert.equal(fs.readFileSync(path.join(buildRoot, 'shared.js'), 'utf8'), 'window.sharedLoaded = true;');
});

test('従来scriptが登録するService Workerも公開先へコピーする', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-runtime-sw-'));
    const sourceRoot = path.join(fixture, 'source');
    const buildRoot = path.join(fixture, 'dist');
    fs.mkdirSync(path.join(sourceRoot, 'lab'), { recursive: true });
    fs.mkdirSync(path.join(buildRoot, 'lab'), { recursive: true });
    fs.writeFileSync(
        path.join(sourceRoot, 'lab', 'app.js'),
        "navigator.serviceWorker.register('./sw.js');"
    );
    fs.writeFileSync(path.join(sourceRoot, 'lab', 'sw.js'), 'self.skipWaiting();');
    fs.writeFileSync(
        path.join(buildRoot, 'lab', 'index.html'),
        '<script src="./app.js"></script>'
    );

    const copied = copyMissingRuntimeAssets(sourceRoot, buildRoot);

    assert.deepEqual(copied.sort(), ['lab/app.js', 'lab/sw.js']);
    assert.equal(fs.readFileSync(path.join(buildRoot, 'lab', 'sw.js'), 'utf8'), 'self.skipWaiting();');
});


test('new URLで動的に読む同階層scriptも公開先へコピーする', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-runtime-new-url-'));
    const sourceRoot = path.join(fixture, 'source');
    const buildRoot = path.join(fixture, 'dist');
    fs.mkdirSync(path.join(sourceRoot, 'lab'), { recursive: true });
    fs.mkdirSync(path.join(buildRoot, 'lab'), { recursive: true });
    fs.writeFileSync(
        path.join(sourceRoot, 'lab', 'app.js'),
        "const baseUrl = new URL('.', document.currentScript.src); const core = new URL('script-core.js', baseUrl); const support = new URL('summer-support.js', baseUrl);"
    );
    fs.writeFileSync(path.join(sourceRoot, 'lab', 'script-core.js'), 'window.coreLoaded = true;');
    fs.writeFileSync(path.join(sourceRoot, 'lab', 'summer-support.js'), 'window.supportLoaded = true;');
    fs.writeFileSync(path.join(buildRoot, 'lab', 'index.html'), '<script src="app.js"></script>');

    const copied = copyMissingRuntimeAssets(sourceRoot, buildRoot);

    assert.deepEqual(copied.sort(), ['lab/app.js', 'lab/script-core.js', 'lab/summer-support.js']);
    assert.equal(fs.readFileSync(path.join(buildRoot, 'lab', 'script-core.js'), 'utf8'), 'window.coreLoaded = true;');
    assert.equal(fs.readFileSync(path.join(buildRoot, 'lab', 'summer-support.js'), 'utf8'), 'window.supportLoaded = true;');
});

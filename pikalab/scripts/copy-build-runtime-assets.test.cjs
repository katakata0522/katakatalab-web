const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { copyMissingRuntimeAssets } = require('./copy-build-runtime-assets.cjs');
const { verifyBuildOutput } = require('./verify-build-output.cjs');

test('copies and verifies transitively loaded classic scripts and styles', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-runtime-assets-'));
    const source = path.join(tempRoot, 'source');
    const build = path.join(tempRoot, 'dist');

    try {
        fs.mkdirSync(path.join(source, 'js'), { recursive: true });
        fs.mkdirSync(path.join(source, 'assets'), { recursive: true });
        fs.mkdirSync(path.join(build, 'js'), { recursive: true });

        const html = '<!doctype html><html><head><link rel="manifest" href="manifest.webmanifest"></head><body><script src="js/audio.js"></script></body></html>';
        fs.writeFileSync(path.join(source, 'index.html'), html);
        fs.writeFileSync(path.join(build, 'index.html'), html);
        fs.writeFileSync(path.join(source, 'manifest.webmanifest'), '{}');
        fs.writeFileSync(path.join(build, 'manifest.webmanifest'), '{}');

        const audio = "loadScript('./js/roles.js?v=1'); window.PikaLabToneLoader.load('./assets/tone-14.8.49.js');";
        const roles = "loadScript('./js/ux.js?v=1');";
        const ux = "const link=document.createElement('link'); link.href='./ux.css?v=1'; loadScript('./js/exposure.js?v=1');";
        const exposure = 'window.ExposureReady = true;';
        const style = '.runtime-style{display:block}';
        const tone = 'window.Tone = {};';
        fs.writeFileSync(path.join(source, 'js', 'audio.js'), audio);
        fs.writeFileSync(path.join(source, 'js', 'roles.js'), roles);
        fs.writeFileSync(path.join(source, 'js', 'ux.js'), ux);
        fs.writeFileSync(path.join(source, 'js', 'exposure.js'), exposure);
        fs.writeFileSync(path.join(source, 'ux.css'), style);
        fs.writeFileSync(path.join(source, 'assets', 'tone-14.8.49.js'), tone);
        fs.writeFileSync(path.join(build, 'js', 'audio.js'), audio);

        assert.throws(
            () => verifyBuildOutput(build, { expectedHtmlFiles: 1 }),
            /参照先がありません.*roles\.js/,
            'verifier should report the missing first dynamic dependency'
        );

        const copied = copyMissingRuntimeAssets(source, build);
        assert.deepEqual(copied, ['assets/tone-14.8.49.js', 'js/exposure.js', 'js/roles.js', 'js/ux.js', 'ux.css']);
        assert.equal(fs.readFileSync(path.join(build, 'js', 'roles.js'), 'utf8'), roles);
        assert.equal(fs.readFileSync(path.join(build, 'js', 'ux.js'), 'utf8'), ux);
        assert.equal(fs.readFileSync(path.join(build, 'js', 'exposure.js'), 'utf8'), exposure);
        assert.equal(fs.readFileSync(path.join(build, 'ux.css'), 'utf8'), style);
        assert.equal(fs.readFileSync(path.join(build, 'assets', 'tone-14.8.49.js'), 'utf8'), tone);

        assert.doesNotThrow(() => verifyBuildOutput(build, { expectedHtmlFiles: 1 }));
    } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }
});

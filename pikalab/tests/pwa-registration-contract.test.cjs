const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('親PWAの登録先を共通化し、main.jsで重複登録しない', () => {
    const html = read('index.html');
    const main = read('js/main.js');

    assert.match(html, /id="pikalab-register-sw"/);
    assert.match(html, /navigator\.serviceWorker\.register\(['"]\.\/sw\.js['"]/);
    assert.doesNotMatch(main, /navigator\.serviceWorker\.register/);
    assert.doesNotMatch(main, /function\s+registerSW\b/);
    assert.doesNotMatch(main, /initPWAUpdatePrompt/);
});


test('ScienceとSpaceの直接入口も同じ親SW・scopeへ登録する', () => {
    for (const directory of ['science_maker', 'space_lab']) {
        const html = read(directory + '/index.html');
        const matches = [...html.matchAll(/navigator\.serviceWorker\.register\(['"]([^'"]+)['"],\s*\{\s*scope:\s*['"]([^'"]+)['"]/g)];
        assert.equal(matches.length, 1);
        const base = new URL(directory + '/', 'https://example.test/pikalab/');
        assert.equal(new URL(matches[0][1], base).pathname, '/pikalab/sw.js');
        assert.equal(new URL(matches[0][2], base).pathname, '/pikalab/');
        assert.match(html, /updateViaCache:\s*['"]none['"]/);
    }
});

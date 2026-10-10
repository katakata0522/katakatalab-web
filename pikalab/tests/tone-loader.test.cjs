const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const loaderPath = path.resolve(__dirname, '..', 'js', 'tone-loader.js');

function createLoaderContext() {
    const appendedScripts = [];
    const window = {};
    const document = {
        createElement(tagName) {
            assert.equal(tagName, 'script');
            return { dataset: {} };
        },
        head: {
            appendChild(script) {
                appendedScripts.push(script);
            }
        }
    };
    const context = vm.createContext({ window, document, Promise, Error, Object });
    return { context, window, appendedScripts };
}

function loadModule() {
    assert.equal(fs.existsSync(loaderPath), true, 'Tone.js遅延ローダーが必要です');
    const fixture = createLoaderContext();
    vm.runInContext(fs.readFileSync(loaderPath, 'utf8'), fixture.context, { filename: loaderPath });
    return fixture;
}

test('Tone.jsは同時に一度だけ読み込む', async () => {
    const { window, appendedScripts } = loadModule();
    const first = window.PikaLabToneLoader.load('../assets/tone-14.8.49.js');
    const second = window.PikaLabToneLoader.load('../assets/tone-14.8.49.js');

    assert.equal(first, second);
    assert.equal(appendedScripts.length, 1);
    assert.equal(appendedScripts[0].src, '../assets/tone-14.8.49.js');
    assert.equal(appendedScripts[0].async, true);

    window.Tone = { version: '14.8.49' };
    appendedScripts[0].onload();
    assert.equal(await first, window.Tone);
});

test('Tone.jsが既にあれば追加通信を行わない', async () => {
    const { window, appendedScripts } = loadModule();
    window.Tone = { version: '14.8.49' };

    assert.equal(await window.PikaLabToneLoader.load('../assets/tone-14.8.49.js'), window.Tone);
    assert.equal(appendedScripts.length, 0);
});

test('Tone.jsの読込失敗後は再試行できる', async () => {
    const { window, appendedScripts } = loadModule();
    const failed = window.PikaLabToneLoader.load('../assets/tone-14.8.49.js');
    appendedScripts[0].onerror();
    await assert.rejects(failed, /Tone\.js/);

    const retry = window.PikaLabToneLoader.load('../assets/tone-14.8.49.js');
    assert.equal(appendedScripts.length, 2);
    window.Tone = { version: '14.8.49' };
    appendedScripts[1].onload();
    assert.equal(await retry, window.Tone);
});

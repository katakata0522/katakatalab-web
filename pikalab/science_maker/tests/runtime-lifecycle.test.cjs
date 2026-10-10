const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = fs.readFileSync(path.join(__dirname, '..', 'script-core.js'), 'utf8');
const loader = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

for (const readyState of ['loading', 'interactive', 'complete']) {
    test(`本体の初期化: DOMが${readyState}でも準備後に一度だけ開始する`, () => {
        const listeners = [];
        let initialized = 0;
        const document = {
            readyState,
            addEventListener(type, fn, options) { listeners.push({ type, fn, options }); },
            getElementById(id) { if (id === 'diagnose-btn') initialized++; return null; },
            querySelectorAll: () => []
        };
        const context = vm.createContext({ document, console: { error() {} } });
        vm.runInContext(core, context);
        if (readyState === 'loading') {
            assert.equal(initialized, 0);
            const listener = listeners.find(item => item.type === 'DOMContentLoaded');
            assert.equal(listener.options.once, true);
            document.readyState = 'interactive';
            listener.fn();
        } else {
            assert.equal(listeners.length, 0);
        }
        assert.equal(initialized, 1);
    });
}

test('動的ローダーはdocumentのイベントAPIを変更せず、本体の後に補助を読み込む', () => {
    const appended = [];
    const addEventListener = () => {};
    const document = {
        currentScript: { src: 'https://example.test/pikalab/science_maker/script.js' },
        addEventListener,
        createElement() {
            const events = new Map();
            return { addEventListener: (type, fn) => events.set(type, fn), events };
        },
        head: { appendChild: script => appended.push(script) }
    };
    vm.runInNewContext(loader, { document, URL, console });
    assert.equal(document.addEventListener, addEventListener);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].src, 'https://example.test/pikalab/science_maker/script-core.js');
    appended[0].events.get('load')();
    assert.equal(appended.length, 2);
    assert.equal(appended[1].src, 'https://example.test/pikalab/science_maker/summer-support.js');
    assert.equal(document.addEventListener, addEventListener);
});

test('テーマ変更による印刷同期の繰り返しで保存リスナーが重複しない', () => {
    const nodes = new Map();
    const document = {
        readyState: 'loading', addEventListener() {},
        getElementById(id) { return nodes.get(id) || null; }
    };
    const inputListeners = [];
    const input = { value: '初期値', addEventListener: (type, fn) => inputListeners.push({ type, fn }) };
    const print = { textContent: '' };
    nodes.set('plan-title', input);
    nodes.set('print-plan-title', print);
    let savesScheduled = 0;
    const context = vm.createContext({ document, setTimeout: () => ++savesScheduled, clearTimeout() {} });
    vm.runInContext(core, context);
    for (let i = 0; i < 10; i++) context.syncPrintElements();
    assert.equal(inputListeners.length, 1);
    input.value = '新しい研究';
    inputListeners[0].fn();
    assert.equal(print.textContent, '新しい研究');
    assert.equal(savesScheduled, 1);
    input.value = '次のテーマ';
    context.syncPrintElements();
    assert.equal(print.textContent, '次のテーマ');
    assert.equal(inputListeners.length, 1);
});

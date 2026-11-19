const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(onLine) {
    const listeners = new Map();
    const notices = [];
    const context = {
        navigator: { onLine },
        window: { addEventListener: (name, listener) => listeners.set(name, listener) },
        document: { addEventListener() {} },
        showToast: (message, type) => notices.push({ message, type })
    };
    const source = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8')
        .replace(/^import[\s\S]*?from ['"][^'"]+['"];\r?\n/gm, '')
        .replace(/export /g, '');
    vm.runInNewContext(source + '\ninitNetworkStatusMonitoring();', context);
    return { notices, dispatch: name => listeners.get(name)() };
}

test('端末の初期接続判定だけで警告や接続成功を通知しない', () => {
    for (const onLine of [false, true]) {
        const runtime = setup(onLine);
        assert.equal(runtime.notices.length, 0);
        runtime.dispatch('online');
        assert.equal(runtime.notices.length, 0);
    }
});

test('閲覧中の切断と再接続は状態が変わったときだけ一度ずつ案内する', () => {
    const runtime = setup(true);
    runtime.dispatch('offline');
    runtime.dispatch('offline');
    assert.deepEqual(runtime.notices.map(notice => notice.type), ['warning']);
    runtime.dispatch('online');
    runtime.dispatch('online');
    assert.deepEqual(runtime.notices.map(notice => notice.type), ['warning', 'info']);
    runtime.dispatch('offline');
    assert.deepEqual(runtime.notices.map(notice => notice.type), ['warning', 'info', 'warning']);
});

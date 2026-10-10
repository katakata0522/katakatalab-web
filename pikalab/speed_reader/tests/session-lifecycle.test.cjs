const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { normalizeHistoryData } = require('../js/app.js');

function createReader() {
    const pending = new Map();
    let nextId = 0;
    let completions = 0;
    const context = vm.createContext({
        Date: { now: () => 1000 },
        setTimeout(callback) { pending.set(++nextId, callback); return nextId; },
        clearTimeout(id) { pending.delete(id); }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8') + '\nglobalThis.Reader = SpeedReaderApp;', context);
    const app = Object.create(context.Reader.prototype);
    app.state = { words: ['one'], index: 0, wpm: 250, totalElapsedTime: 0, startTime: null, timer: null, completionTimer: null };
    app.els = {};
    app.updatePlayButtonUI = app.updateWpmUI = app.renderWord = app.updateProgress = () => {};
    app.showCompletionFeedback = () => { completions += 1; };
    return {
        app, pending, completions: () => completions,
        flush() { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback()); }
    };
}

test('読み終えた直後のリセットは古い完了通知をキャンセルする', () => {
    const runtime = createReader();
    runtime.app.executeStartReader();
    runtime.flush();
    runtime.app.resetReader();
    runtime.flush();
    assert.equal(runtime.completions(), 0);
    assert.equal(runtime.pending.size, 0);
});

test('次の読書の開始後に前の完了通知を表示しない', () => {
    const runtime = createReader();
    runtime.app.executeStartReader();
    runtime.flush();
    runtime.app.state.words = ['next', 'book'];
    runtime.app.startReader();
    runtime.flush();
    assert.equal(runtime.completions(), 0);
});

test('操作がなければ従来の余韻後に完了通知を1回だけ表示する', () => {
    const runtime = createReader();
    runtime.app.executeStartReader();
    runtime.flush();
    assert.equal(runtime.completions(), 0);
    runtime.flush();
    runtime.flush();
    assert.equal(runtime.completions(), 1);
});

test('保存済み日別履歴は数値化して不正値から回復する', () => {
    const original = { '2026-10-01': '2', '2026-10-02': -3, '2026-10-03': 'broken', '2026-10-04': 4 };
    const history = normalizeHistoryData({ dailyHistory: original });
    assert.deepEqual(history.dailyHistory, { '2026-10-01': 2, '2026-10-02': 0, '2026-10-03': 0, '2026-10-04': 4 });
    history.dailyHistory['2026-10-01'] += 1;
    assert.equal(history.dailyHistory['2026-10-01'], 3);
    assert.equal(original['2026-10-01'], '2');
});

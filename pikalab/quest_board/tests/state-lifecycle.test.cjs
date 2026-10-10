const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { debounce, mergeQuestState, applyStampOperation, parseStampIndex, resizeStampState } = require('../script.js');
const source = fs.readFileSync(path.resolve(__dirname, '../script.js'), 'utf8');
const base = () => ({ title: 'もくひょう', count: 5, reward: 'ごほうび', stamps: [true, false, false, false, false] });

function runtime(extra = {}) {
    const timers = new Map(); let serial = 0;
    const sandbox = {
        console: { warn() {}, error() {} }, TextEncoder, TextDecoder, URL, URLSearchParams, btoa, atob,
        setTimeout(fn) { timers.set(++serial, fn); return serial; }, clearTimeout(id) { timers.delete(id); },
        module: { exports: {} }, ...extra
    };
    vm.createContext(sandbox);
    vm.runInContext(source + '\n;globalThis.testAPI = { AudioManager, Storage, elements, questBoardState, setupEventListeners, copyShareLink, saveState, getState, loadState, applyQuestState, syncStoredState };', sandbox);
    return { api: sandbox.testAPI, sandbox, timers };
}
function input(value) {
    return { value, listeners: {}, addEventListener(type, handler) { this.listeners[type] = handler; } };
}

test('保存の3方向合成: 編集した欄だけを優先し、別タブのごほうびとスタンプを保つ', () => {
    const b = base(), local = { ...b, title: '手元の編集' }, remote = { ...b, reward: '別タブの編集', stamps: [true, true, false, false, false] };
    assert.deepEqual(mergeQuestState(b, local, remote), { ...remote, title: local.title });
    assert.deepEqual(b, base());
});

test('保存の3方向合成: 回数と進捗の増減、同じ欄の競合、明示的取り込み', () => {
    const b = base(), local = { ...b, count: 7, stamps: [true, true, false, false, false, true, false] };
    const remote = { ...b, count: 6, title: '別タブ', stamps: [true, false, true, false, false, false] };
    assert.deepEqual(mergeQuestState(b, local, remote), { ...local, title: '別タブ', stamps: [true, true, true, false, false, true, false] });
    assert.deepEqual(mergeQuestState(b, { ...b, title: '手元' }, remote).title, '手元');
    assert.deepEqual(mergeQuestState(b, b, { ...remote, count: 5 }).stamps, [true, false, true, false, false]);
    assert.equal(mergeQuestState(null, local, remote), local);
    assert.equal(mergeQuestState(b, local, null), local);
});

test('保存の3方向合成: 全範囲で長さとboolean型が一致し、入力を書き換えない', () => {
    for (let count = 5; count <= 35; count++) {
        const b = base(), local = { ...b, count, stamps: resizeStampState(b.stamps, count) };
        const remote = { ...b, stamps: [true, false, true, false, true] };
        const snapshot = JSON.stringify([b, local, remote]);
        const next = mergeQuestState(b, local, remote);
        assert.equal(next.count, count);
        assert.equal(next.stamps.length, count);
        assert.ok(next.stamps.every(value => typeof value === 'boolean'));
        assert.equal(JSON.stringify([b, local, remote]), snapshot);
    }
});

test('debounce: 最後の値だけを実行し、flushは1回、cancel後は実行しない', () => {
    const { sandbox, timers } = runtime();
    const calls = []; sandbox.calls = calls;
    vm.runInContext('globalThis.pending = debounce(value => calls.push(value), 100);', sandbox);
    sandbox.pending('古い'); sandbox.pending('新しい');
    assert.equal(timers.size, 1);
    sandbox.pending.flush(); sandbox.pending.flush();
    assert.deepEqual(calls, ['新しい']); assert.equal(timers.size, 0);
    sandbox.pending('取り消し'); sandbox.pending.cancel(); sandbox.pending.flush();
    assert.deepEqual(calls, ['新しい']); assert.equal(timers.size, 0);
});

test('スタンプ番号: 部分的に数値に見える値を受理しない', () => {
    for (const value of ['1x', '1.5', '1e1', ' 2', '', null, true, false, {}, NaN, Infinity]) assert.equal(parseStampIndex(value, 10), null);
    assert.equal(parseStampIndex('10', 10), 10);
});

test('AudioContextの生成・resume失敗でもスタンプ操作を中断しない', () => {
    const blocked = runtime({ window: { AudioContext: function () { throw new Error('denied'); } } });
    assert.doesNotThrow(() => blocked.api.AudioManager.playSparkle());
    assert.doesNotThrow(() => blocked.api.AudioManager.playClick());
    const resumed = runtime({ window: { AudioContext: function () { return { state: 'suspended', resume() { throw new Error('denied'); } }; } }, localStorage: { getItem() { return null; } } });
    assert.doesNotThrow(() => resumed.api.AudioManager.playClick());
});

test('音声設定: 設定削除と不正・無限・範囲外の音量を安全に処理する', () => {
    let stored = JSON.stringify({ isMuted: true, volumeDb: -40 });
    const { api } = runtime({ window: { AudioContext: function () { return { state: 'running' }; } }, localStorage: { getItem() { return stored; } } });
    api.AudioManager.init(); assert.equal(api.AudioManager.isMuted, true);
    stored = null; api.AudioManager.init(); assert.equal(api.AudioManager.isMuted, false); assert.equal(api.AudioManager.volumeRatio, .1);
    stored = JSON.stringify({ volumeDb: 1000 }); api.AudioManager.init(); assert.equal(api.AudioManager.volumeRatio, 1);
    stored = JSON.stringify({ volumeDb: 'Infinity' }); api.AudioManager.init(); assert.equal(api.AudioManager.volumeRatio, .1);
    stored = 'null'; assert.doesNotThrow(() => api.AudioManager.init());
});

test('Clipboard: 現代APIとfallback成功・失敗を区別し、閉じた後はフォーカスしない', async () => {
    let execResult = false, focused = 0;
    const { api } = runtime({ navigator: { clipboard: { writeText: async () => { throw new Error('denied'); } } }, document: { addEventListener() {}, execCommand() { return execResult; } } });
    const field = { isConnected: true, value: 'https://example.test/', focus() { focused++; }, select() {}, setSelectionRange() {} };
    assert.equal(await api.copyShareLink(field.value, field), false);
    execResult = true; assert.equal(await api.copyShareLink(field.value, field), true);
    assert.equal(focused, 2);
    assert.equal(await api.copyShareLink(field.value, field, () => false), false); assert.equal(focused, 2);
});

test('Storage: 閲覧だけでは壊れた値を消さず、失敗を呼出元へ返す', () => {
    let writes = 0;
    const { api } = runtime({ localStorage: { getItem() { return '{broken'; }, setItem() { writes++; throw new Error('quota'); } } });
    assert.equal(api.Storage.read().ok, false); assert.equal(writes, 0);
    assert.equal(api.Storage.save(base()), false); assert.equal(writes, 1);
});

test('IME: 変換途中の入力を切らず、確定時に一度だけ制限と描画を行う', () => {
    const listeners = {}, title = input('あ'.repeat(29) + 'かんじ'), reward = input('ごほうび'), count = input('5');
    const { api, sandbox } = runtime({
        document: { addEventListener() {} }, window: { addEventListener(type, fn) { listeners[type] = fn; } },
    });
    Object.assign(api.elements, { questTitle: title, questReward: reward, questCount: count, countVal: {}, printBtn: input(''), stampGrid: input('') });
    vm.runInContext('globalThis.updates = 0; updateBoard = () => { globalThis.updates++; };', sandbox);
    api.setupEventListeners();
    title.listeners.compositionstart(); title.listeners.input({ isComposing: true });
    assert.equal(title.value, 'あ'.repeat(29) + 'かんじ'); assert.equal(sandbox.updates, 0);
    title.listeners.compositionend();
    assert.equal(title.value, 'あ'.repeat(29) + 'か'); assert.equal(sandbox.updates, 1);
    assert.equal(api.questBoardState.composing.size, 0);
});

test('回数: 中断時に保留した最後の値を反映し、遅延処理を残さない', () => {
    const listeners = {}, count = input('35');
    const { api, sandbox, timers } = runtime({ document: { addEventListener() {} }, window: { addEventListener(type, fn) { listeners[type] = fn; } } });
    Object.assign(api.elements, { questTitle: input('題'), questReward: input('報'), questCount: count, countVal: {}, printBtn: input(''), stampGrid: input('') });
    vm.runInContext('globalThis.updates = 0; updateBoard = () => { globalThis.updates++; };', sandbox);
    api.setupEventListeners(); count.listeners.input(); assert.equal(api.questBoardState.dirtyCount, true);
    listeners.pagehide(); assert.equal(sandbox.updates, 1); assert.equal(api.questBoardState.dirtyCount, false); assert.equal(timers.size, 0);
    listeners.pagehide(); assert.equal(sandbox.updates, 1);
});

test('累積操作: 確認中の他タブ更新にも明示した範囲を適用する', () => {
    const b = { ...base(), stamps: [true, true, false, false, false] };
    const reset = { ...b, stamps: [false, false, false, false, false] };
    const remote = { ...b, count: 7, stamps: new Array(7).fill(true) };
    const next = applyStampOperation(mergeQuestState(b, reset, remote), { index: 1, stamped: false });
    assert.deepEqual(next.stamps, new Array(7).fill(false));
    assert.equal(next.count, 7);
    const advanced = applyStampOperation({ ...b, stamps: new Array(5).fill(false) }, { index: 4, stamped: true });
    assert.deepEqual(advanced.stamps, [true, true, true, true, false]);
});

test('Clipboard: コピー待ちの間に共有内容が変わっても別のリンクをコピーしない', async () => {
    let rejectCopy, calls = 0;
    const { api } = runtime({ navigator: { clipboard: { writeText: () => new Promise((resolve, reject) => { rejectCopy = reject; }) } }, document: { addEventListener() {}, execCommand() { calls++; return true; } } });
    const field = { isConnected: true, value: '進捗なし', focus() {}, select() {}, setSelectionRange() {} };
    const copy = api.copyShareLink(field.value, field);
    field.value = '進捗あり'; rejectCopy(new Error('denied'));
    assert.equal(await copy, false); assert.equal(calls, 0);
});

test('回数からIMEへ移った時: 遅延処理を先に確定し変換中に再実行しない', () => {
    const listeners = {}, title = input('あ'.repeat(29)), count = input('35');
    const { api, sandbox, timers } = runtime({ document: { addEventListener() {} }, window: { addEventListener(type, fn) { listeners[type] = fn; } } });
    Object.assign(api.elements, { questTitle: title, questReward: input('報'), questCount: count, countVal: {}, printBtn: input(''), stampGrid: input('') });
    vm.runInContext('globalThis.updates = 0; updateBoard = () => { globalThis.updates++; };', sandbox);
    api.setupEventListeners(); count.listeners.input(); title.listeners.compositionstart();
    assert.equal(sandbox.updates, 1); assert.equal(timers.size, 0);
    title.value = 'あ'.repeat(29) + 'かんじ'; title.listeners.input({ isComposing: true }); listeners.pagehide();
    assert.equal(title.value, 'あ'.repeat(29) + 'かんじ'); assert.equal(sandbox.updates, 1);
    title.listeners.compositionend(); assert.equal(sandbox.updates, 2); assert.equal(title.value, 'あ'.repeat(29) + 'か');
});

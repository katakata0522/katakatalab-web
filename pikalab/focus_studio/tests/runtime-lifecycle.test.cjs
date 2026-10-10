const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createRuntime(hardened = true) {
    const pending = new Map();
    const events = {};
    let nextId = 0;
    let now = 1000;
    const element = (innerText = '') => ({ innerText, style: {}, classList: { add() {}, remove() {}, replace() {} } });
    const context = vm.createContext({
        console,
        Date: { now: () => now },
        document: { addEventListener(type, callback) { events[type] = callback; }, querySelector: () => null, querySelectorAll: () => [] },
        window: { addEventListener(type, callback) { events[type] = callback; } },
        setInterval(callback) { pending.set(++nextId, callback); return nextId; },
        clearInterval(id) { pending.delete(id); },
        setTimeout(callback) { pending.set(++nextId, callback); return nextId; },
        clearTimeout(id) { pending.delete(id); }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8'), context);
    vm.runInContext('globalThis.runtimeApp = app;', context);
    const app = context.runtimeApp;
    app.dom = { timerLabel: element('しゅうちゅう！'), playIcon: element(), chimeStatus: element(), timerDisplay: element(), progressCircle: element() };
    app.updateDisplay = () => {};
    app.saveState = () => {};
    app.ensureAudio = async () => false;
    if (hardened) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'focus_studio', 'runtime-hardening.js'), 'utf8'), context);
    }
    return { app, context, pending, events, setNow(value) { now = value; } };
}

function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

test('公開ランタイムのチャイム音声待ち中にリセットしたら休憩へ移らない', async () => {
    const { app, pending } = createRuntime();
    const audio = deferred();
    let breaks = 0;
    app.ensureAudio = () => audio.promise;
    app.startBreakMode = () => { breaks += 1; };
    const transition = app.playSchoolChimeAndStartBreak();
    app.resetTimerState(10, 'focus');
    assert.equal(app.__chimeTransitioning, false);
    audio.resolve(false);
    await transition;
    assert.equal(breaks, 0);
    assert.equal(app.timeLeft, 600);
    assert.equal(pending.size, 0);
});

test('チャイム本体の音声待ち中にリセットしたらノードと遷移を再作成しない', async () => {
    const { app, pending } = createRuntime(false);
    const audio = deferred();
    app.ensureAudio = () => audio.promise;
    const transition = app.playSchoolChimeAndStartBreak();
    app.resetTimerState(10, 'focus');
    audio.resolve(false);
    await transition;
    assert.equal(app.isChimePlaying, false);
    assert.equal(pending.size, 0);
});

test('完了処理のマイクロタスク前にリセットしたら完了回数を増やさない', async () => {
    const { app } = createRuntime();
    let transitions = 0;
    app.playSchoolChimeAndStartBreak = () => { transitions += 1; };
    const completing = app.completeTimer();
    app.resetTimerState(10, 'focus');
    await completing;
    assert.equal(app.completedCount, 0);
    assert.equal(transitions, 0);
});

test('キャンセル済みチャイムの完了は新しい音声待ち状態を解除しない', async () => {
    const { app, context } = createRuntime();
    const firstAudio = deferred();
    const nextAudio = deferred();
    app.audioReady = true;
    context.window.Tone = {};
    app.ensureAudio = () => firstAudio.promise;
    const firstTransition = app.playSchoolChimeAndStartBreak();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(app.__chimeTransitioning, true);
    app.resetTimerState(10, 'focus');
    app.audioReady = false;
    context.window.Tone = null;
    app.ensureAudio = () => nextAudio.promise;
    const nextTransition = app.playSchoolChimeAndStartBreak();
    firstAudio.resolve(false);
    await firstTransition;
    assert.equal(app.__chimeTransitioning, true);
    app.resetTimerState(10, 'focus');
    nextAudio.resolve(false);
    await nextTransition;
});

test('公開ランタイムは遅延tickと非表示復帰を同じ終了予定時刻へ同期する', () => {
    const runtime = createRuntime();
    runtime.app.timeLeft = 60;
    runtime.app.toggleTimer();
    runtime.setNow(11000);
    [...runtime.pending.values()][0]();
    assert.equal(runtime.app.timeLeft, 50);
    runtime.context.document.visibilityState = 'hidden';
    runtime.events.visibilitychange();
    runtime.setNow(21000);
    [...runtime.pending.values()][0]();
    runtime.context.document.visibilityState = 'visible';
    runtime.events.visibilitychange();
    assert.equal(runtime.app.timeLeft, 40);
    assert.equal(runtime.pending.size, 1);
});


async function settle() { for (let i = 0; i < 20; i += 1) await Promise.resolve(); }
function installTone(runtime) {
    const nodes = [];
    class Node {
        constructor() { this.volume = { value: 0 }; this.disposed = 0; this.notes = []; nodes.push(this); }
        toDestination() { return this; }
        connect() { return this; }
        triggerAttackRelease(...note) { this.notes.push(note); }
        dispose() { this.disposed += 1; }
    }
    runtime.context.window.Tone = { Synth: Node, Reverb: Node, now: () => 0 };
    runtime.context.Tone = runtime.context.window.Tone;
    runtime.app.ensureAudio = async () => true;
    return nodes;
}

test('250msずつの開始と一時停止を繰り返しても残り時間を切り上げて増やさない', () => {
    const r = createRuntime();
    r.app.resetTimerState(1, 'focus');
    for (let i = 0; i < 16; i += 1) {
        r.app.toggleTimer();
        r.setNow(1000 + (i + 1) * 250);
        r.app.toggleTimer();
    }
    assert.equal(r.app.timeLeft, 56);
    assert.equal(r.app.__timerRemainingMs, 56000);
    assert.equal(r.app.isRunning, false);
    assert.equal(r.pending.size, 0);
});

test('一時停止中の経過は消費せず残りの端数だけを再開する', () => {
    const r = createRuntime();
    r.app.resetTimerState(1, 'focus');
    r.app.toggleTimer();
    r.setNow(1250); r.app.toggleTimer();
    assert.equal(r.app.__timerRemainingMs, 59750);
    r.setNow(60000); r.app.toggleTimer();
    assert.equal(r.app.__timerDeadlineMs, 119750);
    r.setNow(60750); r.app.toggleTimer();
    assert.equal(r.app.timeLeft, 59);
});

test('開始と停止の直後に画面とページタイトルの更新を呼ぶ', () => {
    const r = createRuntime();
    const states = [];
    r.app.updateDisplay = () => states.push(r.app.isRunning);
    r.app.toggleTimer(); r.app.toggleTimer();
    assert.deepEqual(states, [true, false]);
});

test('完了処理が保留中でも連打で次のタイマーを開始しない', async () => {
    const r = createRuntime();
    const count = deferred();
    r.app.incrementCompletedCount = () => count.promise;
    const completing = r.app.completeTimer();
    await Promise.resolve();
    r.app.toggleTimer();
    assert.equal(r.app.isRunning, false);
    r.app.resetTimerState(10, 'focus');
    count.resolve(); await completing;
    assert.equal(r.app.timeLeft, 600);
    assert.equal(r.app.__chimeTransitioning, false);
});

test('新しい完了処理を古いfinallyが解除しない', async () => {
    const r = createRuntime();
    const firstCount = deferred(), secondCount = deferred();
    let calls = 0;
    r.app.incrementCompletedCount = () => (++calls === 1 ? firstCount.promise : secondCount.promise);
    const first = r.app.completeTimer(); await Promise.resolve();
    r.app.resetTimerState(10, 'focus');
    const second = r.app.completeTimer(); await Promise.resolve();
    firstCount.resolve(); await first;
    assert.equal(r.app.__timerCompletionPromise, second);
    r.app.resetTimerState(10, 'focus');
    secondCount.resolve(); await second;
});

test('チャイム中の逐次完了呼び出しも回数を重複させない', async () => {
    const r = createRuntime(); installTone(r);
    await r.app.completeTimer(); await settle();
    assert.equal(r.app.isChimePlaying, true);
    await r.app.completeTimer();
    assert.equal(r.app.completedCount, 1);
});

test('初期化済み音声でも再開待ちが停止したら期限内に休憩へ進む', async () => {
    const r = createRuntime(); installTone(r);
    r.app.audioReady = true;
    r.app.ensureAudio = () => new Promise(() => {});
    const chime = r.app.playSchoolChimeAndStartBreak();
    assert.equal(r.pending.size, 1, '初期化済みでも音声待ちの上限タイマーを作る');
    [...r.pending.values()][0](); await chime;
    assert.equal(r.app.__timerMode, 'break');
    assert.equal(r.app.isRunning, true);
    assert.equal(r.app.isChimePlaying, false);
});

test('長いスリープ後は終了済みチャイムを鳴らさず予定時刻から休憩を計算する', async () => {
    const r = createRuntime(); const nodes = installTone(r);
    r.app.resetTimerState(1, 'focus'); r.app.toggleTimer();
    r.setNow(91000); [...r.pending.values()][0](); await settle();
    assert.equal(r.app.completedCount, 1);
    assert.equal(r.app.__timerMode, 'break');
    assert.equal(r.app.timeLeft, 284);
    assert.equal(r.app.__timerDeadlineMs, 375000);
    assert.equal(nodes.length, 0, '既に終了したチャイムを再生しない');
});

test('集中と休憩の両方をまたぐスリープ後は集中の待機状態に戻る', async () => {
    const r = createRuntime(); const nodes = installTone(r);
    r.app.resetTimerState(1, 'focus'); r.app.toggleTimer();
    r.setNow(600000); [...r.pending.values()][0](); await settle();
    assert.equal(r.app.completedCount, 1);
    assert.equal(r.app.__timerMode, 'focus');
    assert.equal(r.app.isRunning, false);
    assert.equal(r.app.timeLeft, 1500);
    assert.equal(nodes.length, 0);
    assert.equal(r.pending.size, 0);
});

test('チャイムの予定終了を過ぎたpageshowで休憩の残り時間を補正する', async () => {
    const r = createRuntime(); installTone(r);
    r.app.saveTaskImmediately = () => {};
    r.app.suspendAudioForPage = () => {};
    r.app.resumeAudioForPage = () => {};
    await r.app.playSchoolChimeAndStartBreak();
    r.events.pagehide();
    r.setNow(20000); r.events.pageshow({ persisted: true });
    assert.equal(r.app.__timerMode, 'break');
    assert.equal(r.app.timeLeft, 295);
    assert.equal(r.app.isRunning, true);
});

test('非表示からの復帰を何度通知しても休憩と回数を重複させない', async () => {
    const r = createRuntime(); installTone(r);
    r.app.saveTaskImmediately = () => {};
    r.app.resetTimerState(1, 'focus'); r.app.toggleTimer();
    r.setNow(91000);
    r.context.document.visibilityState = 'visible';
    r.events.visibilitychange(); r.events.visibilitychange();
    await settle(); r.events.visibilitychange();
    assert.equal(r.app.completedCount, 1);
    assert.equal(r.app.timeLeft, 284);
});

test('休憩終了音待ちの途中にリセットしたら遅れて音を出さない', async () => {
    const r = createRuntime(); const nodes = installTone(r);
    const audio = deferred(); r.app.ensureAudio = () => audio.promise;
    r.app.__timerMode = 'break';
    const completing = r.app.completeTimer(); await settle();
    r.app.resetTimerState(10, 'focus');
    audio.resolve(true); await completing;
    assert.equal(nodes.length, 0);
    assert.equal(r.app.timeLeft, 600);
});

test('時計が後退したチャイム終了コールバックは残りの待機を再予約する', async () => {
    const r = createRuntime(); installTone(r);
    await r.app.playSchoolChimeAndStartBreak();
    const callback = [...r.pending.values()][0]; r.pending.clear();
    r.setNow(-1000); callback();
    assert.equal(r.app.isChimePlaying, true);
    assert.equal(r.pending.size, 1);
    r.setNow(15000); [...r.pending.values()][0]();
    assert.equal(r.app.__timerMode, 'break');
    assert.equal(r.app.isChimePlaying, false);
});

test('チャイム接続で例外が起きても作成済みノードを解放して休憩へ進む', async () => {
    const r = createRuntime(); let disposed = 0;
    r.context.window.Tone = { Synth: class {
        constructor() { this.volume = {}; }
        toDestination() { throw new Error('connection rejected'); }
        dispose() { disposed++; }
    }, now: () => 0 };
    r.context.console = { ...console, error() {} };
    r.app.ensureAudio = async () => true;
    await r.app.playSchoolChimeAndStartBreak();
    assert.equal(disposed, 1);
    assert.equal(r.app.chimeSynth, null);
    r.setNow(15000); [...r.pending.values()][0]();
    assert.equal(r.app.__timerMode, 'break');
});
